import yauzl from 'yauzl';
import { XMLParser } from 'fast-xml-parser';

/**
 * PDF structural threat scan (Domain 04 §31). Rather than a heavy PDF AST
 * library, this greps the raw PDF token/object stream for the dictionary
 * keys that indicate active content or embedded payloads — a legitimate,
 * widely used technique for a structural threat flag (it does not attempt
 * to *execute* or fully parse the PDF object graph).
 */
const PDF_DANGEROUS_TOKENS = [
  { key: '/JavaScript', label: 'Embedded JavaScript' },
  { key: '/JS', label: 'Embedded JavaScript (short form)' },
  { key: '/Launch', label: 'Launch action (can invoke external programs)' },
  { key: '/OpenAction', label: 'Auto-run action on open' },
  { key: '/EmbeddedFile', label: 'Embedded file attachment' },
  { key: '/AA', label: 'Additional actions (auto-run on events)' },
];

export function scanPdfBuffer(buffer) {
  const text = buffer.toString('latin1'); // preserves byte-for-byte token positions
  const flags = [];
  let encrypted = false;

  for (const token of PDF_DANGEROUS_TOKENS) {
    if (text.includes(token.key)) flags.push(token.label);
  }
  if (text.includes('/Encrypt')) {
    encrypted = true;
    flags.push('Document is encrypted');
  }

  return {
    isPdf: true,
    suspicious: flags.length > 0,
    encrypted,
    flags,
  };
}

// Zip-bomb guards enforced BEFORE any entry content is read (Domain 04 §24).
const ZIP_MAX_ENTRIES = 2000;
const ZIP_MAX_NESTED_DEPTH = 12;
const ZIP_MAX_TOTAL_UNCOMPRESSED_BYTES = 500 * 1024 * 1024; // 500MB
const ZIP_MAX_SINGLE_ENTRY_UNCOMPRESSED_BYTES = 200 * 1024 * 1024; // 200MB
const ZIP_MAX_COMPRESSION_RATIO = 200; // uncompressed/compressed above this is a bomb signature

const MACRO_ENTRY_NAMES = new Set(['word/vbaProject.bin', 'xl/vbaProject.bin', 'ppt/vbaProject.bin', 'vbaProject.bin']);
const RELATIONSHIP_ENTRY_PATTERN = /_rels\/.*\.rels$/i;

function pathDepth(entryName) {
  return entryName.split('/').filter(Boolean).length;
}

function openZip(buffer) {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true }, (err, zipfile) => {
      if (err) return reject(err);
      resolve(zipfile);
    });
  });
}

function readEntryContent(zipfile, entry, maxBytes) {
  return new Promise((resolve, reject) => {
    zipfile.openReadStream(entry, (err, stream) => {
      if (err) return reject(err);
      const chunks = [];
      let total = 0;
      stream.on('data', (chunk) => {
        total += chunk.length;
        if (total > maxBytes) {
          stream.destroy();
          reject(new Error('Entry exceeded read cap while inspecting relationship XML'));
          return;
        }
        chunks.push(chunk);
      });
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  });
}

/**
 * OOXML (DOCX/XLSX) structural scan. Walks the zip *central directory
 * metadata only* first (entry count / nesting / declared sizes) and rejects
 * before reading any entry content if caps are exceeded. Only then does it
 * open specific entries (macro project, relationship XML) it needs to
 * inspect, each individually capped.
 */
export async function scanOoxmlBuffer(buffer) {
  const zipfile = await openZip(buffer);

  const entries = [];
  let totalUncompressed = 0;
  let rejected = null;

  await new Promise((resolve, reject) => {
    zipfile.on('entry', (entry) => {
      entries.push(entry);
      totalUncompressed += entry.uncompressedSize || 0;

      if (entries.length > ZIP_MAX_ENTRIES) {
        rejected = `Archive contains more than ${ZIP_MAX_ENTRIES} entries`;
      } else if (pathDepth(entry.fileName) > ZIP_MAX_NESTED_DEPTH) {
        rejected = `Archive entry path exceeds max nesting depth (${entry.fileName})`;
      } else if (entry.uncompressedSize > ZIP_MAX_SINGLE_ENTRY_UNCOMPRESSED_BYTES) {
        rejected = `Archive entry ${entry.fileName} exceeds max single-entry uncompressed size`;
      } else if (totalUncompressed > ZIP_MAX_TOTAL_UNCOMPRESSED_BYTES) {
        rejected = 'Archive total uncompressed size exceeds cap (possible zip bomb)';
      } else if (
        entry.compressedSize > 0 &&
        entry.uncompressedSize / entry.compressedSize > ZIP_MAX_COMPRESSION_RATIO
      ) {
        rejected = `Archive entry ${entry.fileName} has a suspicious compression ratio (possible zip bomb)`;
      }

      if (rejected) {
        zipfile.close();
        resolve();
        return;
      }
      zipfile.readEntry();
    });
    zipfile.on('end', resolve);
    zipfile.on('error', reject);
    zipfile.readEntry();
  });

  if (rejected) {
    return { isOoxml: true, rejected, suspicious: true, flags: [rejected], hasMacros: false, externalRelationships: [] };
  }

  const flags = [];
  let hasMacros = false;
  const externalRelationships = [];

  const macroEntry = entries.find((e) => MACRO_ENTRY_NAMES.has(e.fileName.toLowerCase()));
  if (macroEntry) {
    hasMacros = true;
    flags.push(`Macro project present (${macroEntry.fileName})`);
  }

  const relationshipEntries = entries.filter((e) => RELATIONSHIP_ENTRY_PATTERN.test(e.fileName));

  if (relationshipEntries.length) {
    const zipfile2 = await openZip(buffer);
    const byName = new Map();
    await new Promise((resolve, reject) => {
      zipfile2.on('entry', (entry) => {
        if (RELATIONSHIP_ENTRY_PATTERN.test(entry.fileName)) {
          readEntryContent(zipfile2, entry, 2 * 1024 * 1024)
            .then((content) => {
              byName.set(entry.fileName, content);
              zipfile2.readEntry();
            })
            .catch(() => zipfile2.readEntry());
        } else {
          zipfile2.readEntry();
        }
      });
      zipfile2.on('end', resolve);
      zipfile2.on('error', reject);
      zipfile2.readEntry();
    });

    // DTD/external-entity processing is disabled by default in fast-xml-parser
    // (it has no DOCTYPE/entity expansion at all) — safe against XXE.
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    for (const [fileName, content] of byName.entries()) {
      let parsed;
      try {
        parsed = parser.parse(content.toString('utf-8'));
      } catch {
        continue;
      }
      const relationships = parsed?.Relationships?.Relationship;
      const list = Array.isArray(relationships) ? relationships : relationships ? [relationships] : [];
      for (const rel of list) {
        const target = rel?.['@_Target'];
        const targetMode = rel?.['@_TargetMode'];
        if (targetMode === 'External' && typeof target === 'string' && /^https?:\/\//i.test(target)) {
          externalRelationships.push({ file: fileName, target });
        }
      }
    }
  }

  if (externalRelationships.length) {
    flags.push(`External/remote relationship targets present (${externalRelationships.length})`);
  }

  return {
    isOoxml: true,
    rejected: null,
    suspicious: hasMacros || externalRelationships.length > 0,
    flags,
    hasMacros,
    externalRelationships,
    entryCount: entries.length,
  };
}

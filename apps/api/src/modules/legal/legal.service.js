import { db } from '../../db/connection.js';

export async function listDocuments() {
  const rows = await db('legal_documents')
    .join('legal_document_versions', 'legal_document_versions.id', 'legal_documents.current_version_id')
    .select(
      'legal_documents.document_type',
      'legal_documents.slug',
      'legal_documents.title',
      'legal_documents.summary',
      'legal_document_versions.version',
      'legal_document_versions.effective_at',
      'legal_document_versions.published_at'
    )
    .orderBy('legal_documents.title', 'asc');
  return rows;
}

export async function getDocumentBySlug(slug) {
  const doc = await db('legal_documents').where({ slug }).first();
  if (!doc) return null;
  const version = await db('legal_document_versions').where({ id: doc.current_version_id }).first();
  const history = await db('legal_document_versions')
    .where({ document_id: doc.id })
    .orderBy('version', 'desc')
    .select('version', 'effective_at', 'published_at', 'superseded_at');

  return {
    documentType: doc.document_type,
    slug: doc.slug,
    title: doc.title,
    summary: doc.summary,
    body: version?.body,
    version: version?.version,
    effectiveAt: version?.effective_at,
    publishedAt: version?.published_at,
    history,
  };
}

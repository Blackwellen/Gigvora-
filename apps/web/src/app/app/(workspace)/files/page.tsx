'use client';

import { Suspense, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Download, File as FileIcon, Loader2, Trash2, Upload } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProjectShell } from '@/components/projects/ProjectShell';
import { useProjectFiles, useUploadProjectFile, useProjectFileDownloadUrl, useDeleteProjectFile } from '@/hooks/projects/useProjectFiles';
import { getApiErrorMessage } from '@/lib/api';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FilesInner() {
  const projectId = useSearchParams().get('projectId') || undefined;
  const { data: files, isLoading, isError, error } = useProjectFiles(projectId);
  const upload = useUploadProjectFile(projectId);
  const getDownloadUrl = useProjectFileDownloadUrl();
  const deleteFile = useDeleteProjectFile(projectId);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      await upload.mutateAsync(file);
    } catch (err) {
      setUploadError(getApiErrorMessage(err, 'Upload failed the security scan or file-type check.'));
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleDownload(fileId: string) {
    const result = await getDownloadUrl.mutateAsync({ projectId: projectId!, fileId });
    window.open(result.url, '_blank', 'noopener,noreferrer');
  }

  return (
    <ProjectShell
      projectId={projectId}
      activeTab="files"
      tabCounts={{ files: files?.length }}
      actions={
        <>
          <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
          <Button size="sm" onClick={() => inputRef.current?.click()} loading={upload.isPending}>
            <Upload className="h-4 w-4" /> Upload file
          </Button>
        </>
      }
    >
      {uploadError && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">{uploadError}</div>
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {isError && (
        <Card className="py-14 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">Couldn&rsquo;t load files</p>
          <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">{getApiErrorMessage(error)}</p>
        </Card>
      )}

      {!isLoading && !isError && files && files.length === 0 && (
        <Card className="py-14 text-center">
          <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">No files yet</p>
          <p className="mt-1 text-sm text-ink-400 dark:text-ink-500">Uploads go through malware scanning and signature verification before they're available here.</p>
        </Card>
      )}

      {!isLoading && !isError && files && files.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800 dark:text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-medium">File</th>
                  <th className="px-4 py-3 font-medium">Size</th>
                  <th className="px-4 py-3 font-medium">Uploaded</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50 dark:border-ink-800/60 dark:hover:bg-ink-800/60">
                    <td className="flex items-center gap-2 px-4 py-3 font-medium text-ink-900 dark:text-white">
                      <FileIcon className="h-4 w-4 text-ink-400" /> {f.filename}
                    </td>
                    <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{formatBytes(f.sizeBytes)}</td>
                    <td className="px-4 py-3 text-ink-600 dark:text-ink-300">{format(new Date(f.createdAt), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => handleDownload(f.id)} aria-label={`Download ${f.filename}`} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-brand-600 dark:hover:bg-ink-800">
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteFile.mutate(f.id)}
                          aria-label={`Delete ${f.filename}`}
                          className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </ProjectShell>
  );
}

export default function FilesPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-300" /></div>}>
      <FilesInner />
    </Suspense>
  );
}

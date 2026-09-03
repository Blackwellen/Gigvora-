'use client';

import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '@/lib/api';
import type { UploadUrlResponse } from './types';

export type FileUploadProgressPhase = 'requesting' | 'uploading' | 'finalizing' | 'done' | 'error';

export type FileUploadCallbacks = {
  onProgress?: (phase: FileUploadProgressPhase, percent: number) => void;
};

/**
 * Real 3-step upload flow against the imports API:
 *  1. POST /imports/:id/files/upload-url -> a short-lived signed PUT URL
 *  2. PUT the raw file bytes directly to that URL (object storage, not our API — a bare axios
 *     instance is used here on purpose so the interceptor-added Authorization/X-Workspace-Id
 *     headers from lib/api.ts are never sent to the storage provider)
 *  3. POST /imports/:id/files/:fileId/complete-upload -> enqueues the scan pipeline server-side
 *
 * After this resolves, the caller polls useImportStatus(importId) to watch the file progress
 * through scanning -> sanitizing -> parsing, exactly per the server-reported enum.
 */
export function useFileUpload(importId: string) {
  const queryClient = useQueryClient();

  async function uploadFile(file: File, callbacks?: FileUploadCallbacks): Promise<{ importFileId: string }> {
    callbacks?.onProgress?.('requesting', 0);
    let uploadInfo: UploadUrlResponse;
    try {
      const { data } = await api.post<{ data: UploadUrlResponse }>(`/imports/${importId}/files/upload-url`, {
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      });
      uploadInfo = data.data;
    } catch (err) {
      callbacks?.onProgress?.('error', 0);
      throw new Error(getApiErrorMessage(err, 'Could not start the upload.'));
    }

    try {
      await axios.put(uploadInfo.uploadUrl, file, {
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        onUploadProgress: (evt) => {
          const percent = evt.total ? Math.round((evt.loaded / evt.total) * 100) : 0;
          callbacks?.onProgress?.('uploading', percent);
        },
      });
    } catch (err) {
      callbacks?.onProgress?.('error', 0);
      throw new Error(getApiErrorMessage(err, 'The file failed to upload to storage.'));
    }

    callbacks?.onProgress?.('finalizing', 100);
    try {
      await api.post(`/imports/${importId}/files/${uploadInfo.importFileId}/complete-upload`);
    } catch (err) {
      callbacks?.onProgress?.('error', 100);
      throw new Error(getApiErrorMessage(err, 'The upload could not be finalized.'));
    }

    callbacks?.onProgress?.('done', 100);
    queryClient.invalidateQueries({ queryKey: ['import-status', importId] });
    queryClient.invalidateQueries({ queryKey: ['import', importId] });
    return { importFileId: uploadInfo.importFileId };
  }

  return { uploadFile };
}

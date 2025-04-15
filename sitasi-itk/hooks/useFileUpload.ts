// hooks/useFileUpload.ts
'use client';

import { useState, useCallback } from 'react';
import { FileMetadata } from '@/types/sempro';
import { useToast } from './use-toast';
import { useAuth } from '@/contexts/AuthContext';

// GAS endpoint URL - ganti dengan URL deployment script Anda
const GAS_API_URL = process.env.NEXT_PUBLIC_GAS_API_URL || 'https://script.google.com/macros/s/DEPLOY_ID_ANDA/exec';

interface UploadResult {
  status: string;
  fileId: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  message?: string;
}

interface UploadOptions {
  folderId?: string;
  folderName?: string;
  studentId?: string;
  studentName?: string;
  description?: string;
  onProgress?: (progress: number) => void;
}

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const { toast } = useToast();
  const { user } = useAuth();

  const uploadFile = useCallback(
    async (file: File, options?: UploadOptions): Promise<FileMetadata | null> => {
      if (!file) {
        toast({
          variant: "destructive",
          title: "Error Upload",
          description: "File tidak ditemukan",
        });
        return null;
      }

      setIsUploading(true);
      setUploadProgress(0);

      try {
        // Create FormData for the file upload
        const formData = new FormData();
        formData.append('file', file);
        
        // Add folder ID if specified
        if (options?.folderId) {
          formData.append('folderId', options.folderId);
        }
        
        // Add folder name if specified
        if (options?.folderName) {
          formData.append('folderName', options.folderName);
        }
        
        // Add student info if available
        if (user) {
          const { data: mahasiswaData } = await supabase
            .from('mahasiswas')
            .select('nama, nim')
            .eq('user_id', user.id)
            .single();
            
          if (mahasiswaData) {
            formData.append('studentId', mahasiswaData.nim);
            formData.append('studentName', mahasiswaData.nama);
          }
        }
        
        // Add description if specified
        if (options?.description) {
          formData.append('description', options.description);
        }

        // For simulating upload progress
        const startTime = Date.now();
        const simulateProgress = () => {
          const elapsed = Date.now() - startTime;
          // Simulate progress up to 90% (last 10% after server responds)
          const progress = Math.min(90, Math.floor((elapsed / 3000) * 100));
          setUploadProgress(progress);
          options?.onProgress?.(progress);
          
          if (progress < 90 && isUploading) {
            setTimeout(simulateProgress, 200);
          }
        };
        simulateProgress();

        // Send request to GAS API
        const response = await fetch(GAS_API_URL, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload gagal: ${response.statusText}`);
        }

        const result: UploadResult = await response.json();
        
        if (result.status === 'error') {
          throw new Error(result.message || 'Terjadi kesalahan saat upload file');
        }
        
        // Update progress to 100%
        setUploadProgress(100);
        options?.onProgress?.(100);

        // Create file metadata object
        const fileMetadata: FileMetadata = {
          fileId: result.fileId,
          fileUrl: result.fileUrl,
          fileName: result.fileName || file.name,
          fileType: result.fileType || file.type,
          uploadedAt: new Date().toISOString(),
        };

        toast({
          title: "Upload Berhasil",
          description: `File ${file.name} berhasil diupload`,
        });

        return fileMetadata;
      } catch (error) {
        console.error('Error uploading file:', error);
        toast({
          variant: "destructive",
          title: "Upload Gagal",
          description: error instanceof Error ? error.message : "Terjadi kesalahan saat mengupload file",
        });
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [toast, user]
  );

  const deleteFile = useCallback(
    async (fileId: string): Promise<boolean> => {
      if (!fileId) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "File ID tidak valid",
        });
        return false;
      }

      try {
        // Create form data for the delete request
        const formData = new FormData();
        formData.append('action', 'delete');
        formData.append('fileId', fileId);

        // Send delete request to GAS API
        const response = await fetch(GAS_API_URL, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Delete failed: ${response.statusText}`);
        }

        const result: UploadResult = await response.json();
        
        if (result.status === 'error') {
          throw new Error(result.message || 'Gagal menghapus file');
        }

        toast({
          title: "File Dihapus",
          description: "File berhasil dihapus dari Google Drive",
        });

        return true;
      } catch (error) {
        console.error('Error deleting file:', error);
        toast({
          variant: "destructive",
          title: "Gagal Menghapus File",
          description: error instanceof Error ? error.message : "Terjadi kesalahan saat menghapus file",
        });
        return false;
      }
    },
    [toast]
  );

  return {
    uploadFile,
    deleteFile,
    isUploading,
    uploadProgress,
  };
}
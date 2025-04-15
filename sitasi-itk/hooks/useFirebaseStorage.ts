// hooks/useFirebaseStorage.ts - Perbaikan
'use client';

import { useState, useCallback } from 'react';
import { FileMetadata } from '@/types/sempro';
import { useToast } from './use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface UploadOptions {
  folderId?: string;
  folderName?: string;
  studentId?: string;
  studentName?: string;
  description?: string;
  onProgress?: (progress: number) => void;
}

export function useFirebaseStorage() {
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
        console.log("Starting upload for:", file.name, "Size:", file.size);
        
        // Buat formdata untuk request
        const formData = new FormData();
        formData.append('file', file);
        
        // Buat path file yang terstruktur
        const timestamp = new Date().getTime();
        const fileExtension = file.name.split('.').pop();
        const fileType = options?.description?.toLowerCase().replace(/\s+/g, '_') || 'document';
        const studentId = options?.studentId || 'unknown';
        
        // Format sederhana untuk path file
        const path = `sempro/${timestamp}_${file.name}`;
        formData.append('path', path);
        
        // Simulasikan progress untuk UX
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += 5;
          if (progress <= 90) {
            setUploadProgress(progress);
            options?.onProgress?.(progress);
          }
        }, 300);
        
        console.log("Sending file to API route");
        // Upload melalui API route
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        
        clearInterval(progressInterval);
        
        console.log("API response status:", response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Upload error response:", errorData);
          throw new Error(errorData.message || errorData.error || 'Upload failed');
        }
        
        setUploadProgress(100);
        options?.onProgress?.(100);
        
        const result = await response.json();
        console.log("Upload successful, result:", result);
        
        toast({
          title: "Upload Berhasil",
          description: `File ${file.name} berhasil diupload`,
        });
        
        return result;
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
        // Hapus file melalui API route
        const response = await fetch('/api/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ path: fileId }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete file');
        }
        
        toast({
          title: "File Dihapus",
          description: "File berhasil dihapus",
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
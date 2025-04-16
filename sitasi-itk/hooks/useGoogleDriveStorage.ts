// hooks/useGoogleDriveStorage.ts
'use client';

import { useState, useCallback } from 'react';
import { FileMetadata } from '@/types/sempro';
import { useToast } from './use-toast';

// Ganti URL ini dengan URL deployment Google Apps Script Anda
const GAS_ENDPOINT = process.env.NEXT_PUBLIC_GAS_ENDPOINT || '';

interface UploadOptions {
  description?: string;
  studentId?: string;
  studentName?: string;
  onProgress?: (progress: number) => void;
}

export function useGoogleDriveStorage() {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const { toast } = useToast();

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
        console.log("Memulai upload file:", file.name, "Ukuran:", file.size);
        
        // Buat FormData
        const formData = new FormData();
        formData.append('file', file);
        
        // Tambahkan metadata tambahan jika ada
        if (options?.studentId) formData.append('studentId', options.studentId);
        if (options?.studentName) formData.append('studentName', options.studentName);
        if (options?.description) formData.append('description', options.description);

        // Simulasi progress (karena GAS tidak mendukung progress realtime)
        let progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            const newProgress = Math.min(prev + 5, 90);
            options?.onProgress?.(newProgress);
            return newProgress;
          });
        }, 300);

        // Kirim request ke Google Apps Script
        const response = await fetch(GAS_ENDPOINT, {
          method: 'POST',
          body: formData,
          mode: 'cors',
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          throw new Error(`Upload gagal: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Upload gagal');
        }

        // Set progress 100%
        setUploadProgress(100);
        options?.onProgress?.(100);

        toast({
          title: "Upload Berhasil",
          description: `File ${file.name} berhasil diupload`,
        });

        // Buat metadata lengkap
        const metadata: FileMetadata = {
          fileId: result.fileId,
          fileUrl: result.fileUrl,
          fileName: file.name,
          fileType: file.type,
          uploadedAt: result.uploadedAt || new Date().toISOString()
        };

        return metadata;
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
    [toast]
  );

  const deleteFile = useCallback(
    async (fileId: string): Promise<boolean> => {
      // Kita tidak implementasikan delete untuk versi sederhana ini
      toast({
        title: "Info",
        description: "Penghapusan file dari Google Drive tidak diimplementasikan dalam versi ini.",
      });
      return false;
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
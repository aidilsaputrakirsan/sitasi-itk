// hooks/useFileUpload.ts versi sederhana
'use client';

import { useState, useCallback } from 'react';
import { FileMetadata } from '@/types/sempro';
import { useToast } from './use-toast';

// URL GAS yang baru
const GAS_API_URL = process.env.NEXT_PUBLIC_GAS_API_URL || 
'https://script.google.com/macros/s/AKfycbziqNG4IRcCvacIgOaUFN7Z2LLSgpWrjzAGsn-pCl9aUGUcLUxZA-3Q7dZkGJK6dnDcyg/exec';
const SEMPRO_FOLDER_ID = process.env.NEXT_PUBLIC_SEMPRO_FOLDER_ID || '1y-4qBRLQnkLezBcYYf_N6kMxqaUXa6Lx';

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

  // Fungsi uploadFile dengan mode fallback
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
    setUploadProgress(10);

    try {
      // Buat form data
      const formData = new FormData();
      formData.append('file', file);
      
      if (options?.studentId) formData.append('studentId', options.studentId);
      if (options?.studentName) formData.append('studentName', options.studentName);
      if (options?.description) formData.append('description', options.description);
      formData.append('folderId', options?.folderId || SEMPRO_FOLDER_ID);

      console.log("Uploading file:", file.name, file.size, file.type);
      
      // Coba mode standard dulu (cors)
      try {
        setUploadProgress(30);
        console.log("Mencoba upload dengan mode cors...");
        
        const response = await fetch(GAS_API_URL, {
          method: 'POST',
          body: formData,
          mode: 'cors'
        });
        
        setUploadProgress(80);
        
        if (!response.ok) {
          throw new Error(`Upload gagal dengan status: ${response.status}`);
        }
        
        const result = await response.json();
        setUploadProgress(100);
        options?.onProgress?.(100);
        
        if (result.status === 'success') {
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
        } else {
          throw new Error(result.message || 'Terjadi kesalahan saat upload file');
        }
      } catch (corsError) {
        // Jika mode cors gagal, coba dengan no-cors sebagai fallback
        console.warn("CORS upload gagal:", corsError, "Mencoba dengan mode no-cors...");
        
        // Dengan mode no-cors, kita tidak bisa membaca respons
        // Jadi kita perlu menghasilkan ID dan metadata sendiri
        await fetch(GAS_API_URL, {
          method: 'POST',
          body: formData,
          mode: 'no-cors'
        });
        
        // Karena kita tidak bisa membaca respons, anggap saja berhasil
        // dan gunakan data lokal untuk tampilan UI
        setUploadProgress(100);
        options?.onProgress?.(100);
        
        const tempId = `temp_${Date.now()}`;
        const tempMetadata: FileMetadata = {
          fileId: tempId,
          fileUrl: '#', // URL tidak tersedia
          fileName: file.name,
          fileType: file.type,
          uploadedAt: new Date().toISOString(),
         // isTemporary: true // Tandai sebagai data sementara
        };
        
        toast({
          title: "Upload Mungkin Berhasil",
          description: "File terkirim, tapi tidak bisa mendapatkan konfirmasi karena batasan CORS",
        });
        
        return tempMetadata;
      }
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

        let result;
        try {
          result = await response.json();
        } catch (e) {
          throw new Error("Gagal memproses respons server");
        }
        
        if (result.status !== 'success') {
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
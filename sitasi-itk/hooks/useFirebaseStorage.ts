// hooks/useFirebaseStorage.ts - Perbaikan duplikasi dan tracking status file
'use client';

import { useState, useCallback, useRef } from 'react';
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
  
  // Gunakan useRef untuk melacak upload yang sedang berjalan dan mencegah duplikasi
  const ongoingUploadsRef = useRef<Map<string, boolean>>(new Map());

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

      // Buat fileId unik berdasarkan nama file dan ukuran untuk mencegah upload ulang file yang sama
      const fileId = `${file.name}-${file.size}`;
      
      // Cek apakah file ini sedang dalam proses upload
      if (ongoingUploadsRef.current.get(fileId)) {
        console.log(`Upload untuk ${file.name} sedang berlangsung, tidak akan mengupload ulang`);
        toast({
          variant: "destructive",
          title: "Upload Sedang Berlangsung",
          description: `File ${file.name} sedang diupload, harap tunggu`,
        });
        return null;
      }
      
      // Tandai bahwa file ini sedang diupload
      ongoingUploadsRef.current.set(fileId, true);
      
      // Logging tambahan untuk debugging
      console.log(`==== Memulai upload untuk ${file.name} (${fileId}) ====`);

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
        
        console.log("Sending file to API route:", path);
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
        
        // Buat metadata yang lengkap dengan filename
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
        // Hapus tanda bahwa file ini sedang diupload
        ongoingUploadsRef.current.delete(fileId);
        setIsUploading(false);
        console.log(`==== Upload untuk ${file.name} selesai ====`);
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
// hooks/useGoogleDriveStorage.ts
'use client';

import { useState, useCallback } from 'react';
import { FileMetadata } from '@/types/sempro';
import { useToast } from './use-toast';

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
        
        // Ambil GAS endpoint dari env variable
        const gasEndpoint = process.env.NEXT_PUBLIC_GAS_ENDPOINT;
        
        if (!gasEndpoint) {
          throw new Error("GAS endpoint tidak dikonfigurasi");
        }
        
        console.log("Menggunakan GAS endpoint:", gasEndpoint);
        
        // Baca file sebagai base64
        const fileBase64 = await readFileAsBase64(file);
        if (!fileBase64) {
          throw new Error("Gagal membaca file sebagai base64");
        }
        
        // Simulasi progress untuk UX yang lebih baik
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            const newProgress = Math.min(prev + 5, 90);
            options?.onProgress?.(newProgress);
            return newProgress;
          });
        }, 300);

        // Siapkan data untuk dikirim sebagai JSON
        const requestData = {
          fileName: file.name,
          fileType: file.type,
          fileData: fileBase64,
          description: options?.description || `Uploaded by ${options?.studentName || 'user'}`
        };

        console.log("Mengirim request ke GAS...");
        
        // Kirim request dengan JSON
        const response = await fetch(gasEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        clearInterval(progressInterval);
        
        const responseText = await response.text();
        console.log("Response raw:", responseText);
        
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (e) {
          console.error("Failed to parse response as JSON:", e);
          throw new Error("Respons dari server bukan format JSON yang valid");
        }
        
        console.log("Response parsed:", result);
        
        if (!result.success) {
          throw new Error(result.error || 'Upload gagal tanpa pesan error');
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
          fileUrl: result.downloadUrl || result.fileUrl,
          fileName: file.name,
          fileType: file.type,
          uploadedAt: result.uploadedAt || new Date().toISOString()
        };

        console.log("File metadata:", metadata);
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

  // Fungsi untuk membaca file sebagai base64
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Format data URL: "data:image/png;base64,iVBORw0KG..."
        // Kita perlu mengambil bagian setelah koma
        const base64String = reader.result as string;
        const base64Content = base64String.split(',')[1];
        resolve(base64Content);
      };
      reader.onerror = () => {
        reject(new Error("Gagal membaca file"));
      };
    });
  };

  const deleteFile = useCallback(
    async (fileId: string): Promise<boolean> => {
      toast({
        title: "Info",
        description: "Fitur hapus file belum diimplementasikan.",
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
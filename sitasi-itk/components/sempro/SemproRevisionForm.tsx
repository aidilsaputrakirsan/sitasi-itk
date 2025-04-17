// components/sempro/SemproRevisionForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Sempro, SemproRevisionFormValues, FileMetadata } from '@/types/sempro';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from './FileUpload';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AlertCircle } from 'lucide-react';
import { useGoogleDriveStorage } from '@/hooks/useGoogleDriveStorage';

// Schema validation untuk form revisi
const formSchema = z.object({
  catatan: z.string().optional(),
  // File object untuk UI
  dokumen_ta012: z.any().optional(),
  dokumen_plagiarisme: z.any().optional(),
  dokumen_draft: z.any().optional(),
  // Metadata untuk pengiriman ke server
  dokumen_ta012_metadata: z.any().optional(),
  dokumen_plagiarisme_metadata: z.any().optional(),
  dokumen_draft_metadata: z.any().optional()
});

interface SemproRevisionFormProps {
  onSubmit: (values: SemproRevisionFormValues) => void;
  isSubmitting: boolean;
  sempro: Sempro;
}

export function SemproRevisionForm({ 
  onSubmit, 
  isSubmitting,
  sempro
}: SemproRevisionFormProps) {
  const { uploadFile, isUploading } = useGoogleDriveStorage();
  const { user } = useAuth();
  
  // State for mahasiswa data
  const [mahasiswaData, setMahasiswaData] = useState<{nim?: string, nama?: string} | null>(null);
  
  // State for file uploads - menyimpan File object
  const [dokumenTA012, setDokumenTA012] = useState<File | null>(null);
  const [dokumenPlagiarisme, setDokumenPlagiarisme] = useState<File | null>(null);
  const [dokumenDraft, setDokumenDraft] = useState<File | null>(null);
  
  // State untuk metadata file yang sudah diupload
  const [dokumenTA012Metadata, setDokumenTA012Metadata] = useState<FileMetadata | null>(null);
  const [dokumenPlagiarismeMetadata, setDokumenPlagiarismeMetadata] = useState<FileMetadata | null>(null);
  const [dokumenDraftMetadata, setDokumenDraftMetadata] = useState<FileMetadata | null>(null);
  
  // Upload progress tracking
  const [uploadProgress, setUploadProgress] = useState({
    ta012: 0,
    plagiarisme: 0,
    draft: 0
  });

  // Error state
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Fetch mahasiswa data
  useEffect(() => {
    const fetchMahasiswaData = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('mahasiswas')
          .select('nama, nim')
          .eq('user_id', user.id)
          .single();
          
        if (error) {
          console.error('Error fetching mahasiswa data:', error);
          return;
        }
        
        if (data) {
          setMahasiswaData(data);
        }
      } catch (error) {
        console.error('Unexpected error fetching mahasiswa data:', error);
      }
    };
    
    fetchMahasiswaData();
  }, [user]);

  // Helper untuk membuat FileMetadata dari URL string yang sudah ada
  const createFileMetadataFromUrl = (url: string | null | undefined, type: string): FileMetadata | null => {
    if (!url) return null;
    
    try {
      // Ekstrak nama file dari URL (ambil bagian terakhir dari path)
      const pathParts = url.split('/');
      const fullFileName = pathParts[pathParts.length - 1];
      
      // Coba ekstrak nama file dari format timestamped
      let fileName = fullFileName;
      const timestampMatch = fullFileName.match(/\d+_(.+)/);
      if (timestampMatch && timestampMatch[1]) {
        fileName = timestampMatch[1];
      }
      
      return {
        fileId: url,
        fileUrl: url,
        fileName: fileName || `Dokumen ${type}`,
        fileType: fileName.split('.').pop()?.toLowerCase() || 'pdf',
        uploadedAt: new Date().toISOString()
      };
    } catch (e) {
      console.error("Error creating file metadata from URL:", e);
      return null;
    }
  };
  
  // Set existing file metadata from sempro
  useEffect(() => {
    if (sempro) {
      // Initialize metadata from existing files
      const ta012Meta = createFileMetadataFromUrl(sempro.form_ta_012, "TA-012");
      const plagiarismeMeta = createFileMetadataFromUrl(sempro.bukti_plagiasi, "Plagiarisme");
      const draftMeta = createFileMetadataFromUrl(sempro.proposal_ta, "Proposal");
      
      setDokumenTA012Metadata(ta012Meta);
      setDokumenPlagiarismeMetadata(plagiarismeMeta);
      setDokumenDraftMetadata(draftMeta);
    }
  }, [sempro]);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<SemproRevisionFormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      catatan: '',
      dokumen_ta012: undefined,
      dokumen_plagiarisme: undefined,
      dokumen_draft: undefined,
      dokumen_ta012_metadata: undefined,
      dokumen_plagiarisme_metadata: undefined,
      dokumen_draft_metadata: undefined
    }
  });

  // Handle file uploads dengan penyimpanan terpisah untuk File dan Metadata
  const handleTA012Upload = async (file: File | null) => {
    setDokumenTA012(file);
    
    // Reset metadata jika file dihapus
    if (!file) {
      setDokumenTA012Metadata(null);
      setValue('dokumen_ta012', null);
      setValue('dokumen_ta012_metadata', undefined);
      return;
    }
    
    // Track progress
    const handleProgress = (progress: number) => {
      setUploadProgress(prev => ({ ...prev, ta012: progress }));
    };
    
    try {
      // Upload ke Google Drive via proxy
      const fileMetadata = await uploadFile(file, {
        studentId: mahasiswaData?.nim || '',
        studentName: mahasiswaData?.nama || '',
        description: 'Revisi Form TA-012 untuk seminar proposal',
        onProgress: handleProgress
      });
      
      if (!fileMetadata) {
        throw new Error('Gagal mengupload Form TA-012');
      }
      
      // Simpan metadata untuk tampilan dan submit
      setDokumenTA012Metadata(fileMetadata);
      
      // Set form value: File untuk UI
      setValue('dokumen_ta012', file);
      
      // Set metadata di properti terpisah untuk submit
      setValue('dokumen_ta012_metadata', fileMetadata);
    } catch (error) {
      console.error('Error uploading TA-012:', error);
      setUploadError('Gagal mengupload File TA-012. Silakan coba lagi.');
    }
  };
  
  const handlePlagiarismeUpload = async (file: File | null) => {
    setDokumenPlagiarisme(file);
    
    // Reset metadata jika file dihapus
    if (!file) {
      setDokumenPlagiarismeMetadata(null);
      setValue('dokumen_plagiarisme', null);
      setValue('dokumen_plagiarisme_metadata', undefined);
      return;
    }
    
    // Track progress
    const handleProgress = (progress: number) => {
      setUploadProgress(prev => ({ ...prev, plagiarisme: progress }));
    };
    
    try {
      // Upload ke Google Drive via proxy
      const fileMetadata = await uploadFile(file, {
        studentId: mahasiswaData?.nim || '',
        studentName: mahasiswaData?.nama || '',
        description: 'Revisi hasil cek plagiarisme untuk seminar proposal',
        onProgress: handleProgress
      });
      
      if (!fileMetadata) {
        throw new Error('Gagal mengupload hasil cek plagiarisme');
      }
      
      // Simpan metadata untuk tampilan dan submit
      setDokumenPlagiarismeMetadata(fileMetadata);
      
      // Set form value: File untuk UI
      setValue('dokumen_plagiarisme', file);
      
      // Set metadata di properti terpisah untuk submit
      setValue('dokumen_plagiarisme_metadata', fileMetadata);
    } catch (error) {
      console.error('Error uploading plagiarisme document:', error);
      setUploadError('Gagal mengupload hasil cek plagiarisme. Silakan coba lagi.');
    }
  };
  
  const handleDraftUpload = async (file: File | null) => {
    setDokumenDraft(file);
    
    // Reset metadata jika file dihapus
    if (!file) {
      setDokumenDraftMetadata(null);
      setValue('dokumen_draft', null);
      setValue('dokumen_draft_metadata', undefined);
      return;
    }
    
    // Track progress
    const handleProgress = (progress: number) => {
      setUploadProgress(prev => ({ ...prev, draft: progress }));
    };
    
    try {
      // Upload ke Google Drive via proxy
      const fileMetadata = await uploadFile(file, {
        studentId: mahasiswaData?.nim || '',
        studentName: mahasiswaData?.nama || '',
        description: 'Revisi draft proposal untuk seminar proposal',
        onProgress: handleProgress
      });
      
      if (!fileMetadata) {
        throw new Error('Gagal mengupload draft proposal');
      }
      
      // Simpan metadata untuk tampilan dan submit
      setDokumenDraftMetadata(fileMetadata);
      
      // Set form value: File untuk UI
      setValue('dokumen_draft', file);
      
      // Set metadata di properti terpisah untuk submit
      setValue('dokumen_draft_metadata', fileMetadata);
    } catch (error) {
      console.error('Error uploading draft document:', error);
      setUploadError('Gagal mengupload draft proposal. Silakan coba lagi.');
    }
  };

  const onFormSubmit = async (data: SemproRevisionFormValues) => {
    try {
      if (isUploading) {
        setUploadError('Mohon tunggu hingga semua file selesai diupload');
        return;
      }
      
      // Untuk revisi, kita hanya perlu metadata yang diubah
      // Jika tidak ada file baru yang diupload, gunakan metadata yang lama
      const ta012Meta = dokumenTA012Metadata || createFileMetadataFromUrl(sempro.form_ta_012, "TA-012");
      const plagiarismeMeta = dokumenPlagiarismeMetadata || createFileMetadataFromUrl(sempro.bukti_plagiasi, "Plagiarisme");
      const draftMeta = dokumenDraftMetadata || createFileMetadataFromUrl(sempro.proposal_ta, "Proposal");
      
      // Pastikan setidaknya satu dokumen direvisi
      if (!ta012Meta && !plagiarismeMeta && !draftMeta) {
        setUploadError('Minimal satu dokumen harus direvisi');
        return;
      }
      
      setUploadError(null);
      
      // Siapkan data revisi
      const revisionData: SemproRevisionFormValues = {
        catatan: data.catatan || '',
        dokumen_ta012_metadata: ta012Meta ?? undefined,
        dokumen_plagiarisme_metadata: plagiarismeMeta ?? undefined,
        dokumen_draft_metadata: draftMeta ?? undefined
      };
      
      // Kirim data revisi
      onSubmit(revisionData);
      
    } catch (error) {
      console.error("Error dalam persiapan revisi:", error);
      setUploadError(`Gagal mengupload revisi: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Revisi Dokumen Seminar Proposal</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onFormSubmit as any)}>
        <CardContent className="space-y-6">
          {/* Status mahasiswa info */}
          {mahasiswaData && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-700">
                <span className="font-medium">Mahasiswa:</span> {mahasiswaData.nama} ({mahasiswaData.nim})
              </p>
            </div>
          )}
          
          {/* Upload error alert */}
          {uploadError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                <span className="block sm:inline">{uploadError}</span>
              </div>
            </div>
          )}

          {/* Tampilkan alasan revisi */}
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
        <h3 className="font-medium text-amber-800">Alasan Memerlukan Revisi:</h3>
        <div className="mt-2">
            {sempro.revisi_pembimbing_1 && (
            <div className="mb-2">
                <p className="text-sm font-medium">Catatan Pembimbing 1:</p>
                <p className="text-sm text-gray-700">{sempro.revisi_pembimbing_1}</p>
            </div>
            )}
            {sempro.revisi_pembimbing_2 && (
            <div className="mb-2">
                <p className="text-sm font-medium">Catatan Pembimbing 2:</p>
                <p className="text-sm text-gray-700">{sempro.revisi_pembimbing_2}</p>
            </div>
            )}
            {!sempro.revisi_pembimbing_1 && !sempro.revisi_pembimbing_2 && (
            // Kode untuk menampilkan pesan alternatif jika tidak ada catatan revisi
            <div className="mb-2">
                <p className="text-sm text-gray-700">
                Silakan periksa riwayat atau hubungi pembimbing untuk detail revisi yang diperlukan.
                </p>
            </div>
            )}
        </div>
        </div>
                
          {/* Dokumen Upload Section */}
          <div className="space-y-4">
            <h3 className="text-md font-medium">Upload Dokumen Revisi</h3>
            <p className="text-sm text-gray-500">Upload dokumen yang perlu direvisi. Jika tidak ada perubahan, dokumen lama akan tetap digunakan.</p>
            
            {/* Form TA-012 Upload */}
            <div className="space-y-2">
              <Label htmlFor="dokumen_ta012">Form TA-012</Label>
              <FileUpload
                id="dokumen_ta012"
                acceptedFileTypes=".pdf,.doc,.docx"
                maxSize={10} // 10MB
                onFileSelected={handleTA012Upload}
                progress={uploadProgress.ta012}
                currentFile={dokumenTA012}
                metadata={dokumenTA012Metadata}
              />
              {errors.dokumen_ta012 && (
                <p className="text-red-500 text-xs mt-1">{errors.dokumen_ta012.message}</p>
              )}
            </div>
            
            {/* Hasil Cek Plagiarisme Upload */}
            <div className="space-y-2">
              <Label htmlFor="dokumen_plagiarisme">Hasil Cek Plagiarisme</Label>
              <FileUpload
                id="dokumen_plagiarisme"
                acceptedFileTypes=".pdf,.doc,.docx"
                maxSize={10} // 10MB
                onFileSelected={handlePlagiarismeUpload}
                progress={uploadProgress.plagiarisme}
                currentFile={dokumenPlagiarisme}
                metadata={dokumenPlagiarismeMetadata}
              />
              {errors.dokumen_plagiarisme && (
                <p className="text-red-500 text-xs mt-1">{errors.dokumen_plagiarisme.message}</p>
              )}
            </div>
            
            {/* Draft Proposal Upload */}
            <div className="space-y-2">
              <Label htmlFor="dokumen_draft">Draft Proposal</Label>
              <FileUpload
                id="dokumen_draft"
                acceptedFileTypes=".pdf,.doc,.docx"
                maxSize={10} // 10MB
                onFileSelected={handleDraftUpload}
                progress={uploadProgress.draft}
                currentFile={dokumenDraft}
                metadata={dokumenDraftMetadata}
              />
              {errors.dokumen_draft && (
                <p className="text-red-500 text-xs mt-1">{errors.dokumen_draft.message}</p>
              )}
            </div>
          </div>

          {/* Catatan */}
          <div className="space-y-2">
            <Label htmlFor="catatan">Catatan Revisi</Label>
            <Textarea 
              id="catatan" 
              placeholder="Berikan catatan mengenai revisi yang dilakukan" 
              {...register('catatan')} 
              rows={3}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" type="button" onClick={() => window.history.back()}>
            Batal
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || isUploading || 
              (!dokumenTA012Metadata && !!dokumenTA012 && uploadProgress.ta012 < 100) || 
              (!dokumenPlagiarismeMetadata && !!dokumenPlagiarisme && uploadProgress.plagiarisme < 100) || 
              (!dokumenDraftMetadata && !!dokumenDraft && uploadProgress.draft < 100)}
          >
            {isSubmitting ? 'Mengirim Revisi...' : 'Kirim Revisi'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
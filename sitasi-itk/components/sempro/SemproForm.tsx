// components/sempro/SemproForm.tsx - Perbaikan untuk menggunakan properti metadata terpisah
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { SemproFormValues, FileMetadata } from '@/types/sempro';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, Option } from "@/components/ui/select";
import { useStudentPengajuanTAforSempro } from '@/hooks/useSempro';
import { FileUpload } from './FileUpload';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AlertCircle } from 'lucide-react';
//import { useFirebaseStorage } from '@/hooks/useFirebaseStorage';
import { useGoogleDriveStorage } from '@/hooks/useGoogleDriveStorage';


// Adjusted schema validation untuk file dan metadata
const formSchema = z.object({
  pengajuan_ta_id: z.string().min(1, 'Tugas akhir harus dipilih'),
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

interface SemproFormProps {
  onSubmit: (values: SemproFormValues) => void;
  isSubmitting: boolean;
}

export function SemproForm({ 
  onSubmit, 
  isSubmitting
}: SemproFormProps) {
  // Fetch student's thesis proposals for the dropdown
  const { data: pengajuanList, isLoading: isLoadingPengajuan } = useStudentPengajuanTAforSempro();
  //const { uploadFile, isUploading } = useFirebaseStorage();
  const { uploadFile, isUploading } = useGoogleDriveStorage();
  const { user } = useAuth();
  
  // State for mahasiswa data
  const [mahasiswaData, setMahasiswaData] = useState<{nim?: string, nama?: string} | null>(null);
  
  // State for file uploads - menyimpan File object
  const [dokumenTA012, setDokumenTA012] = useState<File | null>(null);
  const [dokumenPlagiarisme, setDokumenPlagiarisme] = useState<File | null>(null);
  const [dokumenDraft, setDokumenDraft] = useState<File | null>(null);
  
  // State untuk metadata file yang sudah diupload - penting untuk mencegah duplikasi
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
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<SemproFormValues>({
    resolver: zodResolver(formSchema) as any, // Type cast to avoid TS errors
    defaultValues: {
      pengajuan_ta_id: '',
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
    
    console.log("Uploading TA-012:", file.name, file.size, file.type);
    
    const handleProgress = (progress: number) => {
      setUploadProgress(prev => ({ ...prev, ta012: progress }));
    };
    
    try {
      // Upload ke Firebase Storage
      const fileMetadata = await uploadFile(file, {
        studentId: mahasiswaData?.nim || '',
        studentName: mahasiswaData?.nama || '',
        description: 'Form TA-012 untuk pendaftaran seminar proposal',
        onProgress: handleProgress
      });
      
      if (!fileMetadata) {
        throw new Error('Gagal mengupload Form TA-012');
      }
      
      console.log("TA-012 Upload Success:", fileMetadata);
      
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
      // Upload ke Firebase Storage
      const fileMetadata = await uploadFile(file, {
        studentId: mahasiswaData?.nim || '',
        studentName: mahasiswaData?.nama || '',
        description: 'Hasil cek plagiarisme untuk pendaftaran seminar proposal',
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
      // Upload ke Firebase Storage
      const fileMetadata = await uploadFile(file, {
        studentId: mahasiswaData?.nim || '',
        studentName: mahasiswaData?.nama || '',
        description: 'Draft proposal untuk pendaftaran seminar proposal',
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

  const [debugInfo, setDebugInfo] = useState("");

  // In components/sempro/SemproForm.tsx - add better error handling in onFormSubmit
  const onFormSubmit = async (data: SemproFormValues) => {
    try {
      setDebugInfo("Memulai proses pendaftaran...");
      
      if (isUploading) {
        setUploadError('Mohon tunggu hingga semua file selesai diupload');
        return;
      }
      
      if (!dokumenTA012Metadata || !dokumenPlagiarismeMetadata || !dokumenDraftMetadata) {
        setUploadError('Semua dokumen harus diupload');
        return;
      }
      
      setUploadError(null);
      
      // Log data untuk debugging
      console.log("Data form:", data);
      console.log("File metadata:", {
        ta012: dokumenTA012Metadata,
        plagiarisme: dokumenPlagiarismeMetadata,
        draft: dokumenDraftMetadata
      });
      
      setDebugInfo("Semua file siap, mengirim data pendaftaran...");
      
      // Pastikan metadata digunakan untuk pengiriman
      data.dokumen_ta012_metadata = dokumenTA012Metadata;
      data.dokumen_plagiarisme_metadata = dokumenPlagiarismeMetadata;
      data.dokumen_draft_metadata = dokumenDraftMetadata;
      
      // Tambahkan timeout untuk memberi waktu UI update
      setTimeout(async () => {
        try {
          setDebugInfo("Mengirim data ke server...");
          await onSubmit(data);
          setDebugInfo("Pendaftaran berhasil!");
        } catch (submitError) {
          console.error("Error during submission:", submitError);
          setDebugInfo(`Error submit: ${submitError instanceof Error ? submitError.message : JSON.stringify(submitError)}`);
          setUploadError(`Gagal mendaftar: ${submitError instanceof Error ? submitError.message : "Unknown error"}`);
        }
      }, 100);
      
    } catch (error) {
      console.error("Error dalam persiapan pendaftaran:", error);
      setDebugInfo(`Error: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      setUploadError(`Gagal mendaftar: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Pendaftaran Seminar Proposal</CardTitle>
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
          
          {/* Tugas Akhir Selection */}
          <div className="space-y-2">
            <Label htmlFor="pengajuan_ta_id">Tugas Akhir</Label>
            <Select
              id="pengajuan_ta_id"
              {...register('pengajuan_ta_id')}
              error={errors.pengajuan_ta_id?.message}
            >
              <Option value="">Pilih Tugas Akhir</Option>
              {isLoadingPengajuan ? (
                <Option value="" disabled>Loading...</Option>
              ) : pengajuanList?.length === 0 ? (
                <Option value="" disabled>Tidak ada tugas akhir yang tersedia</Option>
              ) : pengajuanList?.map(pengajuan => (
                <Option key={pengajuan.id} value={pengajuan.id}>
                  {pengajuan.judul}
                </Option>
              ))}
            </Select>
            {errors.pengajuan_ta_id && (
              <p className="text-red-500 text-xs mt-1">{errors.pengajuan_ta_id.message}</p>
            )}
            {pengajuanList?.length === 0 && !isLoadingPengajuan && (
              <p className="text-amber-500 text-sm mt-1">
                Anda tidak memiliki tugas akhir yang telah disetujui. Silakan mengajukan tugas akhir terlebih dahulu.
              </p>
            )}
          </div>

          {/* Dokumen Upload Section */}
          <div className="space-y-4">
            <h3 className="text-md font-medium">Upload Dokumen</h3>
            
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
            <Label htmlFor="catatan">Catatan (Opsional)</Label>
            <Textarea 
              id="catatan" 
              placeholder="Tambahkan catatan jika perlu" 
              {...register('catatan')} 
              rows={3}
            />
          </div>

           {/* Debug Information */}
            {debugInfo && (
              <div className="mt-4 p-3 bg-gray-100 border rounded text-xs">
                <p className="font-mono">{debugInfo}</p>
              </div>
            )}
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
            {isSubmitting ? 'Mendaftar...' : 'Daftar Seminar Proposal'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
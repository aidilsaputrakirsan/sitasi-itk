// components/sempro/SemproForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { SemproFormValues } from '@/types/sempro';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, Option } from "@/components/ui/select";
import { useStudentPengajuanTAforSempro } from '@/hooks/useSempro';
import { FileUpload } from './FileUpload';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AlertCircle } from 'lucide-react';

// Adjusted schema validation to allow nullable/optional file fields
const formSchema = z.object({
  pengajuan_ta_id: z.string().min(1, 'Tugas akhir harus dipilih'),
  catatan: z.string().optional(),
  dokumen_ta012: z.any().optional(),  // Changed from z.instanceof(File)
  dokumen_plagiarisme: z.any().optional(),
  dokumen_draft: z.any().optional()
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
  const { uploadFile, isUploading } = useFileUpload();
  const { user } = useAuth();
  
  // State for mahasiswa data
  const [mahasiswaData, setMahasiswaData] = useState<{nim?: string, nama?: string} | null>(null);
  
  // State for file uploads
  const [dokumenTA012, setDokumenTA012] = useState<File | null>(null);
  const [dokumenPlagiarisme, setDokumenPlagiarisme] = useState<File | null>(null);
  const [dokumenDraft, setDokumenDraft] = useState<File | null>(null);
  
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
      dokumen_draft: undefined
    }
  });

  // Handle file uploads with Google Drive integration
  const handleTA012Upload = async (file: File | null) => {
    setDokumenTA012(file);
    setValue('dokumen_ta012', file || undefined);
    
    if (!file) return;
    
    console.log("Uploading TA-012:", file.name, file.size, file.type); // Debug log
    
    // Track progress
    const handleProgress = (progress: number) => {
      setUploadProgress(prev => ({ ...prev, ta012: progress }));
    };
    
    try {
      // Upload immediately to Google Drive
      const fileMetadata = await uploadFile(file, {
        studentId: mahasiswaData?.nim || '',
        studentName: mahasiswaData?.nama || '',
        description: 'Form TA-012 untuk pendaftaran seminar proposal',
        onProgress: handleProgress
      });
      
      if (!fileMetadata) {
        throw new Error('Gagal mengupload Form TA-012');
      }
      
      // Perubahan penting: Debug log dan tambahkan metadata ke formValues
      console.log("TA-012 Upload Success:", fileMetadata);
      setValue('dokumen_ta012_metadata', fileMetadata);
    } catch (error) {
      console.error('Error uploading TA-012:', error);
      setUploadError('Gagal mengupload File TA-012. Silakan coba lagi.');
    }
  };
  
  const handlePlagiarismeUpload = async (file: File | null) => {
    setDokumenPlagiarisme(file);
    setValue('dokumen_plagiarisme', file || undefined);
    
    if (!file) return;
    
    // Track progress
    const handleProgress = (progress: number) => {
      setUploadProgress(prev => ({ ...prev, plagiarisme: progress }));
    };
    
    try {
      // Upload immediately to Google Drive
      const fileMetadata = await uploadFile(file, {
        studentId: mahasiswaData?.nim,
        studentName: mahasiswaData?.nama,
        description: 'Hasil cek plagiarisme untuk pendaftaran seminar proposal',
        onProgress: handleProgress
      });
      
      if (!fileMetadata) {
        throw new Error('Gagal mengupload hasil cek plagiarisme');
      }
    } catch (error) {
      console.error('Error uploading plagiarisme document:', error);
      setUploadError('Gagal mengupload hasil cek plagiarisme. Silakan coba lagi.');
    }
  };
  
  const handleDraftUpload = async (file: File | null) => {
    setDokumenDraft(file);
    setValue('dokumen_draft', file || undefined);
    
    if (!file) return;
    
    // Track progress
    const handleProgress = (progress: number) => {
      setUploadProgress(prev => ({ ...prev, draft: progress }));
    };
    
    try {
      // Upload immediately to Google Drive
      const fileMetadata = await uploadFile(file, {
        studentId: mahasiswaData?.nim,
        studentName: mahasiswaData?.nama,
        description: 'Draft proposal untuk pendaftaran seminar proposal',
        onProgress: handleProgress
      });
      
      if (!fileMetadata) {
        throw new Error('Gagal mengupload draft proposal');
      }
    } catch (error) {
      console.error('Error uploading draft document:', error);
      setUploadError('Gagal mengupload draft proposal. Silakan coba lagi.');
    }
  };

  const onFormSubmit = (data: SemproFormValues) => {
    if (isUploading) {
      setUploadError('Mohon tunggu hingga semua file selesai diupload');
      return;
    }
    
    // Required file validation
    if (!dokumenTA012 || !dokumenPlagiarisme || !dokumenDraft) {
      setUploadError('Semua dokumen harus diupload');
      return;
    }
    
    // Reset upload error
    setUploadError(null);
    
    // Set file objects to the form data
    data.dokumen_ta012 = dokumenTA012;
    data.dokumen_plagiarisme = dokumenPlagiarisme;
    data.dokumen_draft = dokumenDraft;
    
    console.log("Submitting form data:", data);
    onSubmit(data);
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
                maxSize={5} // 5MB
                onFileSelected={handleTA012Upload}
                progress={uploadProgress.ta012}
                currentFile={dokumenTA012}
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
                maxSize={5}
                onFileSelected={handlePlagiarismeUpload}
                progress={uploadProgress.plagiarisme}
                currentFile={dokumenPlagiarisme}
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
                maxSize={10} // 10MB for larger documents
                onFileSelected={handleDraftUpload}
                progress={uploadProgress.draft}
                currentFile={dokumenDraft}
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
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" type="button" onClick={() => window.history.back()}>
            Batal
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || isUploading || 
              (!!dokumenTA012 && uploadProgress.ta012 < 100) || 
              (!!dokumenPlagiarisme && uploadProgress.plagiarisme < 100) || 
              (!!dokumenDraft && uploadProgress.draft < 100)}
          >
            {isSubmitting ? 'Mendaftar...' : isUploading ? 'Mengunggah...' : 'Daftar Seminar Proposal'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
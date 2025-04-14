// components/sempro/SemproForm.tsx
'use client';

import React, { useState } from 'react';
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

// Schema validation for the form using Zod
const formSchema = z.object({
  pengajuan_ta_id: z.string().min(1, 'Tugas akhir harus dipilih'),
  catatan: z.string().optional(),
  dokumen_ta012: z.instanceof(File, { message: 'Form TA-012 harus diupload' }),
  dokumen_plagiarisme: z.instanceof(File, { message: 'Hasil cek plagiarisme harus diupload' }),
  dokumen_draft: z.instanceof(File, { message: 'Draft proposal harus diupload' })
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
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<SemproFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pengajuan_ta_id: '',
      catatan: ''
    }
  });

  // Handle file uploads
  const handleTA012Upload = (file: File) => {
    setDokumenTA012(file);
    setValue('dokumen_ta012', file);
  };
  
  const handlePlagiarismeUpload = (file: File) => {
    setDokumenPlagiarisme(file);
    setValue('dokumen_plagiarisme', file);
  };
  
  const handleDraftUpload = (file: File) => {
    setDokumenDraft(file);
    setValue('dokumen_draft', file);
  };

  const onFormSubmit = (data: SemproFormValues) => {
    console.log("Submitting form data:", data);
    onSubmit(data);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Pendaftaran Seminar Proposal</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onFormSubmit)}>
        <CardContent className="space-y-6">
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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Mendaftar...' : 'Daftar Seminar Proposal'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
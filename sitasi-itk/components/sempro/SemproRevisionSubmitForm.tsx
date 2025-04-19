// components/sempro/SemproRevisionSubmitForm.tsx
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
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

// Schema validation untuk form revisi post-evaluasi
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

interface SemproRevisionSubmitFormProps {
  sempro: Sempro;
}

export function SemproRevisionSubmitForm({ 
  sempro 
}: SemproRevisionSubmitFormProps) {
  const { uploadFile, isUploading } = useGoogleDriveStorage();
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
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

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Error state
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Necessary revision flags - based on revision notes
  const [needsTA012Revision, setNeedsTA012Revision] = useState(false);
  const [needsPlagiarismRevision, setNeedsPlagiarismRevision] = useState(false);
  const [needsDraftRevision, setNeedsDraftRevision] = useState(false);
  
  // Parse revision requirements
  useEffect(() => {
    if (sempro) {
      // Check revision notes from all possible sources
      const allRevisionNotes = [
        sempro.revisi_pembimbing_1,
        sempro.revisi_pembimbing_2,
        sempro.revisi_penguji_1,
        sempro.revisi_penguji_2
      ].filter(Boolean).join(' ');
      
      // Check what documents need revision based on keywords in notes
      setNeedsTA012Revision(
        allRevisionNotes.toLowerCase().includes('ta-012') || 
        allRevisionNotes.toLowerCase().includes('form ta') ||
        allRevisionNotes.toLowerCase().includes('formulir')
      );
      
      setNeedsPlagiarismRevision(
        allRevisionNotes.toLowerCase().includes('plagia') || 
        allRevisionNotes.toLowerCase().includes('similarity') ||
        allRevisionNotes.toLowerCase().includes('turnitin')
      );
      
      setNeedsDraftRevision(
        allRevisionNotes.toLowerCase().includes('draft') || 
        allRevisionNotes.toLowerCase().includes('proposal') ||
        allRevisionNotes.toLowerCase().includes('dokumen') ||
        allRevisionNotes.toLowerCase().includes('laporan')
      );
      
      // Default to true if we can't determine specific requirements
      if (!allRevisionNotes) {
        setNeedsTA012Revision(true);
        setNeedsPlagiarismRevision(true);
        setNeedsDraftRevision(true);
      }
    }
  }, [sempro]);
  
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
      
      setIsSubmitting(true);
      
      // Get existing file metadata if no new uploads
      const ta012Meta = dokumenTA012Metadata || createFileMetadataFromUrl(sempro.form_ta_012, "TA-012");
      const plagiarismeMeta = dokumenPlagiarismeMetadata || createFileMetadataFromUrl(sempro.bukti_plagiasi, "Plagiarisme");
      const draftMeta = dokumenDraftMetadata || createFileMetadataFromUrl(sempro.proposal_ta, "Proposal");
      
      // Validate required documents based on revision notes
      if (needsTA012Revision && !ta012Meta) {
        setUploadError('Form TA-012 perlu direvisi, silakan upload');
        setIsSubmitting(false);
        return;
      }
      
      if (needsPlagiarismRevision && !plagiarismeMeta) {
        setUploadError('Bukti cek plagiarisme perlu direvisi, silakan upload');
        setIsSubmitting(false);
        return;
      }
      
      if (needsDraftRevision && !draftMeta) {
        setUploadError('Draft proposal perlu direvisi, silakan upload');
        setIsSubmitting(false);
        return;
      }
      
      setUploadError(null);
      
      // Prepare update data for the sempro
      const updateData: any = {
        status: 'registered', // Reset to registered for admin review
        updated_at: new Date().toISOString()
      };
      
      // Add file URLs if we have them
      if (ta012Meta) updateData.form_ta_012 = ta012Meta.fileUrl;
      if (plagiarismeMeta) updateData.bukti_plagiasi = plagiarismeMeta.fileUrl;
      if (draftMeta) updateData.proposal_ta = draftMeta.fileUrl;
      
      // Update the sempro record with revision data
      const { data: updatedSempro, error } = await supabase
        .from('sempros')
        .update(updateData)
        .eq('id', sempro.id)
        .eq('user_id', user?.id)
        .select();
      
      if (error) {
        throw error;
      }
      
      // Add revision to history
      await supabase
        .from('riwayat_pendaftaran_sempros')
        .insert([{
          sempro_id: sempro.id,
          pengajuan_ta_id: sempro.pengajuan_ta_id,
          user_id: user?.id,
          status: 'registered',
          keterangan: data.catatan 
            ? `Revisi diupload: ${data.catatan}` 
            : 'Dokumen revisi telah diupload'
        }]);
      
      // Show success message
      toast({
        title: "Revisi Berhasil",
        description: "Dokumen revisi berhasil diupload. Menunggu verifikasi admin.",
      });
      
      // Redirect after success
      setTimeout(() => {
        router.push('/dashboard/sempro');
      }, 1500);
      
    } catch (error) {
      console.error("Error submitting revision:", error);
      setUploadError(`Gagal mengupload revisi: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
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

          {/* Revision notes display - show all revisions from different roles */}
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
            <h3 className="font-medium text-amber-800">Catatan Revisi:</h3>
            <div className="mt-2 space-y-3">
              {sempro.revisi_pembimbing_1 && (
                <div>
                  <p className="text-sm font-medium">Catatan Pembimbing 1:</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{sempro.revisi_pembimbing_1}</p>
                </div>
              )}
              
              {sempro.revisi_pembimbing_2 && (
                <div>
                  <p className="text-sm font-medium">Catatan Pembimbing 2:</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{sempro.revisi_pembimbing_2}</p>
                </div>
              )}
              
              {sempro.revisi_penguji_1 && (
                <div>
                  <p className="text-sm font-medium">Catatan Penguji 1:</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{sempro.revisi_penguji_1}</p>
                </div>
              )}
              
              {sempro.revisi_penguji_2 && (
                <div>
                  <p className="text-sm font-medium">Catatan Penguji 2:</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{sempro.revisi_penguji_2}</p>
                </div>
              )}
              
              {!sempro.revisi_pembimbing_1 && 
               !sempro.revisi_pembimbing_2 && 
               !sempro.revisi_penguji_1 && 
               !sempro.revisi_penguji_2 && (
                <p className="text-sm text-gray-700">
                  Silakan periksa riwayat atau hubungi pembimbing/penguji untuk detail revisi yang diperlukan.
                </p>
              )}
            </div>
          </div>
                
          {/* Dokumen Upload Section */}
          <div className="space-y-4">
            <h3 className="text-md font-medium">Upload Dokumen Revisi</h3>
            <p className="text-sm text-gray-500">
              Upload dokumen yang perlu direvisi sesuai catatan dosen. Dokumen yang tidak diubah akan tetap menggunakan versi sebelumnya.
            </p>
            
            {/* Form TA-012 Upload - only show if needed */}
            {needsTA012Revision && (
              <div className="space-y-2">
                <Label htmlFor="dokumen_ta012">Form TA-012 (Revisi)</Label>
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
            )}
            
            {/* Hasil Cek Plagiarisme Upload - only show if needed */}
            {needsPlagiarismRevision && (
              <div className="space-y-2">
                <Label htmlFor="dokumen_plagiarisme">Hasil Cek Plagiarisme (Revisi)</Label>
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
            )}
            
            {/* Draft Proposal Upload - only show if needed */}
            {needsDraftRevision && (
              <div className="space-y-2">
                <Label htmlFor="dokumen_draft">Draft Proposal (Revisi)</Label>
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
            )}
            
            {/* Message if no revisions needed */}
            {!needsTA012Revision && !needsPlagiarismRevision && !needsDraftRevision && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-blue-800">
                <p>
                  Tidak ada dokumen spesifik yang perlu direvisi berdasarkan catatan dosen.
                  Anda tetap dapat mengupload revisi jika diperlukan.
                </p>
              </div>
            )}
          </div>

          {/* Catatan */}
          <div className="space-y-2">
            <Label htmlFor="catatan">Catatan Revisi</Label>
            <Textarea 
              id="catatan" 
              placeholder="Berikan catatan mengenai revisi yang telah dilakukan" 
              {...register('catatan')} 
              rows={3}
            />
            <p className="text-sm text-gray-500">
              Jelaskan perubahan yang telah dilakukan pada revisi ini
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" type="button" onClick={() => window.history.back()}>
            Kembali
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || isUploading || 
              (needsTA012Revision && !dokumenTA012Metadata && !!dokumenTA012 && uploadProgress.ta012 < 100) || 
              (needsPlagiarismRevision && !dokumenPlagiarismeMetadata && !!dokumenPlagiarisme && uploadProgress.plagiarisme < 100) || 
              (needsDraftRevision && !dokumenDraftMetadata && !!dokumenDraft && uploadProgress.draft < 100)
            }
          >
            {isSubmitting ? 'Mengirim Revisi...' : 'Kirim Revisi'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
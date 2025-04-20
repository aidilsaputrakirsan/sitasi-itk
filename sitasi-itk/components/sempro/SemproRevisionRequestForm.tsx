// components/sempro/SemproRevisionRequestForm.tsx - Dengan validasi penilaian
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

// Interface for form values
interface RevisionRequestFormValues {
  sempro_id: string;
  revision_text: string;
  is_major: boolean;
  require_ta012_revision: boolean;
  require_plagiarism_revision: boolean;
  require_draft_revision: boolean;
}

// Schema validation - with explicit type declaration
const formSchema = z.object({
  sempro_id: z.string(),
  revision_text: z.string().min(10, { message: "Deskripsi revisi harus minimal 10 karakter" }),
  is_major: z.boolean().default(false),
  require_ta012_revision: z.boolean().default(false),
  require_plagiarism_revision: z.boolean().default(false),
  require_draft_revision: z.boolean().default(false),
}) as z.ZodType<RevisionRequestFormValues>;

interface SemproRevisionRequestFormProps {
  semproId: string;
  userId: string;
  isPembimbing: boolean;
}

export function SemproRevisionRequestForm({ 
  semproId, 
  userId,
  isPembimbing 
}: SemproRevisionRequestFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPenilaian, setHasPenilaian] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Check if user has given penilaian
  useEffect(() => {
    const checkPenilaian = async () => {
      setIsLoading(true);
      try {
        if (!user) return;
        
        // First check sempro status
        const { data: semproData, error: semproError } = await supabase
          .from('sempros')
          .select('status')
          .eq('id', semproId)
          .single();
          
        if (semproError) {
          console.error('Error fetching sempro status:', semproError);
          setErrorMessage('Tidak dapat memuat data sempro');
          return;
        }
        
        setIsCompleted(semproData.status === 'completed');
        
        // Check if user has submitted penilaian
        const { data: penilaianData, error: penilaianError } = await supabase
          .from('penilaian_sempros')
          .select('id')
          .eq('sempro_id', semproId)
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (penilaianError) {
          console.error('Error checking penilaian:', penilaianError);
          setErrorMessage('Tidak dapat memeriksa penilaian');
          return;
        }
        
        setHasPenilaian(!!penilaianData);
      } catch (error) {
        console.error('Error in checkPenilaian:', error);
        setErrorMessage('Terjadi kesalahan saat memeriksa data');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkPenilaian();
  }, [semproId, user]);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RevisionRequestFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sempro_id: semproId,
      revision_text: '',
      is_major: false,
      require_ta012_revision: false,
      require_plagiarism_revision: false,
      require_draft_revision: false,
    }
  });

  const requireAnyDocRevision = 
    watch('require_ta012_revision') || 
    watch('require_plagiarism_revision') || 
    watch('require_draft_revision');

  const onSubmit = async (data: RevisionRequestFormValues) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Sesi tidak valid",
        description: "Silakan login kembali untuk melakukan tindakan ini",
      });
      return;
    }
    
    // Verify user has provided penilaian
    if (!hasPenilaian) {
      toast({
        variant: "destructive",
        title: "Penilaian Diperlukan",
        description: "Anda harus memberikan penilaian sebelum meminta revisi",
      });
      return;
    }
    
    // Verify sempro is in completed status
    if (!isCompleted) {
      toast({
        variant: "destructive",
        title: "Status Tidak Valid",
        description: "Revisi hanya dapat diminta setelah semua penilaian selesai",
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Get dosen's full name
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        throw new Error('Gagal mengambil data profil');
      }
      
      const dosenName = profileData?.name || 'Dosen';
      
      // Get sempro data
      const { data: semproData, error: semproError } = await supabase
        .from('sempros')
        .select(`
          id, 
          pengajuan_ta_id,
          pengajuan_ta:pengajuan_ta_id(id, pembimbing_1, pembimbing_2)
        `)
        .eq('id', semproId)
        .single();
      
      if (semproError) {
        throw new Error('Gagal mengambil data sempro');
      }
      
      // Get jadwal data for penguji roles
      const { data: jadwalData } = await supabase
        .from('jadwal_sempros')
        .select('penguji_1, penguji_2')
        .eq('pengajuan_ta_id', semproData.pengajuan_ta_id)
        .maybeSingle();
      
      // Determine which field to update based on user role
      let revisionField = '';
      
      if (isPembimbing) {
        if (semproData.pengajuan_ta) {
          // Handle if pengajuan_ta might be parsed as array by TypeScript
          const pengajuanTa = Array.isArray(semproData.pengajuan_ta) 
            ? semproData.pengajuan_ta[0] 
            : semproData.pengajuan_ta;
            
          if (pengajuanTa && pengajuanTa.pembimbing_1 === user.id) {
            revisionField = 'revisi_pembimbing_1';
          } else if (pengajuanTa && pengajuanTa.pembimbing_2 === user.id) {
            revisionField = 'revisi_pembimbing_2';
          } else {
            throw new Error('Anda bukan pembimbing untuk sempro ini');
          }
        } else {
          throw new Error('Data pembimbing tidak tersedia');
        }
      } else {
        // Check penguji role
        if (jadwalData) {
          if (jadwalData.penguji_1 === user.id) {
            revisionField = 'revisi_penguji_1';
          } else if (jadwalData.penguji_2 === user.id) {
            revisionField = 'revisi_penguji_2';
          } else {
            throw new Error('Anda bukan penguji untuk sempro ini');
          }
        } else {
          throw new Error('Jadwal tidak ditemukan untuk sempro ini');
        }
      }
      
      if (!revisionField) {
        throw new Error('Tidak dapat menentukan peran Anda untuk sempro ini');
      }
      
      // Prepare the revision text
      let fullRevisionText = `${data.revision_text}\n\n`;
      
      // Add document revision requirements
      const docRevisions = [];
      if (data.require_ta012_revision) docRevisions.push('Form TA-012');
      if (data.require_plagiarism_revision) docRevisions.push('Bukti Plagiasi');
      if (data.require_draft_revision) docRevisions.push('Draft Proposal');
      
      if (docRevisions.length > 0) {
        fullRevisionText += `\nDokumen yang perlu direvisi:\n- ${docRevisions.join('\n- ')}`;
      }
      
      // Prepare update data
      const updateData: any = {
        [revisionField]: fullRevisionText
      };
      
      // Update status to revision_required if this is a major revision
      if (data.is_major) {
        updateData.status = 'revision_required';
      }
      
      // Update the sempro record
      const { data: updatedSempro, error } = await supabase
        .from('sempros')
        .update(updateData)
        .eq('id', semproId)
        .select();
      
      if (error) {
        throw error;
      }
      
      // Add to revision history
      await supabase
        .from('riwayat_pendaftaran_sempros')
        .insert([{
          sempro_id: semproId,
          pengajuan_ta_id: semproData.pengajuan_ta_id,
          user_id: user.id,
          status: data.is_major ? 'revision_required' : 'completed',
          keterangan: `Revisi diminta oleh ${dosenName}${data.is_major ? ' (Revisi Mayor)' : ' (Revisi Minor)'}`
        }]);
      
      // Send notification to student
      await supabase
        .from('notifikasis')
        .insert([{
          from_user: user.id,
          to_user: userId,
          judul: `Revisi ${data.is_major ? 'Mayor' : 'Minor'} Sempro`,
          pesan: `${dosenName} meminta revisi ${data.is_major ? 'mayor' : 'minor'} untuk seminar proposal Anda`,
          is_read: false
        }]);
      
      toast({
        title: "Revisi Diminta",
        description: "Permintaan revisi berhasil dikirim ke mahasiswa",
      });
      
      // Redirect back to sempro detail
      setTimeout(() => {
        router.push(`/dashboard/sempro/${semproId}`);
      }, 1500);
      
    } catch (error) {
      console.error('Error submitting revision request:', error);
      toast({
        variant: "destructive",
        title: "Gagal Mengirim Permintaan Revisi",
        description: error instanceof Error ? error.message : "Terjadi kesalahan, silakan coba lagi nanti",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-3">Memeriksa data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (errorMessage) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button variant="outline" onClick={() => router.back()}>Kembali</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check prerequisite requirements
  if (!hasPenilaian) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tidak Dapat Meminta Revisi</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Penilaian Diperlukan</AlertTitle>
            <AlertDescription>
              Anda harus memberikan penilaian terlebih dahulu sebelum meminta revisi. 
              Silakan berikan penilaian pada halaman detail sempro.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button onClick={() => router.push(`/dashboard/sempro/penilaian/${semproId}`)}>
              Berikan Penilaian
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isCompleted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tidak Dapat Meminta Revisi</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Status Tidak Valid</AlertTitle>
            <AlertDescription>
              Revisi hanya dapat diminta setelah seminar proposal selesai dan semua dosen memberikan 
              penilaian (status "Selesai").
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button variant="outline" onClick={() => router.back()}>Kembali</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Permintaan Revisi Seminar Proposal</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <input type="hidden" {...register('sempro_id')} value={semproId} />
          
          {/* Catatan Revisi */}
          <div className="space-y-2">
            <Label htmlFor="revision_text">Catatan Revisi</Label>
            <Textarea 
              id="revision_text" 
              placeholder="Tuliskan saran dan perbaikan yang diperlukan" 
              rows={5}
              {...register('revision_text')} 
            />
            {errors.revision_text && (
              <p className="text-sm text-red-500">{errors.revision_text.message}</p>
            )}
          </div>
          
          {/* Dokumen yang Perlu Revisi */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Dokumen yang Perlu Direvisi</Label>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="require_ta012_revision" className="text-sm font-normal">
                  Form TA-012
                </Label>
                <p className="text-xs text-gray-500">Form pendaftaran seminar proposal</p>
              </div>
              <Switch 
                id="require_ta012_revision" 
                {...register('require_ta012_revision')} 
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="require_plagiarism_revision" className="text-sm font-normal">
                  Bukti Plagiasi
                </Label>
                <p className="text-xs text-gray-500">Hasil pemeriksaan plagiarisme</p>
              </div>
              <Switch 
                id="require_plagiarism_revision" 
                {...register('require_plagiarism_revision')} 
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="require_draft_revision" className="text-sm font-normal">
                  Draft Proposal
                </Label>
                <p className="text-xs text-gray-500">Dokumen proposal tugas akhir</p>
              </div>
              <Switch 
                id="require_draft_revision" 
                {...register('require_draft_revision')} 
              />
            </div>
          </div>
          
          {/* Major Revision */}
          <div className="flex items-center justify-between border-t pt-4">
            <div className="space-y-0.5">
              <Label htmlFor="is_major" className="text-sm font-medium">
                Revisi Mayor
              </Label>
              <p className="text-xs text-gray-500">
                Revisi mayor memerlukan persetujuan ulang dan status sempro akan berubah menjadi "Perlu Revisi"
              </p>
            </div>
            <Switch 
              id="is_major" 
              {...register('is_major')} 
            />
          </div>
          
          {/* Warning for Major Revisions */}
          {watch('is_major') && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
              <p>
                <strong>Catatan:</strong> Revisi mayor akan mengubah status sempro ke "Revisi Diperlukan" 
                dan memerlukan persetujuan ulang.
              </p>
            </div>
          )}
          
          {/* Warning if no document revision selected */}
          {!requireAnyDocRevision && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
              <p>
                <strong>Info:</strong> Anda tidak memilih dokumen yang perlu direvisi. 
                Mahasiswa hanya akan menerima catatan revisi tanpa perlu mengunggah dokumen baru.
              </p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            type="button" 
            onClick={() => router.back()}
          >
            Batal
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Mengirim...' : 'Kirim Permintaan Revisi'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
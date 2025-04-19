'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSemproDetail, useSubmitPenilaianSempro } from '@/hooks/useSempro';
import { PenilaianSemproForm } from '@/components/sempro/PenilaianSemproForm';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function SemproDetailPenilaianPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { data: sempro, isLoading, error } = useSemproDetail(params.id);
  const submitPenilaian = useSubmitPenilaianSempro();
  const [existingPenilaian, setExistingPenilaian] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Effect untuk cek apakah dosen sudah pernah memberikan penilaian
  useEffect(() => {
    const checkExistingPenilaian = async () => {
      if (!user || !sempro) return;
      
      try {
        console.log("Checking existing penilaian for sempro:", sempro.id, "and user:", user.id);
        
        const { data, error } = await supabase
          .from('penilaian_sempros')
          .select('*')
          .eq('sempro_id', sempro.id)
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (error) {
          throw error;
        }
        
        if (data) {
          console.log("Found existing penilaian:", data);
          setExistingPenilaian(data);
        }
      } catch (error) {
        console.error("Error checking existing penilaian:", error);
      }
    };
    
    checkExistingPenilaian();
  }, [user, sempro]);
  
  // Debug log untuk melihat hasil query
  useEffect(() => {
    console.log("SemproDetail Debug - ID:", params.id);
    console.log("SemproDetail Debug - Data:", sempro);
    console.log("SemproDetail Debug - Error:", error);
  }, [params.id, sempro, error]);
  
  const handlePenilaianSubmit = async (values: any) => {
    if (!user || !sempro) return;
    
    try {
      setIsSubmitting(true);
      
      // Tambahkan sempro_id ke nilai yang disubmit
      const penilaianData = {
        ...values,
        sempro_id: sempro.id
      };
      
      await submitPenilaian.mutateAsync(penilaianData);
      
      // Jika berhasil, kembali ke daftar sempro
      router.push('/dashboard/sempro/penilaian');
      
    } catch (error) {
      console.error('Error submitting penilaian:', error);
      toast({
        variant: "destructive",
        title: "Gagal Menyimpan Penilaian",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan penilaian.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Tampilkan loading
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">Memuat data seminar proposal...</p>
      </div>
    );
  }
  
  // Tampilkan error jika ada
  if (error || !sempro) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">
            {error instanceof Error ? error.message : "Data seminar proposal tidak ditemukan"}
          </p>
          <div className="mt-4">
            <button 
              className="text-blue-600 hover:underline"
              onClick={() => router.push('/dashboard/sempro/penilaian')}
            >
              Kembali ke Daftar Sempro
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Jika dosen sudah memberikan penilaian, tampilkan data penilaian
  if (existingPenilaian) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Penilaian Seminar Proposal</h1>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Detail Seminar Proposal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-500">Judul</h3>
                <p>{sempro.pengajuan_ta?.judul || '-'}</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-500">Mahasiswa</h3>
                <p>{sempro.mahasiswa?.nama || '-'} ({sempro.mahasiswa?.nim || '-'})</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Penilaian Telah Diberikan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-500">
                Anda telah memberikan penilaian untuk seminar proposal ini pada{' '}
                {new Date(existingPenilaian.created_at).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 mb-3">
                <div>
                  <span className="text-gray-500">Media Presentasi:</span>{' '}
                  <span className="font-medium">{existingPenilaian.media_presentasi}</span>
                </div>
                <div>
                  <span className="text-gray-500">Komunikasi:</span>{' '}
                  <span className="font-medium">{existingPenilaian.komunikasi}</span>
                </div>
                <div>
                  <span className="text-gray-500">Penguasaan Materi:</span>{' '}
                  <span className="font-medium">{existingPenilaian.penguasaan_materi}</span>
                </div>
                <div>
                  <span className="text-gray-500">Isi Laporan:</span>{' '}
                  <span className="font-medium">{existingPenilaian.isi_laporan_ta}</span>
                </div>
                <div>
                  <span className="text-gray-500">Struktur Penulisan:</span>{' '}
                  <span className="font-medium">{existingPenilaian.struktur_penulisan}</span>
                </div>
                <div>
                  <span className="text-gray-500">Total:</span>{' '}
                  <span className="font-medium">{existingPenilaian.nilai_total}</span>
                </div>
              </div>
              
              {existingPenilaian.catatan && (
                <div>
                  <h3 className="font-medium text-gray-500">Catatan:</h3>
                  <p className="mt-1">{existingPenilaian.catatan}</p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              onClick={() => router.push('/dashboard/sempro/penilaian')}
            >
              Kembali
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Tampilkan form penilaian
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Penilaian Seminar Proposal</h1>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Detail Seminar Proposal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-500">Judul</h3>
              <p>{sempro.pengajuan_ta?.judul || '-'}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-500">Mahasiswa</h3>
              <p>{sempro.mahasiswa?.nama || '-'} ({sempro.mahasiswa?.nim || '-'})</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-500">Bidang Penelitian</h3>
              <p>{sempro.pengajuan_ta?.bidang_penelitian || '-'}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-500">Status</h3>
              <p>{sempro.status}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <PenilaianSemproForm
        onSubmit={handlePenilaianSubmit}
        isSubmitting={isSubmitting}
        semproId={sempro.id}
      />
    </div>
  );
}
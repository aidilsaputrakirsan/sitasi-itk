'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSemproDetail, useDosenPenilaianStatus, useSubmitPenilaianSempro } from '@/hooks/useSempro';
import { PenilaianSemproForm } from '@/components/sempro/PenilaianSemproForm';
import { PenilaianSemproFormValues } from '@/types/sempro';
import { UserRole } from '@/types/auth';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function PenilaianSemproPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<UserRole>('dosen');
  const { data: sempro, isLoading: isLoadingSempro } = useSemproDetail(params.id);
  const { data: hasPenilaian, isLoading: isLoadingPenilaian } = useDosenPenilaianStatus(
    params.id,
    user?.id || ''
  );
  const { mutate: submitPenilaian, isPending } = useSubmitPenilaianSempro();

  // Set user role
  useEffect(() => {
    if (!user) return;
    
    if (user.roles.includes('dosen')) {
      setUserRole('dosen');
    } else {
      router.push('/dashboard/sempro');
    }
  }, [user, router]);

  // Check access permissions - only dosen can give penilaian
  const checkAccess = () => {
    if (!user || !sempro) return false;

    // Only dosen can access
    if (!user.roles.includes('dosen')) {
      return false;
    }

    // Check if dosen is penguji for this sempro
    // Need to fetch jadwal data from sempro_id to get penguji info
    // For now, we'll assume any dosen can give penilaian if the sempro status is 'scheduled'
    return sempro.status === 'scheduled';
  };

  const handleSubmit = (formValues: PenilaianSemproFormValues) => {
    submitPenilaian(formValues, {
      onSuccess: () => {
        toast({
          title: "Penilaian Dikirim",
          description: "Penilaian seminar proposal berhasil dikirim",
        });
        router.push('/dashboard/sempro/jadwal');
      },
      onError: (error) => {
        toast({
          variant: "destructive", 
          title: "Gagal Mengirim Penilaian",
          description: error.message || "Terjadi kesalahan saat mengirim penilaian",
        });
      }
    });
  };

  const isLoading = isLoadingSempro || isLoadingPenilaian;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center">
          <p className="text-gray-500">Memuat data seminar proposal...</p>
        </div>
      </div>
    );
  }

  if (!sempro) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center py-12">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Tidak Ditemukan</h1>
          <p className="text-gray-500">
            Data seminar proposal tidak ditemukan.
          </p>
        </div>
      </div>
    );
  }

  if (!checkAccess()) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center py-12">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Akses Terbatas</h1>
          <p className="text-gray-500">
            Hanya dosen penguji yang dapat memberikan penilaian.
          </p>
        </div>
      </div>
    );
  }

  if (hasPenilaian) {
    return (
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Penilaian Seminar Proposal</h1>
        
        <Alert className="mb-6 bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-600">Penilaian Sudah Diberikan</AlertTitle>
          <AlertDescription className="text-green-700">
            Anda telah memberikan penilaian untuk seminar proposal ini.
          </AlertDescription>
        </Alert>
        
        <div className="bg-blue-50 p-4 rounded-md border border-blue-100 mb-6">
          <h2 className="text-lg font-medium mb-2">{sempro.pengajuan_ta?.judul}</h2>
          <p className="text-sm text-gray-700 mb-1">
            <span className="font-medium">Mahasiswa:</span> {sempro.mahasiswa?.nama} ({sempro.mahasiswa?.nim})
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Bidang Penelitian:</span> {sempro.pengajuan_ta?.bidang_penelitian}
          </p>
        </div>
        
        <div className="flex justify-center">
          <Button asChild>
            <Link href="/dashboard/sempro/jadwal">
              Kembali ke Jadwal
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Penilaian Seminar Proposal</h1>
      
      <div className="bg-blue-50 p-4 rounded-md border border-blue-100 mb-6">
        <h2 className="text-lg font-medium mb-2">{sempro.pengajuan_ta?.judul}</h2>
        <p className="text-sm text-gray-700 mb-1">
          <span className="font-medium">Mahasiswa:</span> {sempro.mahasiswa?.nama} ({sempro.mahasiswa?.nim})
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-medium">Bidang Penelitian:</span> {sempro.pengajuan_ta?.bidang_penelitian}
        </p>
      </div>
      
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Perhatian</AlertTitle>
        <AlertDescription>
          Penilaian yang sudah dikirim tidak dapat diubah. Pastikan Anda telah memberikan penilaian yang sesuai.
        </AlertDescription>
      </Alert>
      
      <PenilaianSemproForm
        onSubmit={handleSubmit}
        isSubmitting={isPending}
        semproId={params.id}
      />
    </div>
  );
}
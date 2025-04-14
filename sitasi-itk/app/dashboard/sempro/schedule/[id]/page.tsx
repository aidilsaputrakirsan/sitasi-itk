'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSemproDetail, useCreateJadwalSempro } from '@/hooks/useSempro';
import { JadwalSemproForm } from '@/components/sempro/JadwalSemproForm';
import { JadwalSemproFormValues } from '@/types/sempro';
import { UserRole } from '@/types/auth';
import { useToast } from '@/hooks/use-toast';

export default function ScheduleSemproPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<UserRole>('mahasiswa');
  const { data: sempro, isLoading, isError, error } = useSemproDetail(params.id);
  const { mutate: createJadwal, isPending } = useCreateJadwalSempro();

  // Set user role
  useEffect(() => {
    if (!user) return;
    
    if (user.roles.includes('koorpro')) {
      setUserRole('koorpro');
    } else if (user.roles.includes('tendik')) {
      setUserRole('tendik');
    } else {
      setUserRole('mahasiswa');
    }
  }, [user]);

  // Check access permissions - only admin can schedule
  const checkAccess = () => {
    if (!user) return false;
    return userRole === 'koorpro' || userRole === 'tendik';
  };

  // Check if sempro is in the right status (verified)
  const canSchedule = () => {
    if (!sempro) return false;
    return sempro.status === 'verified';
  };

  const handleSubmit = (formValues: JadwalSemproFormValues) => {
    createJadwal(formValues, {
      onSuccess: () => {
        toast({
          title: "Jadwal Dibuat",
          description: "Jadwal seminar proposal berhasil dibuat",
        });
        router.push('/dashboard/sempro');
      },
      onError: (error) => {
        toast({
          variant: "destructive", 
          title: "Gagal Membuat Jadwal",
          description: error.message || "Terjadi kesalahan saat membuat jadwal",
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center">
          <p className="text-gray-500">Memuat data seminar proposal...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center py-12">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Error</h1>
          <p className="text-red-500">
            {error instanceof Error ? error.message : 'Gagal memuat data seminar proposal'}
          </p>
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
            Hanya admin yang dapat menjadwalkan seminar proposal.
          </p>
        </div>
      </div>
    );
  }

  if (!canSchedule()) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center py-12">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Tidak Dapat Dijadwalkan</h1>
          <p className="text-gray-500">
            Hanya seminar proposal dengan status "Terverifikasi" yang dapat dijadwalkan.
            Status saat ini: <strong>{sempro.status}</strong>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Jadwalkan Seminar Proposal</h1>
      
      <div className="mb-6 bg-blue-50 p-4 rounded-md border border-blue-100">
        <h2 className="text-lg font-medium mb-2">{sempro.pengajuan_ta?.judul}</h2>
        <p className="text-sm text-gray-700 mb-1">
          <span className="font-medium">Mahasiswa:</span> {sempro.mahasiswa?.nama} ({sempro.mahasiswa?.nim})
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-medium">Bidang Penelitian:</span> {sempro.pengajuan_ta?.bidang_penelitian}
        </p>
      </div>
      
      <JadwalSemproForm
        onSubmit={handleSubmit}
        isSubmitting={isPending}
        semproId={params.id}
        pengajuanTaId={sempro.pengajuan_ta_id}
        userId={sempro.user_id}
        pembimbing1={sempro.pengajuan_ta?.pembimbing_1}
        pembimbing2={sempro.pengajuan_ta?.pembimbing_2}
      />
    </div>
  );
}
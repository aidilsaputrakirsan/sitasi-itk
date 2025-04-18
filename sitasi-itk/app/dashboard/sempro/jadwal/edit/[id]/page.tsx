'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useJadwalSemproDetail, useUpdateJadwalSempro } from '@/hooks/useSempro';
import { JadwalSemproForm } from '@/components/sempro/JadwalSemproForm';
import { JadwalSemproFormValues } from '@/types/sempro';
import { UserRole } from '@/types/auth';
import { useToast } from '@/hooks/use-toast';

export default function EditJadwalSemproPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<UserRole>('tendik');
  
  // Get jadwal data
  const { data: jadwal, isLoading, isError, error } = useJadwalSemproDetail(params.id);
  const { mutate: updateJadwal, isPending } = useUpdateJadwalSempro();

  // Set user role
  useEffect(() => {
    if (!user) return;
    
    if (user.roles.includes('koorpro')) {
      setUserRole('koorpro');
    } else if (user.roles.includes('tendik')) {
      setUserRole('tendik');
    } else {
      router.push('/dashboard/sempro/jadwal');
    }
  }, [user, router]);

  // Check access permissions - only admin can edit jadwal
  const checkAccess = () => {
    if (!user) return false;
    return userRole === 'koorpro' || userRole === 'tendik';
  };

  const handleSubmit = (formValues: JadwalSemproFormValues) => {
    updateJadwal({
      id: params.id,
      data: formValues
    }, {
      onSuccess: () => {
        toast({
          title: "Jadwal Diperbarui",
          description: "Jadwal seminar proposal berhasil diperbarui",
        });
        router.push(`/dashboard/sempro/jadwal/${params.id}`);
      },
      onError: (error) => {
        toast({
          variant: "destructive", 
          title: "Gagal Memperbarui Jadwal",
          description: error.message || "Terjadi kesalahan saat memperbarui jadwal",
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center">
          <p className="text-gray-500">Memuat data jadwal seminar proposal...</p>
        </div>
      </div>
    );
  }

  if (isError || !jadwal) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center py-12">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Error</h1>
          <p className="text-red-500">
            {error instanceof Error ? error.message : 'Gagal memuat data jadwal seminar proposal'}
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
            Hanya admin yang dapat mengedit jadwal seminar proposal.
          </p>
        </div>
      </div>
    );
  }

  // Prepare default values
  const defaultValues: JadwalSemproFormValues = {
    periode_id: jadwal.periode_id,
    pengajuan_ta_id: jadwal.pengajuan_ta_id,
    user_id: jadwal.user_id,
    penguji_1: jadwal.penguji_1,
    penguji_2: jadwal.penguji_2,
    tanggal_sempro: jadwal.tanggal_sempro,
    waktu_mulai: jadwal.waktu_mulai,
    waktu_selesai: jadwal.waktu_selesai,
    ruangan: jadwal.ruangan,
    is_published: jadwal.is_published
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Edit Jadwal Seminar Proposal</h1>
      
      <div className="mb-6 bg-blue-50 p-4 rounded-md border border-blue-100">
        <h2 className="text-lg font-medium mb-2">{jadwal.pengajuan_ta?.judul || 'Judul tidak tersedia'}</h2>
        <p className="text-sm text-gray-700 mb-1">
          <span className="font-medium">Mahasiswa:</span> {jadwal.mahasiswa?.nama || '-'} ({jadwal.mahasiswa?.nim || '-'})
        </p>
      </div>
      
      <JadwalSemproForm
        onSubmit={handleSubmit}
        isSubmitting={isPending}
        defaultValues={defaultValues}
        isEditing={true}
        semproId={jadwal.sempro?.id}
        pengajuanTaId={jadwal.pengajuan_ta_id}
        userId={jadwal.user_id}
      />
    </div>
  );
}
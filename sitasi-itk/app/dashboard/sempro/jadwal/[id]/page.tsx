'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { JadwalSemproDetail } from '@/components/sempro/JadwalSemproDetail';
import { UserRole } from '@/types/auth';
import { useJadwalSemproDetail } from '@/hooks/useSempro'; // Ganti dengan hook yang sudah diperbaiki

export default function JadwalSemproDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<UserRole>('mahasiswa');
  // Ganti dengan hook yang sudah diperbaiki
  const { data: jadwal, isLoading, isError, error } = useJadwalSemproDetail(params.id);

  // Set user role
  useEffect(() => {
    if (!user) return;
    
    if (user.roles.includes('koorpro')) {
      setUserRole('koorpro');
    } else if (user.roles.includes('tendik')) {
      setUserRole('tendik');
    } else if (user.roles.includes('dosen')) {
      setUserRole('dosen');
    } else {
      setUserRole('mahasiswa');
    }
  }, [user]);

  // Handle edit navigation for admin
  const handleEdit = () => {
    router.push(`/dashboard/sempro/jadwal/edit/${params.id}`);
  };

  // Check access permissions
  const checkAccess = () => {
    if (!user || !jadwal) return false;

    // Admin roles can access all
    if (userRole === 'koorpro' || userRole === 'tendik') {
      return true;
    }

    // Dosen can access if they are penguji
    if (userRole === 'dosen' && 
        (jadwal.penguji_1 === user.id || jadwal.penguji_2 === user.id)) {
      return true;
    }

    // Mahasiswa can access if it's their jadwal or if it's published
    if (userRole === 'mahasiswa' && 
        (jadwal.user_id === user.id || jadwal.is_published)) {
      return true;
    }

    return false;
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

  if (isError) {
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

  if (!jadwal) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center py-12">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Tidak Ditemukan</h1>
          <p className="text-gray-500">
            Jadwal seminar proposal tidak ditemukan.
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
            Anda tidak memiliki akses untuk melihat jadwal seminar proposal ini.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Detail Jadwal Seminar Proposal</h1>
      
      <JadwalSemproDetail
        jadwal={jadwal}
        userRole={userRole}
        onEdit={handleEdit}
      />
    </div>
  );
}
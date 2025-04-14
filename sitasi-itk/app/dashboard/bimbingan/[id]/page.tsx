'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useBimbinganDetail } from '@/hooks/useBimbingan';
import { BimbinganDetail } from '@/components/bimbingan/BimbinganDetail';
import { UserRole } from '@/types/auth';

export default function BimbinganDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<UserRole>('mahasiswa');
  const { data: bimbingan, isLoading, isError, error } = useBimbinganDetail(params.id);

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

  // Check access permissions
  const checkAccess = () => {
    if (!user || !bimbingan) return false;

    // Admin roles can access all
    if (userRole === 'koorpro' || userRole === 'tendik') {
      return true;
    }

    // Dosen can access if they are the supervisor
    if (userRole === 'dosen' && bimbingan.dosen === user.id) {
      return true;
    }

    // Mahasiswa can access their own consultations
    if (userRole === 'mahasiswa' && bimbingan.user_id === user.id) {
      return true;
    }

    return false;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center">
          <p className="text-gray-500">Memuat data bimbingan...</p>
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
            {error instanceof Error ? error.message : 'Gagal memuat data bimbingan'}
          </p>
        </div>
      </div>
    );
  }

  if (!bimbingan) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center py-12">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Tidak Ditemukan</h1>
          <p className="text-gray-500">
            Catatan bimbingan tidak ditemukan.
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
            Anda tidak memiliki akses untuk melihat catatan bimbingan ini.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Detail Bimbingan</h1>
      
      <BimbinganDetail
        bimbingan={bimbingan}
        userRole={userRole}
      />
    </div>
  );
}
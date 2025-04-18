'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSemproDetail, useRiwayatSempro } from '@/hooks/useSempro';
import { SemproDetail } from '@/components/sempro/SemproDetail';
import { UserRole } from '@/types/auth';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card';
import { SemproStatusBadge } from '@/components/sempro/SemproStatusBadge';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

// Komponen untuk menampilkan riwayat status sempro
function SemproHistory({ semproId }: { semproId: string }) {
  const { data: riwayat, isLoading, isError } = useRiwayatSempro(semproId);
  
  if (isLoading) {
    return <p className="text-sm text-gray-500">Memuat riwayat...</p>;
  }
  
  if (isError) {
    return <p className="text-sm text-red-500">Gagal memuat riwayat status</p>;
  }
  
  if (!riwayat || riwayat.length === 0) {
    return <p className="text-sm text-gray-500">Belum ada riwayat status</p>;
  }
  
  return (
    <div className="space-y-3">
      {riwayat.map((item, i) => (
        <div key={i} className="flex items-start p-3 bg-gray-50 rounded-md border border-gray-100">
          <div className="w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SemproStatusBadge status={item.status} />
                <span className="text-xs text-gray-500">
                  {format(new Date(item.created_at), 'dd MMMM yyyy, HH:mm', { locale: id })}
                </span>
              </div>
              {item.user?.name && (
                <span className="text-xs text-gray-500">oleh {item.user.name}</span>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-700">{item.keterangan}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SemproDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<UserRole>('mahasiswa');
  const { data: sempro, isLoading, isError, error } = useSemproDetail(params.id);

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
    if (!user || !sempro) return false;
    // Admin roles can access all
    if (userRole === 'koorpro' || userRole === 'tendik') {
      return true;
    }
    // Dosen can access if they are involved (TBD: penguji check)
    if (userRole === 'dosen') {
      // TODO: Add more specific checks if needed
      return true;
    }
    // Mahasiswa can access their own records
    if (userRole === 'mahasiswa' && sempro.user_id === user.id) {
      return true;
    }
    return false;
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
            Anda tidak memiliki akses untuk melihat data seminar proposal ini.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Detail Seminar Proposal</h1>
     
      {/* Detail Sempro */}
      <SemproDetail
        sempro={sempro}
        userRole={userRole}
      />
      
      {/* Riwayat Status */}
      <div className="mt-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Riwayat Status</CardTitle>
            <p className="text-sm text-gray-500">
              Riwayat perubahan status pada pendaftaran seminar proposal ini
            </p>
          </CardHeader>
          <CardContent>
            <SemproHistory semproId={params.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
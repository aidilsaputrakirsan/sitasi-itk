'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { JadwalSemproDetail } from '@/components/sempro/JadwalSemproDetail';
import { UserRole } from '@/types/auth';
import { supabase } from '@/lib/supabase';
import { JadwalSempro } from '@/types/sempro';

export default function JadwalSemproDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<UserRole>('mahasiswa');
  const [jadwal, setJadwal] = useState<JadwalSempro | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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

  // Fetch jadwal data
  useEffect(() => {
    const fetchJadwal = async () => {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('jadwal_sempros')
          .select(`
            *,
            pengajuan_ta:pengajuan_ta_id(judul, bidang_penelitian),
            penguji1:penguji_1(nama_dosen, nip, email),
            penguji2:penguji_2(nama_dosen, nip, email),
            sempro:sempro_id(id, status)
          `)
          .eq('id', params.id)
          .single();
        
        if (error) {
          console.error('Error fetching jadwal:', error);
          setIsError(true);
          setErrorMessage(error.message);
          return;
        }
        
        if (!data) {
          setIsError(true);
          setErrorMessage('Jadwal tidak ditemukan');
          return;
        }
        
        // Get mahasiswa data
        const { data: mahasiswaData, error: mahasiswaError } = await supabase
          .from('mahasiswas')
          .select('nama, nim, email, nomor_telepon')
          .eq('user_id', data.user_id)
          .single();
        
        if (mahasiswaError) {
          console.error('Error fetching mahasiswa data:', mahasiswaError);
        }
        
        // Map sempro data
        let semproData = null;
        if (data.pengajuan_ta_id && data.user_id) {
          const { data: semproResult, error: semproError } = await supabase
            .from('sempros')
            .select('*')
            .eq('pengajuan_ta_id', data.pengajuan_ta_id)
            .eq('user_id', data.user_id)
            .single();
            
          if (!semproError && semproResult) {
            semproData = semproResult;
          }
        }
        
        setJadwal({
          ...data,
          mahasiswa: mahasiswaError ? null : mahasiswaData,
          sempro: semproData || data.sempro
        } as JadwalSempro);
        
      } catch (error) {
        console.error('Unexpected error:', error);
        setIsError(true);
        setErrorMessage('Terjadi kesalahan saat memuat data jadwal');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (params.id) {
      fetchJadwal();
    }
  }, [params.id]);

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
            {errorMessage || 'Gagal memuat data jadwal seminar proposal'}
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
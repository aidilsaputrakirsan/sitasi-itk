// app/dashboard/pengajuan/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PengajuanTAList } from '@/components/pengajuan-ta/PengajuanTAList';
import { useStudentPengajuanTA, useSupervisorPengajuanTA, usePengajuanTAs } from '@/hooks/usePengajuanTA';
import { useMahasiswaByUserId } from '@/hooks/useMahasiswas';
import { useDosenByUserId } from '@/hooks/useDosens';
import { UserRole } from '@/types/auth';

export default function PengajuanPage() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<UserRole>('mahasiswa');
  const [mahasiswaId, setMahasiswaId] = useState<string>('');
  const [dosenId, setDosenId] = useState<string>('');
  
  // Fetch mahasiswa data if user is a student
  const { data: mahasiswaData } = useMahasiswaByUserId(
    user?.roles.includes('mahasiswa') ? user.id : ''
  );
  
  // Fetch dosen data if user is a lecturer
  const { data: dosenData } = useDosenByUserId(
    user?.roles.includes('dosen') ? user.id : ''
  );
  
  // Set mahasiswaId and dosenId when data is available
  useEffect(() => {
    if (mahasiswaData) {
      setMahasiswaId(mahasiswaData.id);
    }
    if (dosenData) {
      setDosenId(dosenData.id);
    }
  }, [mahasiswaData, dosenData]);
  
  // Set user role
  useEffect(() => {
    if (user?.roles.includes('koorpro')) {
      setUserRole('koorpro');
    } else if (user?.roles.includes('tendik')) {
      setUserRole('tendik');
    } else if (user?.roles.includes('dosen')) {
      setUserRole('dosen');
    } else {
      setUserRole('mahasiswa');
    }
  }, [user]);
  
  // Fetch pengajuan data based on user role
  const { data: studentPengajuan, isLoading: isLoadingStudentData } = useStudentPengajuanTA(
    userRole === 'mahasiswa' ? mahasiswaId : ''
  );
  
  const { data: supervisorPengajuan, isLoading: isLoadingSupervisorData } = useSupervisorPengajuanTA(
    userRole === 'dosen' ? dosenId : ''
  );
  
  const { data: allPengajuan, isLoading: isLoadingAllData } = usePengajuanTAs();
  
  // Determine which data to display based on user role
  const getPengajuanData = () => {
    if (userRole === 'mahasiswa') {
      return studentPengajuan || [];
    } else if (userRole === 'dosen') {
      return supervisorPengajuan || [];
    } else {
      return allPengajuan || [];
    }
  };
  
  const isLoading = () => {
    if (userRole === 'mahasiswa') {
      return isLoadingStudentData;
    } else if (userRole === 'dosen') {
      return isLoadingSupervisorData;
    } else {
      return isLoadingAllData;
    }
  };
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Pengajuan Tugas Akhir</h1>
        <p className="mt-1 text-sm text-gray-500">
          {userRole === 'mahasiswa' 
            ? 'Ajukan dan kelola proposal tugas akhir Anda'
            : userRole === 'dosen'
              ? 'Kelola proposal tugas akhir mahasiswa bimbingan Anda'
              : 'Kelola semua proposal tugas akhir mahasiswa'}
        </p>
      </div>
      
      <PengajuanTAList 
        pengajuanList={getPengajuanData()} 
        userRole={userRole}
        isLoading={isLoading()}
      />
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SemproList } from '@/components/sempro/SemproList';
import { useAllJadwalSempros } from '@/hooks/useSempro'; // Ubah ke hook baru
import { UserRole } from '@/types/auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { JadwalSempro } from '@/types/sempro';

export default function JadwalSemproPage() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<UserRole>('mahasiswa');
  
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
  
  // Gunakan hook baru untuk data jadwal
  const { data: jadwalData, isLoading } = useAllJadwalSempros();
  
  // Tambahkan filter untuk jadwal berdasarkan peran
  let filteredJadwalData = jadwalData || [];

  // Filter for dosen: only show jadwal where they are penguji
  if (userRole === 'dosen' && user) {
    filteredJadwalData = filteredJadwalData.filter(j => 
      j.penguji_1 === user.id || j.penguji_2 === user.id
    );
  }

  // Filter for mahasiswa: only show published jadwal or their own jadwal
  if (userRole === 'mahasiswa' && user) {
    filteredJadwalData = filteredJadwalData.filter(j => 
      j.is_published || j.user_id === user.id
    );
  }
  
  // For filtering (mostly for dosen view to only see future jadwal)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Filter future and past jadwal menggunakan filteredJadwalData
  const futureJadwal = filteredJadwalData
    .filter(j => {
      const seminarDate = new Date(j.tanggal_sempro);
      seminarDate.setHours(0, 0, 0, 0);
      return seminarDate >= today;
    });
    
  const pastJadwal = filteredJadwalData
    .filter(j => {
      const seminarDate = new Date(j.tanggal_sempro);
      seminarDate.setHours(0, 0, 0, 0);
      return seminarDate < today;
    });
  
  // Determine if we have data to show
  const hasData = filteredJadwalData.length > 0;
  
  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Jadwal Seminar Proposal</h1>
          <p className="text-sm text-gray-500 mt-1">
            {userRole === 'dosen' 
              ? 'Daftar jadwal seminar proposal dimana Anda terlibat sebagai penguji' 
              : userRole === 'mahasiswa'
                ? 'Jadwal seminar proposal yang tersedia'
                : 'Kelola jadwal seminar proposal'}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/sempro">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Link>
        </Button>
      </div>
      
      {/* Future Jadwal Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Jadwal Mendatang</CardTitle>
        </CardHeader>
        <CardContent>
          <SemproList 
            semproList={futureJadwal} 
            userRole={userRole}
            isLoading={isLoading}
            isJadwalView={true}
          />
        </CardContent>
      </Card>
      
      {/* Past Jadwal Section */}
      {pastJadwal.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Jadwal Sebelumnya</CardTitle>
          </CardHeader>
          <CardContent>
            <SemproList 
              semproList={pastJadwal} 
              userRole={userRole}
              isLoading={isLoading}
              isJadwalView={true}
            />
          </CardContent>
        </Card>
      )}
      
      {/* Message if no data available */}
      {!isLoading && !hasData && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-gray-500 mb-4">
                {userRole === 'dosen' 
                  ? 'Anda belum dijadwalkan sebagai penguji seminar proposal.'
                  : userRole === 'mahasiswa'
                    ? 'Belum ada jadwal seminar proposal yang tersedia.'
                    : 'Belum ada jadwal seminar proposal yang dibuat.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
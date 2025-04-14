'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PengajuanTAList } from '@/components/pengajuan-ta/PengajuanTAList';
import { 
  useConsolidatedPengajuanTA, 
  useMahasiswaPengajuanTA  // Gunakan hook baru
} from '@/hooks/usePengajuanTA';
import { UserRole } from '@/types/auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PengajuanPage() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<UserRole>('mahasiswa');
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  
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
  
  // Gunakan hook yang berbeda berdasarkan peran pengguna
  const { data: adminDosenData, isLoading: isLoadingAdminDosen } = useConsolidatedPengajuanTA(
    userRole === 'mahasiswa' ? '' : userRole, 
    user?.id || ''
  );
  
  // Khusus untuk mahasiswa, gunakan hook baru yang lebih sederhana & langsung
  const { data: mahasiswaData, isLoading: isLoadingMahasiswa } = useMahasiswaPengajuanTA(
    userRole === 'mahasiswa' ? user?.id || '' : ''
  );
  
  // Kombinasikan data sesuai peran
  const pengajuanData = userRole === 'mahasiswa' ? mahasiswaData : adminDosenData;
  const isLoading = userRole === 'mahasiswa' ? isLoadingMahasiswa : isLoadingAdminDosen;
  
  // Untuk dosen view, filter proposals based on their status
  const pendingProposals = userRole === 'dosen' 
    ? pengajuanData?.filter(p => 
        (p.pembimbing_1 === user?.id && !p.approve_pembimbing1) || 
        (p.pembimbing_2 === user?.id && !p.approve_pembimbing2)
      ) || []
    : [];
  
  const approvedProposals = userRole === 'dosen' 
    ? pengajuanData?.filter(p => 
        (p.pembimbing_1 === user?.id && p.approve_pembimbing1) || 
        (p.pembimbing_2 === user?.id && p.approve_pembimbing2)
      ) || []
    : [];
  
  const toggleDebugInfo = () => {
    setShowDebugInfo(!showDebugInfo);
  };
  
  // Untuk debugging di konsol
  useEffect(() => {
    if (pengajuanData) {
      console.log(`Ditemukan ${pengajuanData.length} pengajuan untuk ${userRole}`);
    }
  }, [pengajuanData, userRole]);
  
  return (
    <div>
      {/* Header for mahasiswa */}
      {userRole === 'mahasiswa' && (
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Pengajuan Tugas Akhir</h1>
        </div>
      )}
      
      {/* Dosen Specific View with Tabs */}
      {userRole === 'dosen' && (
        <Tabs defaultValue="pending" className="w-full">
          <div className="mb-4 flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-900">Pengajuan Tugas Akhir Mahasiswa</h1>
            <TabsList>
              <TabsTrigger value="pending">Menunggu Persetujuan</TabsTrigger>
              <TabsTrigger value="approved">Telah Disetujui</TabsTrigger>
              <TabsTrigger value="all">Semua</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pengajuan Menunggu Persetujuan</CardTitle>
              </CardHeader>
              <CardContent>
                <PengajuanTAList 
                  pengajuanList={pendingProposals} 
                  userRole={userRole}
                  isLoading={isLoading} 
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="approved">
            <Card>
              <CardHeader>
                <CardTitle>Pengajuan Telah Disetujui</CardTitle>
              </CardHeader>
              <CardContent>
                <PengajuanTAList 
                  pengajuanList={approvedProposals} 
                  userRole={userRole}
                  isLoading={isLoading} 
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>Semua Pengajuan</CardTitle>
              </CardHeader>
              <CardContent>
                <PengajuanTAList 
                  pengajuanList={pengajuanData || []} 
                  userRole={userRole}
                  isLoading={isLoading} 
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
      
      {/* Admin header */}
      {(userRole === 'tendik' || userRole === 'koorpro') && (
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Pengajuan Tugas Akhir</h1>
          <p className="mt-1 text-sm text-gray-500">
            Kelola pengajuan tugas akhir mahasiswa
          </p>
        </div>
      )}
      
      {/* Mahasiswa Content */}
      {userRole === 'mahasiswa' && (
        <>
          <div className="flex justify-end mb-4">
            <Button asChild>
              <Link href="/dashboard/pengajuan/create">
                <PlusCircle className="h-4 w-4 mr-2" />
                Ajukan Tugas Akhir
              </Link>
            </Button>
          </div>
          
          <PengajuanTAList 
            pengajuanList={pengajuanData || []} 
            userRole={userRole}
            isLoading={isLoading} 
          />
          
          {/* Debug button - only in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 text-right">
              <button 
                onClick={toggleDebugInfo} 
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                {showDebugInfo ? 'Hide Debug Info' : 'Show Debug Info'}
              </button>
            </div>
          )}
          
          {/* Debug information */}
          {showDebugInfo && (
            <div className="mt-2 p-4 bg-gray-100 rounded-md text-xs font-mono">
              <div>User ID: {user?.id || 'Not set'}</div>
              <div>User Roles: {user?.roles?.join(', ') || 'None'}</div>
              <div>Data Count: {pengajuanData?.length || 0}</div>
            </div>
          )}
        </>
      )}
      
      {/* Admin Content */}
      {(userRole === 'tendik' || userRole === 'koorpro') && (
        <PengajuanTAList 
          pengajuanList={pengajuanData || []} 
          userRole={userRole}
          isLoading={isLoading} 
        />
      )}
    </div>
  );
}
// app/dashboard/pengajuan/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PengajuanTAList } from '@/components/pengajuan-ta/PengajuanTAList';
import { 
  useStudentPengajuanTA, 
  useSupervisorPengajuanTA, 
  usePengajuanTAs,
  usePengajuanTAByStudentUserId 
} from '@/hooks/usePengajuanTA';
import { useMahasiswaByUserId } from '@/hooks/useMahasiswas';
import { useDosenByUserId } from '@/hooks/useDosens';
import { UserRole } from '@/types/auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';

export default function PengajuanPage() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<UserRole>('mahasiswa');
  const [mahasiswaId, setMahasiswaId] = useState<string>('');
  const [dosenId, setDosenId] = useState<string>('');
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  
  // Fetch data by user ID directly (untuk mahasiswa)
  const { data: pengajuanByUserId } = usePengajuanTAByStudentUserId(user?.id || '');
  
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
    async function fetchData() {
      console.log("Fetching data for current user:", user);
      
      if (user?.roles.includes('mahasiswa')) {
        try {
          // Direct query for mahasiswa data
          const { data, error } = await supabase
            .from('mahasiswas')
            .select('id')
            .eq('user_id', user.id)
            .single();
            
          if (error) {
            console.error("Error fetching mahasiswa:", error);
          } else if (data) {
            console.log("Found mahasiswa record:", data);
            setMahasiswaId(data.id);
          }
        } catch (err) {
          console.error("Error in mahasiswa data fetch:", err);
        }
      }
      
      if (user?.roles.includes('dosen')) {
        try {
          // Direct query for dosen data
          const { data, error } = await supabase
            .from('dosens')
            .select('id')
            .eq('user_id', user.id)
            .single();
            
          if (error) {
            console.error("Error fetching dosen:", error);
          } else if (data) {
            console.log("Found dosen record:", data);
            setDosenId(data.id);
          }
        } catch (err) {
          console.error("Error in dosen data fetch:", err);
        }
      }
    }
    
    if (user) {
      fetchData();
    }
  }, [user, mahasiswaData, dosenData]);
  
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
  
  // Filter proposals based on their status for dosen view
  const pendingProposals = supervisorPengajuan?.filter(p => 
    (p.pembimbing_1 === user?.id && !p.approve_pembimbing1) || 
    (p.pembimbing_2 === user?.id && !p.approve_pembimbing2)
  ) || [];
  
  const approvedProposals = supervisorPengajuan?.filter(p => 
    (p.pembimbing_1 === user?.id && p.approve_pembimbing1) || 
    (p.pembimbing_2 === user?.id && p.approve_pembimbing2)
  ) || [];
  
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
  
  const toggleDebugInfo = () => {
    setShowDebugInfo(!showDebugInfo);
  };
  
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
                  isLoading={isLoading()} 
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
                  isLoading={isLoading()} 
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
                  pengajuanList={getPengajuanData()} 
                  userRole={userRole}
                  isLoading={isLoading()} 
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
            pengajuanList={pengajuanByUserId || []} 
            userRole={userRole}
            isLoading={isLoading()} 
          />
          
          {/* Debug button */}
          <div className="mt-8 text-right">
            <button 
              onClick={toggleDebugInfo} 
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              {showDebugInfo ? 'Hide Debug Info' : 'Show Debug Info'}
            </button>
          </div>
          
          {/* Debug information */}
          {showDebugInfo && (
            <div className="mt-2 p-4 bg-gray-100 rounded-md text-xs font-mono">
              <div>User ID: {user?.id || 'Not set'}</div>
              <div>User Roles: {user?.roles?.join(', ') || 'None'}</div>
              <div>Mahasiswa ID: {mahasiswaId || 'Not set'}</div>
              <div>Data Count from mahasiswaId: {studentPengajuan?.length || 0}</div>
              <div>Data Count from userId: {pengajuanByUserId?.length || 0}</div>
            </div>
          )}
        </>
      )}
      
      {/* Admin Content */}
      {(userRole === 'tendik' || userRole === 'koorpro') && (
        <PengajuanTAList 
          pengajuanList={getPengajuanData()} 
          userRole={userRole}
          isLoading={isLoading()} 
        />
      )}
    </div>
  );
}
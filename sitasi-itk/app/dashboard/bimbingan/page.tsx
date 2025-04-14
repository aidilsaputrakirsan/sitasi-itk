'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { BimbinganList } from '@/components/bimbingan/BimbinganList';
import { useRoleBasedBimbingans } from '@/hooks/useBimbingan';
import { UserRole } from '@/types/auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function BimbinganPage() {
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
  
  // Get bimbingan data based on role
  const { data: bimbinganData, isLoading } = useRoleBasedBimbingans();
  
  // For dosen view, filter bimbingans based on their status
  const pendingBimbingans = userRole === 'dosen' 
    ? bimbinganData?.filter(b => b.status === 'pending') || []
    : [];
  
  const approvedBimbingans = userRole === 'dosen' 
    ? bimbinganData?.filter(b => b.status === 'approved') || []
    : [];
    
  const rejectedBimbingans = userRole === 'dosen' 
    ? bimbinganData?.filter(b => b.status === 'rejected') || []
    : [];
  
  const toggleDebugInfo = () => {
    setShowDebugInfo(!showDebugInfo);
  };
  
  // For debugging
  useEffect(() => {
    if (bimbinganData) {
      console.log(`Found ${bimbinganData.length} consultation records for ${userRole}`);
    }
  }, [bimbinganData, userRole]);
  
  return (
    <div>
      {/* Header for mahasiswa */}
      {userRole === 'mahasiswa' && (
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Bimbingan Tugas Akhir</h1>
        </div>
      )}
      
      {/* Dosen Specific View with Tabs */}
      {userRole === 'dosen' && (
        <Tabs defaultValue="pending" className="w-full">
          <div className="mb-4 flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-900">Bimbingan Mahasiswa</h1>
            <TabsList>
              <TabsTrigger value="pending">Menunggu Persetujuan</TabsTrigger>
              <TabsTrigger value="approved">Disetujui</TabsTrigger>
              <TabsTrigger value="rejected">Ditolak</TabsTrigger>
              <TabsTrigger value="all">Semua</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Bimbingan Menunggu Persetujuan</CardTitle>
              </CardHeader>
              <CardContent>
                <BimbinganList 
                  bimbinganList={pendingBimbingans} 
                  userRole={userRole}
                  isLoading={isLoading} 
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="approved">
            <Card>
              <CardHeader>
                <CardTitle>Bimbingan Disetujui</CardTitle>
              </CardHeader>
              <CardContent>
                <BimbinganList 
                  bimbinganList={approvedBimbingans} 
                  userRole={userRole}
                  isLoading={isLoading} 
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="rejected">
            <Card>
              <CardHeader>
                <CardTitle>Bimbingan Ditolak</CardTitle>
              </CardHeader>
              <CardContent>
                <BimbinganList 
                  bimbinganList={rejectedBimbingans} 
                  userRole={userRole}
                  isLoading={isLoading} 
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>Semua Bimbingan</CardTitle>
              </CardHeader>
              <CardContent>
                <BimbinganList 
                  bimbinganList={bimbinganData || []} 
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
          <h1 className="text-2xl font-semibold text-gray-900">Bimbingan Tugas Akhir</h1>
          <p className="mt-1 text-sm text-gray-500">
            Kelola catatan bimbingan tugas akhir mahasiswa
          </p>
        </div>
      )}
      
      {/* Mahasiswa Content */}
      {userRole === 'mahasiswa' && (
        <>
          <div className="flex justify-end mb-4">
            <Button asChild>
              <Link href="/dashboard/bimbingan/create">
                <PlusCircle className="h-4 w-4 mr-2" />
                Catat Bimbingan Baru
              </Link>
            </Button>
          </div>
          
          <BimbinganList 
            bimbinganList={bimbinganData || []} 
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
              <div>Data Count: {bimbinganData?.length || 0}</div>
            </div>
          )}
        </>
      )}
      
      {/* Admin Content */}
      {(userRole === 'tendik' || userRole === 'koorpro') && (
        <BimbinganList 
          bimbinganList={bimbinganData || []} 
          userRole={userRole}
          isLoading={isLoading} 
        />
      )}
    </div>
  );
}
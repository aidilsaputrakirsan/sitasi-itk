'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SemproList } from '@/components/sempro/SemproList';
import { useRoleBasedSempros, useActivePeriodeSempros } from '@/hooks/useSempro';
import { UserRole } from '@/types/auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, Calendar, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sempro, StatusSempro } from '@/types/sempro';

export default function SemproPage() {
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
  
  // Get sempro data based on role
  const { data: semproData, isLoading } = useRoleBasedSempros();
  const { data: activePeriodes, isLoading: isLoadingPeriodes } = useActivePeriodeSempros();
  
  // For filtering data by status
  const isActivePeriodeAvailable = !isLoadingPeriodes && activePeriodes && activePeriodes.length > 0;
  
  // For admin view, filter sempros based on their status
  // Filter for "Terdaftar" - only real registered status without rejected ones
  const registeredSempros = userRole !== 'dosen' 
    ? (semproData as Sempro[] || []).filter(s => 
        s.status === 'registered')
    : [];
  
  // Filter for "Terverifikasi" - both 'verified' (frontend) and 'evaluated' (database)
  const verifiedSempros = userRole !== 'dosen' 
    ? (semproData as Sempro[] || []).filter(s => 
        s.status === 'verified' || s.status === 'evaluated')
    : [];
    
  // Filter for "Terjadwal"
  const scheduledSempros = userRole !== 'dosen' 
    ? (semproData as Sempro[] || []).filter(s => s.status === 'scheduled')
    : [];
    
  // Filter for "Selesai"
  const completedSempros = userRole !== 'dosen' 
    ? (semproData as Sempro[] || []).filter(s => s.status === 'completed')
    : [];
    
  // Filter for "Revisi"
  const revisionSempros = userRole !== 'dosen' 
    ? (semproData as Sempro[] || []).filter(s => s.status === 'revision_required')
    : [];
    
  // Filter for "Ditolak" - sempros marked as 'rejected' in UI 
  // Catatan: dalam implementasi aktual, status 'rejected' tidak disimpan di database
  // Penolakan biasanya ditandai dengan catatan DITOLAK dalam riwayat
  const rejectedSempros = userRole !== 'dosen' 
    ? (semproData as Sempro[] || []).filter(s => s.status === 'rejected')
    : [];
  
  const toggleDebugInfo = () => {
    setShowDebugInfo(!showDebugInfo);
  };
  
  // For debugging
  useEffect(() => {
    if (semproData) {
      console.log(`Found ${semproData.length} sempro records for ${userRole}`);
    }
  }, [semproData, userRole]);
  
  return (
    <div>
      {/* Header for mahasiswa */}
      {userRole === 'mahasiswa' && (
        <div className="mb-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Seminar Proposal</h1>
            {!isLoadingPeriodes && (
              <p className="text-sm text-gray-500 mt-1">
                {isActivePeriodeAvailable 
                  ? `Periode pendaftaran aktif: ${activePeriodes[0].nama_periode}`
                  : 'Tidak ada periode pendaftaran yang aktif saat ini'}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/sempro/jadwal">
                <Calendar className="h-4 w-4 mr-2" />
                Jadwal Seminar
              </Link>
            </Button>
            <Button asChild disabled={!isActivePeriodeAvailable}>
              <Link href="/dashboard/sempro/register">
                <PlusCircle className="h-4 w-4 mr-2" />
                Daftar Seminar
              </Link>
            </Button>
          </div>
        </div>
      )}
      
      {/* Dosen Specific View with Tabs */}
      {userRole === 'dosen' && (
        <div className="mb-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Seminar Proposal</h1>
            <p className="text-sm text-gray-500 mt-1">
              Daftar seminar proposal di mana Anda terlibat sebagai penguji
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/sempro/jadwal">
              <Calendar className="h-4 w-4 mr-2" />
              Jadwal Seminar
            </Link>
          </Button>
        </div>
      )}
      
      {/* Admin View with Tabs */}
      {(userRole === 'tendik' || userRole === 'koorpro') && (
        <Tabs defaultValue="registered" className="w-full">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Seminar Proposal</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Kelola pendaftaran dan jadwal seminar proposal
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href="/dashboard/sempro/jadwal">
                    <Calendar className="h-4 w-4 mr-2" />
                    Jadwal Seminar
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/sempro/periode">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Kelola Periode
                  </Link>
                </Button>
              </div>
            </div>
            
            <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
              <TabsTrigger value="registered">
                Terdaftar ({registeredSempros.length})
              </TabsTrigger>
              <TabsTrigger value="verified">
                Terverifikasi ({verifiedSempros.length})
              </TabsTrigger>
              <TabsTrigger value="scheduled">
                Terjadwal ({scheduledSempros.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Selesai ({completedSempros.length})
              </TabsTrigger>
              <TabsTrigger value="revision">
                Revisi ({revisionSempros.length})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Ditolak ({rejectedSempros.length})
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="registered">
            <Card>
              <CardHeader>
                <CardTitle>Pendaftaran Terdaftar</CardTitle>
              </CardHeader>
              <CardContent>
                <SemproList 
                  semproList={registeredSempros} 
                  userRole={userRole}
                  isLoading={isLoading} 
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="verified">
            <Card>
              <CardHeader>
                <CardTitle>Pendaftaran Terverifikasi</CardTitle>
              </CardHeader>
              <CardContent>
                <SemproList 
                  semproList={verifiedSempros} 
                  userRole={userRole}
                  isLoading={isLoading} 
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="scheduled">
            <Card>
              <CardHeader>
                <CardTitle>Seminar Terjadwal</CardTitle>
              </CardHeader>
              <CardContent>
                <SemproList 
                  semproList={scheduledSempros} 
                  userRole={userRole}
                  isLoading={isLoading} 
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="completed">
            <Card>
              <CardHeader>
                <CardTitle>Seminar Selesai</CardTitle>
              </CardHeader>
              <CardContent>
                <SemproList 
                  semproList={completedSempros} 
                  userRole={userRole}
                  isLoading={isLoading} 
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="revision">
            <Card>
              <CardHeader>
                <CardTitle>Perlu Revisi</CardTitle>
              </CardHeader>
              <CardContent>
                <SemproList 
                  semproList={revisionSempros} 
                  userRole={userRole}
                  isLoading={isLoading} 
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="rejected">
            <Card>
              <CardHeader>
                <CardTitle>Pendaftaran Ditolak</CardTitle>
              </CardHeader>
              <CardContent>
                <SemproList 
                  semproList={rejectedSempros} 
                  userRole={userRole}
                  isLoading={isLoading} 
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
      
      {/* Mahasiswa Content (not in Tabs) */}
      {userRole === 'mahasiswa' && (
        <>
          <SemproList 
            semproList={semproData || []} 
            userRole={userRole}
            isLoading={isLoading}
            showRejectionDetail={true}
          />
          
          {/* Period notice */}
          {!isLoadingPeriodes && !isActivePeriodeAvailable && (semproData || []).length === 0 && (
            <Card className="mt-4">
              <CardContent className="p-6">
                <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-amber-800">
                  <h3 className="font-medium">Periode Pendaftaran</h3>
                  <p className="text-sm mt-1">
                    Tidak ada periode pendaftaran seminar proposal yang aktif saat ini. 
                    Silakan tunggu hingga periode pendaftaran dibuka.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          
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
              <div>Data Count: {semproData?.length || 0}</div>
              <div>Active Period: {isActivePeriodeAvailable ? activePeriodes[0].nama_periode : 'None'}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
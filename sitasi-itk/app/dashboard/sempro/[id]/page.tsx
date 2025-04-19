'use client';

import React, { useState, useEffect } from 'react';
import { useSemproDetail, useJadwalSempro, usePenilaianSempro, useRiwayatSempro } from '@/hooks/useSempro';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SemproStatusBadge } from '@/components/sempro/SemproStatusBadge';
import { Badge } from "@/components/ui/badge";
import { SemproApprovalCard } from '@/components/sempro/SemproApprovalCard';
import { useRouter } from 'next/navigation';
import { SemproDetail } from '@/components/sempro/SemproDetail';
import { UserRole } from '@/types/auth';
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
  const { data: jadwalSempro } = useJadwalSempro(
    sempro?.pengajuan_ta_id || '', 
    sempro?.user_id || ''
  );
  const { data: penilaianList } = usePenilaianSempro(params.id);
  
  // Additional state for dosen roles
  const [isPembimbing1, setIsPembimbing1] = useState(false);
  const [isPembimbing2, setIsPembimbing2] = useState(false);
  const [isPenguji1, setIsPenguji1] = useState(false);
  const [isPenguji2, setIsPenguji2] = useState(false);
  
  // Calculate average score
  const [averageScore, setAverageScore] = useState<number | null>(null);
  
  // Set user role and check role-specific permissions
  useEffect(() => {
    if (!user) return;
    
    // Set basic role
    if (user.roles.includes('koorpro')) {
      setUserRole('koorpro');
    } else if (user.roles.includes('tendik')) {
      setUserRole('tendik');
    } else if (user.roles.includes('dosen')) {
      setUserRole('dosen');
    } else {
      setUserRole('mahasiswa');
    }
    
    // Check dosen specific roles if sempro exists
    if (sempro && user.roles.includes('dosen')) {
      // Check pembimbing roles
      setIsPembimbing1(sempro.pengajuan_ta?.pembimbing_1 === user.id);
      setIsPembimbing2(sempro.pengajuan_ta?.pembimbing_2 === user.id);
      
      // Check penguji roles
      if (jadwalSempro) {
        setIsPenguji1(jadwalSempro.penguji_1 === user.id);
        setIsPenguji2(jadwalSempro.penguji_2 === user.id);
      }
    }
  }, [user, sempro, jadwalSempro]);
  
  // Calculate average score whenever penilaian list changes
  useEffect(() => {
    if (penilaianList && penilaianList.length > 0) {
      const totalScore = penilaianList.reduce((sum, penilaian) => {
        return sum + (penilaian.nilai_total || 0);
      }, 0);
      
      setAverageScore(totalScore / penilaianList.length);
    }
  }, [penilaianList]);
  
  // Check if current user has already submitted penilaian
  const userPenilaian = penilaianList?.find(p => p.user_id === user?.id);
  const isPenilaianSubmitted = !!userPenilaian;
  
  // Check access permissions
  const checkAccess = () => {
    if (!user || !sempro) return false;
    // Admin roles can access all
    if (userRole === 'koorpro' || userRole === 'tendik') {
      return true;
    }
    // Dosen can access if they are involved
    if (userRole === 'dosen') {
      if (isPembimbing1 || isPembimbing2) return true;
      if (isPenguji1 || isPenguji2) return true;
      return false;
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
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header and Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Detail Seminar Proposal</h1>
          <p className="text-gray-500">{sempro.mahasiswa?.nama} ({sempro.mahasiswa?.nim})</p>
        </div>
        <SemproStatusBadge status={sempro.status} className="h-8 px-4 text-sm" />
      </div>
      
      {/* Detail Sempro - Using existing component */}
      <SemproDetail sempro={sempro} userRole={userRole} />
      
      {/* Jadwal Sempro Card - if exists */}
      {jadwalSempro && (
        <Card>
          <CardHeader>
            <CardTitle>Jadwal Seminar Proposal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-500">Tanggal</h3>
                <p>{new Date(jadwalSempro.tanggal_sempro).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-500">Waktu</h3>
                <p>{jadwalSempro.waktu_mulai} - {jadwalSempro.waktu_selesai}</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-500">Ruangan</h3>
                <p>{jadwalSempro.ruangan}</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-500">Status Publikasi</h3>
                <p>{jadwalSempro.is_published ? 'Terpublikasi' : 'Belum dipublikasikan'}</p>
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-500">Penguji 1</h3>
                <p>{jadwalSempro.penguji1?.nama_dosen || '-'}</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-500">Penguji 2</h3>
                <p>{jadwalSempro.penguji2?.nama_dosen || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Evaluations Card - Only show if evaluations exist */}
      {penilaianList && penilaianList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Penilaian Seminar</CardTitle>
            {averageScore !== null && (
              <CardDescription>
                Nilai Rata-rata: <span className="font-bold text-blue-600">{averageScore.toFixed(1)}</span>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {penilaianList.map((penilaian, index) => (
                <div key={index} className="border rounded-md p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">{penilaian.dosen?.nama_dosen || 'Dosen'}</h3>
                    <Badge variant="outline" className="font-bold">
                      Nilai: {penilaian.nilai_total?.toFixed(1)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 mb-3 text-sm">
                    <div>
                      <span className="text-gray-500">Media Presentasi:</span>{' '}
                      <span className="font-medium">{penilaian.media_presentasi}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Komunikasi:</span>{' '}
                      <span className="font-medium">{penilaian.komunikasi}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Penguasaan Materi:</span>{' '}
                      <span className="font-medium">{penilaian.penguasaan_materi}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Isi Laporan:</span>{' '}
                      <span className="font-medium">{penilaian.isi_laporan_ta}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Struktur Penulisan:</span>{' '}
                      <span className="font-medium">{penilaian.struktur_penulisan}</span>
                    </div>
                  </div>
                  
                  {penilaian.catatan && (
                    <div className="mt-2 text-sm">
                      <h4 className="font-medium text-gray-600">Catatan:</h4>
                      <p className="text-gray-700 mt-1">{penilaian.catatan}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Revision Notes Card */}
      {(sempro.revisi_pembimbing_1 || sempro.revisi_pembimbing_2 || 
        sempro.revisi_penguji_1 || sempro.revisi_penguji_2) && (
        <Card>
          <CardHeader>
            <CardTitle>Catatan Revisi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sempro.revisi_pembimbing_1 && (
                <div className="border-l-4 border-blue-500 pl-4 py-2">
                  <h3 className="font-medium text-blue-700">Pembimbing 1</h3>
                  <p className="mt-1 text-gray-700 whitespace-pre-line">{sempro.revisi_pembimbing_1}</p>
                </div>
              )}
              
              {sempro.revisi_pembimbing_2 && (
                <div className="border-l-4 border-green-500 pl-4 py-2">
                  <h3 className="font-medium text-green-700">Pembimbing 2</h3>
                  <p className="mt-1 text-gray-700 whitespace-pre-line">{sempro.revisi_pembimbing_2}</p>
                </div>
              )}
              
              {sempro.revisi_penguji_1 && (
                <div className="border-l-4 border-purple-500 pl-4 py-2">
                  <h3 className="font-medium text-purple-700">Penguji 1</h3>
                  <p className="mt-1 text-gray-700 whitespace-pre-line">{sempro.revisi_penguji_1}</p>
                </div>
              )}
              
              {sempro.revisi_penguji_2 && (
                <div className="border-l-4 border-orange-500 pl-4 py-2">
                  <h3 className="font-medium text-orange-700">Penguji 2</h3>
                  <p className="mt-1 text-gray-700 whitespace-pre-line">{sempro.revisi_penguji_2}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Riwayat Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Riwayat Status</CardTitle>
          <CardDescription>
            Riwayat perubahan status pada pendaftaran seminar proposal ini
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SemproHistory semproId={params.id} />
        </CardContent>
      </Card>
      
      {/* Approval Cards - Only show for pembimbing */}
      {isPembimbing1 && (
        <SemproApprovalCard 
          sempro={sempro} 
          isPembimbing1={true}
          isPembimbing2={false}
        />
      )}
      
      {isPembimbing2 && (
        <SemproApprovalCard 
          sempro={sempro} 
          isPembimbing1={false}
          isPembimbing2={true}
        />
      )}
      
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {/* Back button */}
        <Button 
          variant="outline" 
          onClick={() => router.push('/dashboard/sempro')}
        >
          Kembali
        </Button>
        
        {/* Penilaian Button - For penguji */}
        {(isPenguji1 || isPenguji2) && 
         sempro.status === 'scheduled' && 
         !isPenilaianSubmitted && (
          <Button
            onClick={() => router.push(`/dashboard/sempro/penilaian/${sempro.id}`)}
          >
            Berikan Penilaian
          </Button>
        )}
        
        {/* View Penilaian - For penguji who submitted */}
        {(isPenguji1 || isPenguji2) && 
         isPenilaianSubmitted && (
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/sempro/penilaian/${sempro.id}`)}
          >
            Lihat Penilaian
          </Button>
        )}
        
        {/* Request Revision - For pembimbing and penguji */}
        {(isPembimbing1 || isPembimbing2 || isPenguji1 || isPenguji2) && (
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/sempro/request-revision/${sempro.id}`)}
          >
            Minta Revisi
          </Button>
        )}
        
        {/* Submit Revision - For mahasiswa */}
        {userRole === 'mahasiswa' && 
         sempro.user_id === user?.id &&
         sempro.status === 'revision_required' && (
          <Button
            onClick={() => router.push(`/dashboard/sempro/revision-submit/${sempro.id}`)}
          >
            Submit Revisi
          </Button>
        )}
      </div>
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { SemproRevisionRequestForm } from '@/components/sempro/SemproRevisionRequestForm';
import { useSemproDetail, useJadwalSempro } from '@/hooks/useSempro';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from 'next/navigation';

export default function SemproRevisionRequestPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const { data: sempro, isLoading: semproLoading } = useSemproDetail(params.id);
  const { data: jadwalSempro } = useJadwalSempro(
    sempro?.pengajuan_ta_id || '', 
    sempro?.user_id || ''
  );
  
  const [isPembimbing, setIsPembimbing] = useState(false);
  const [userId, setUserId] = useState('');
  const router = useRouter();
  
  useEffect(() => {
    if (sempro && user) {
      // Check if the current user is pembimbing 1 or 2
      const isPembimbing1 = sempro.pengajuan_ta?.pembimbing_1 === user.id;
      const isPembimbing2 = sempro.pengajuan_ta?.pembimbing_2 === user.id;
      
      setIsPembimbing(isPembimbing1 || isPembimbing2);
      setUserId(sempro.user_id);
    }
  }, [sempro, user]);
  
  if (!user) {
    return (
      <div className="py-10 text-center">
        <p>Silakan login untuk mengakses halaman ini</p>
      </div>
    );
  }
  
  if (semproLoading) {
    return <div className="py-10 text-center">Memuat data...</div>;
  }
  
  if (!sempro) {
    return (
      <div className="py-10 text-center text-red-500">
        Seminar proposal tidak ditemukan
      </div>
    );
  }
  
  // Check if user has permission to request revision
  const userIsValid = isPembimbing || 
    (jadwalSempro && (jadwalSempro.penguji_1 === user.id || jadwalSempro.penguji_2 === user.id));
     
  if (!userIsValid) {
    return (
      <div className="py-10">
        <Card>
          <CardHeader>
            <CardTitle>Tidak Dapat Meminta Revisi</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Anda tidak memiliki akses untuk meminta revisi seminar proposal ini.</p>
            <p className="mt-2">Hanya pembimbing dan penguji yang dapat meminta revisi.</p>
            <div className="mt-4">
              <button 
                className="text-blue-600 hover:underline"
                onClick={() => router.push('/dashboard/sempro')}
              >
                Kembali ke Daftar Sempro
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Permintaan Revisi Sempro</h1>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Detail Seminar Proposal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-500">Judul</h3>
              <p>{sempro.pengajuan_ta?.judul || '-'}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-500">Mahasiswa</h3>
              <p>{sempro.mahasiswa?.nama || '-'} ({sempro.mahasiswa?.nim || '-'})</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-500">Bidang Penelitian</h3>
              <p>{sempro.pengajuan_ta?.bidang_penelitian || '-'}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-500">Status</h3>
              <p>{sempro.status}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <SemproRevisionRequestForm 
        semproId={params.id}
        userId={userId}
        isPembimbing={isPembimbing}
      />
    </div>
  );
}
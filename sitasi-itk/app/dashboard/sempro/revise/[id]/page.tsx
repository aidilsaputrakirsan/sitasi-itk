// app/dashboard/sempro/revise/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { SemproRevisionRequestForm } from '@/components/sempro/SemproRevisionRequestForm';
import { useSemproDetail, useJadwalSemproDetail } from '@/hooks/useSempro';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SemproReviseRequestPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const { data: sempro, isLoading: semproLoading } = useSemproDetail(params.id);
  const [isPembimbing, setIsPembimbing] = useState(false);
  const [userId, setUserId] = useState('');
  
  useEffect(() => {
    if (sempro && user) {
      // Check if the current user is pembimbing 1 or 2
      const isPembimbing1 = sempro.pengajuan_ta?.pembimbing_1 === user.id;
      const isPembimbing2 = sempro.pengajuan_ta?.pembimbing_2 === user.id;
      
      setIsPembimbing(isPembimbing1 || isPembimbing2);
      setUserId(sempro.user_id);
    }
  }, [sempro, user]);
  
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-500">Judul</h3>
              <p>{sempro.pengajuan_ta?.judul || '-'}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-500">Mahasiswa</h3>
              <p>{sempro.mahasiswa?.nama || '-'} ({sempro.mahasiswa?.nim || '-'})</p>
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
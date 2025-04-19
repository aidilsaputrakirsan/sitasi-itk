'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSemproDetail } from '@/hooks/useSempro';
import { SemproRevisionSubmitForm } from '@/components/sempro/SemproRevisionSubmitForm';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function SemproRevisionSubmitPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const { data: sempro, isLoading, error } = useSemproDetail(params.id);
  const router = useRouter();
  
  if (!user) {
    return (
      <div className="py-10 text-center">
        <p>Silakan login untuk mengakses halaman ini</p>
      </div>
    );
  }
  
  if (isLoading) {
    return <div className="py-10 text-center">Memuat data...</div>;
  }
  
  if (error || !sempro) {
    return (
      <div className="py-10 text-center text-red-500">
        Seminar proposal tidak ditemukan atau terjadi kesalahan
      </div>
    );
  }
  
  // Verify user is the owner of this sempro
  if (sempro.user_id !== user.id) {
    return (
      <div className="py-10 text-center text-red-500">
        Anda tidak memiliki akses ke seminar proposal ini
      </div>
    );
  }
  
  // Check if sempro status allows revision
  if (sempro.status !== 'revision_required') {
    return (
      <div className="py-10">
        <Card>
          <CardHeader>
            <CardTitle>Tidak Dapat Melakukan Revisi</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Seminar proposal ini tidak dalam status yang memerlukan revisi.</p>
            <p className="mt-2">Status saat ini: <span className="font-medium">{sempro.status}</span></p>
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
        <h1 className="text-2xl font-bold">Revisi Seminar Proposal</h1>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Detail Seminar Proposal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-500">Judul</h3>
              <p>{sempro.pengajuan_ta?.judul || 'Tidak ada judul'}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-500">Status</h3>
              <p className="text-amber-600 font-medium">Perlu Revisi</p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-500">Bidang Penelitian</h3>
              <p>{sempro.pengajuan_ta?.bidang_penelitian || 'Tidak ada bidang penelitian'}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-500">Tanggal Daftar</h3>
              <p>{new Date(sempro.created_at).toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <SemproRevisionSubmitForm sempro={sempro} />
    </div>
  );
}
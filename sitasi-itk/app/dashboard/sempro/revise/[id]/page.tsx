'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSemproDetail, useReviseSempro } from '@/hooks/useSempro';
import { SemproRevisionForm } from '@/components/sempro/SemproRevisionForm';
import { SemproRevisionFormValues } from '@/types/sempro';
import { useToast } from '@/hooks/use-toast';

export default function ReviseSemproPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: sempro, isLoading } = useSemproDetail(params.id);
  const { mutate: reviseSempro, isPending } = useReviseSempro();

  // Check access permissions - only the student who owns the sempro can revise it
  const checkAccess = () => {
    if (!user || !sempro) return false;
    return sempro.user_id === user.id && sempro.status === 'revision_required';
  };

  const handleSubmit = (formValues: SemproRevisionFormValues) => {
    reviseSempro(
      {
        id: params.id,
        ...formValues
      },
      {
        onSuccess: () => {
          toast({
            title: "Revisi Berhasil",
            description: "Dokumen revisi berhasil diupload.",
          });
          router.push('/dashboard/sempro');
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Gagal Mengupload Revisi",
            description: error.message || "Terjadi kesalahan saat mengupload revisi.",
          });
        }
      }
    );
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
            Anda tidak memiliki akses untuk merevisi seminar proposal ini atau status saat ini tidak memerlukan revisi.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Revisi Dokumen Seminar Proposal</h1>
      
      <SemproRevisionForm
        onSubmit={handleSubmit}
        isSubmitting={isPending}
        sempro={sempro}
      />
    </div>
  );
}
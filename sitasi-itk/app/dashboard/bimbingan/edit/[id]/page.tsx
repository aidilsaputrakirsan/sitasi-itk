'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { BimbinganForm } from '@/components/bimbingan/BimbinganForm';
import { useBimbinganDetail, useUpdateBimbingan } from '@/hooks/useBimbingan';
import { BimbinganFormValues } from '@/types/bimbingan';

export default function EditBimbinganPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: bimbingan, isLoading, isError, error } = useBimbinganDetail(params.id);
  const { mutate: updateBimbingan, isPending } = useUpdateBimbingan();

  // Check if user can edit (only mahasiswa who created it and status is still pending)
  const canEdit = () => {
    if (!user || !bimbingan) return false;
    return user.roles.includes('mahasiswa') && 
           bimbingan.user_id === user.id && 
           bimbingan.status === 'pending';
  };

  const handleSubmit = (formValues: BimbinganFormValues) => {
    if (!canEdit()) return;
    
    updateBimbingan({
      id: params.id,
      data: formValues
    }, {
      onSuccess: () => {
        router.push(`/dashboard/bimbingan/${params.id}`);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center">
          <p className="text-gray-500">Memuat data bimbingan...</p>
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
            {error instanceof Error ? error.message : 'Gagal memuat data bimbingan'}
          </p>
        </div>
      </div>
    );
  }

  if (!bimbingan) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center py-12">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Tidak Ditemukan</h1>
          <p className="text-gray-500">
            Catatan bimbingan tidak ditemukan.
          </p>
        </div>
      </div>
    );
  }

  if (!canEdit()) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center py-12">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Akses Terbatas</h1>
          <p className="text-gray-500">
            Anda tidak dapat mengedit catatan bimbingan ini. Catatan bimbingan hanya dapat diedit oleh mahasiswa yang membuatnya dan masih berstatus pending.
          </p>
        </div>
      </div>
    );
  }

  const defaultValues: BimbinganFormValues = {
    tanggal: bimbingan.tanggal,
    dosen: bimbingan.dosen,
    ket_bimbingan: bimbingan.ket_bimbingan,
    hasil_bimbingan: bimbingan.hasil_bimbingan,
    pengajuan_ta_id: bimbingan.pengajuan_ta_id
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Edit Catatan Bimbingan</h1>
      
      <BimbinganForm
        onSubmit={handleSubmit}
        isSubmitting={isPending}
        defaultValues={defaultValues}
        isEditing={true}
      />
    </div>
  );
}
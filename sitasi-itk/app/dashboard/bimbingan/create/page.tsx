'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { BimbinganForm } from '@/components/bimbingan/BimbinganForm';
import { useCreateBimbingan } from '@/hooks/useBimbingan';
import { BimbinganFormValues } from '@/types/bimbingan';

export default function CreateBimbinganPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { mutate: createBimbingan, isPending } = useCreateBimbingan();

  // Check if user is student
  const isMahasiswa = user?.roles.includes('mahasiswa');

  const handleSubmit = (formValues: BimbinganFormValues) => {
    createBimbingan(formValues, {
      onSuccess: () => {
        router.push('/dashboard/bimbingan');
      }
    });
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  if (!isMahasiswa) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Akses Terbatas</h1>
        <p className="text-gray-500">
          Halaman ini hanya dapat diakses oleh mahasiswa.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Catat Bimbingan Baru</h1>
      
      <BimbinganForm
        onSubmit={handleSubmit}
        isSubmitting={isPending}
      />
    </div>
  );
}
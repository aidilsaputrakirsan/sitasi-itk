'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { SemproForm } from '@/components/sempro/SemproForm';
import { useCreateSempro, useActivePeriodeSempros } from '@/hooks/useSempro';
import { SemproFormValues } from '@/types/sempro';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function RegisterSemproPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { mutate: createSempro, isPending } = useCreateSempro();
  const { data: activePeriodes, isLoading: isLoadingPeriodes } = useActivePeriodeSempros();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Check if user is student
  const isMahasiswa = user?.roles.includes('mahasiswa');
  
  // Check if there is an active period
  const hasActivePeriod = !isLoadingPeriodes && activePeriodes && activePeriodes.length > 0;

  useEffect(() => {
    // Redirect if no active period
    if (!isLoadingPeriodes && !hasActivePeriod) {
      toast({
        variant: "destructive",
        title: "Tidak Ada Periode Aktif",
        description: "Tidak ada periode pendaftaran seminar proposal yang aktif saat ini.",
      });
      router.push('/dashboard/sempro');
    }
  }, [isLoadingPeriodes, hasActivePeriod, router, toast]);

  // Perbaikan: Hapus kode redirect di sini, biarkan hook useCreateSempro yang menanganinya
  const handleSubmit = (formValues: SemproFormValues) => {
    setSubmitError(null);
    try {
      console.log("Form submitted with values:", formValues);
      // Panggil createSempro tanpa callback onSuccess, karena akan ditangani di hook
      createSempro(formValues, {
        onError: (error) => {
          console.error("Error submitting form:", error);
          setSubmitError(error.message || "Terjadi kesalahan saat pendaftaran");
        }
      });
    } catch (error) {
      console.error("Unexpected error:", error);
      setSubmitError(error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui");
    }
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

  if (isLoadingPeriodes) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-gray-500">Memeriksa periode pendaftaran...</p>
      </div>
    );
  }

  if (!hasActivePeriod) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Pendaftaran Belum Dibuka</h1>
        <p className="text-gray-500">
          Tidak ada periode pendaftaran seminar proposal yang aktif saat ini.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Pendaftaran Seminar Proposal</h1>
      
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 text-red-800">
          <h3 className="font-medium">Error</h3>
          <p className="text-sm mt-1">{submitError}</p>
        </div>
      )}
      
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6 text-blue-800">
        <h3 className="font-medium">Periode Pendaftaran Aktif</h3>
        <p className="text-sm mt-1">
          {activePeriodes[0].nama_periode}: {new Date(activePeriodes[0].tanggal_mulai).toLocaleDateString()} - {new Date(activePeriodes[0].tanggal_selesai).toLocaleDateString()}
        </p>
      </div>
      
      <SemproForm
        onSubmit={handleSubmit}
        isSubmitting={isPending}
      />
    </div>
  );
}
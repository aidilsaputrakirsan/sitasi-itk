'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCreatePeriodeSempro } from '@/hooks/useSempro';
import { PeriodeSemproForm } from '@/components/sempro/PeriodeSemproForm';
import { PeriodeSemproFormValues } from '@/types/sempro';
import { UserRole } from '@/types/auth';
import { useToast } from '@/hooks/use-toast';

export default function CreatePeriodeSemproPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<UserRole>('tendik');
  const { mutate: createPeriode, isPending } = useCreatePeriodeSempro();

  // Set user role
  useEffect(() => {
    if (!user) return;
    
    if (user.roles.includes('koorpro')) {
      setUserRole('koorpro');
    } else if (user.roles.includes('tendik')) {
      setUserRole('tendik');
    } else {
      router.push('/dashboard/sempro');
    }
  }, [user, router]);

  // Check access permissions - only admin can create periods
  const checkAccess = () => {
    if (!user) return false;
    return userRole === 'koorpro' || userRole === 'tendik';
  };

  const handleSubmit = (formValues: PeriodeSemproFormValues) => {
    createPeriode(formValues, {
      onSuccess: () => {
        toast({
          title: "Periode Ditambahkan",
          description: "Periode pendaftaran seminar proposal berhasil ditambahkan",
        });
        router.push('/dashboard/sempro/periode');
      },
      onError: (error) => {
        toast({
          variant: "destructive", 
          title: "Gagal Menambahkan Periode",
          description: error.message || "Terjadi kesalahan saat menambahkan periode",
        });
      }
    });
  };

  if (!checkAccess()) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center py-12">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Akses Terbatas</h1>
          <p className="text-gray-500">
            Hanya admin yang dapat menambahkan periode pendaftaran seminar proposal.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Tambah Periode Pendaftaran</h1>
      
      <PeriodeSemproForm
        onSubmit={handleSubmit}
        isSubmitting={isPending}
      />
    </div>
  );
}
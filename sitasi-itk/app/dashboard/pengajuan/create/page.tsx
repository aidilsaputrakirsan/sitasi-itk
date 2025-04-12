// app/dashboard/pengajuan/create/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PengajuanTAForm } from '@/components/pengajuan-ta/PengajuanTAForm';
import { useCreatePengajuanTA } from '@/hooks/usePengajuanTA';
import { useMahasiswaByUserId } from '@/hooks/useMahasiswas';
import { PengajuanTAFormValues } from '@/types/pengajuan-ta';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { useRBAC } from '@/hooks/useRBAC';

export default function CreatePengajuanPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { mutate: createPengajuan, isPending } = useCreatePengajuanTA();
  const [mahasiswaId, setMahasiswaId] = useState<string>('');
  
  // Check if user has the right role to access this page
  const { hasAccess, isLoading: rbacLoading } = useRBAC({
    allowedRoles: ['mahasiswa'],
  });
  
  // Fetch mahasiswa data for the current user
  const { data: mahasiswaData, isLoading: isLoadingMahasiswa } = useMahasiswaByUserId(
    user?.id || ''
  );
  
  // Set mahasiswaId when data is available
  useEffect(() => {
    if (mahasiswaData) {
      setMahasiswaId(mahasiswaData.id);
    }
  }, [mahasiswaData]);
  
  const handleSubmit = (formValues: PengajuanTAFormValues) => {
    if (!mahasiswaId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Data mahasiswa tidak ditemukan. Silakan lengkapi profil Anda terlebih dahulu.",
      });
      return;
    }
    
    createPengajuan(
      { formValues, mahasiswaId },
      {
        onSuccess: () => {
          router.push('/dashboard/pengajuan');
        }
      }
    );
  };
  
  if (rbacLoading || isLoadingMahasiswa) {
    return (
      <div className="flex justify-center items-center min-h-[500px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  if (!hasAccess) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Anda tidak memiliki akses ke halaman ini. Halaman ini hanya dapat diakses oleh mahasiswa.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Pengajuan Tugas Akhir</h1>
        <p className="mt-1 text-sm text-gray-500">
          Isi formulir di bawah ini untuk mengajukan proposal tugas akhir Anda
        </p>
      </div>
      
      <PengajuanTAForm 
        onSubmit={handleSubmit} 
        isSubmitting={isPending}
      />
    </div>
  );
}
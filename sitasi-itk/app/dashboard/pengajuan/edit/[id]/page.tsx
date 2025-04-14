// app/dashboard/pengajuan/edit/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PengajuanTAForm } from '@/components/pengajuan-ta/PengajuanTAForm';
import { usePengajuanTADetail, useUpdatePengajuanTA } from '@/hooks/usePengajuanTA';
import { useMahasiswaByUserId } from '@/hooks/useMahasiswas';
import { PengajuanTAFormValues } from '@/types/pengajuan-ta';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { useRBAC } from '@/hooks/useRBAC';

// Define the correct type for Next.js 15 page props
interface PageProps {
  params: {
    id: string;
  };
}

export default function EditPengajuanPage({ params }: PageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: pengajuan, isLoading: isLoadingPengajuan } = usePengajuanTADetail(params.id);
  const { mutate: updatePengajuan, isPending } = useUpdatePengajuanTA();
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
  
  // Check if the current user is the owner of the proposal
  const isOwner = mahasiswaId && pengajuan?.mahasiswa_id === mahasiswaId;
  
  // Check if the proposal can be edited (not yet approved)
  const isEditable = pengajuan && pengajuan.status !== 'approved';
  
  const handleSubmit = (formValues: PengajuanTAFormValues) => {
    if (!pengajuan || !mahasiswaId || !user) {  // Add !user to this check
      toast({
        variant: "destructive",
        title: "Error",
        description: "Data pengajuan tidak ditemukan.",
      });
      return;
    }
    
    // Check if the user is the owner of the proposal
    if (!isOwner) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Anda tidak memiliki akses untuk mengedit pengajuan ini.",
      });
      return;
    }
    
    // Check if the proposal can be edited
    if (!isEditable) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Pengajuan yang sudah disetujui tidak dapat diedit.",
      });
      return;
    }
    
    updatePengajuan(
      { 
        id: pengajuan.id, 
        data: {
          judul: formValues.judul,
          bidang_penelitian: formValues.bidang_penelitian,
          pembimbing_1: formValues.pembimbing_1,
          pembimbing_2: formValues.pembimbing_2,
          // Reset approvals if any supervisor changes
          approve_pembimbing1: pengajuan.pembimbing_1 === formValues.pembimbing_1 
            ? pengajuan.approve_pembimbing1 
            : false,
          approve_pembimbing2: pengajuan.pembimbing_2 === formValues.pembimbing_2 
            ? pengajuan.approve_pembimbing2 
            : false,
          // Update status if supervisors changed
          status: (pengajuan.pembimbing_1 !== formValues.pembimbing_1 || 
                  pengajuan.pembimbing_2 !== formValues.pembimbing_2) 
            ? 'submitted' 
            : pengajuan.status
        },
        userId: user.id
      },
      {
        onSuccess: () => {
          toast({
            title: "Berhasil",
            description: "Pengajuan tugas akhir berhasil diperbarui.",
          });
          router.push('/dashboard/pengajuan');
        }
      }
    );
  };
  
  if (rbacLoading || isLoadingMahasiswa || isLoadingPengajuan) {
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
  
  if (!pengajuan) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  Pengajuan tidak ditemukan. Silakan kembali ke halaman daftar pengajuan.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!isOwner) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  Anda tidak memiliki akses untuk mengedit pengajuan ini.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!isEditable) {
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
                  Pengajuan yang sudah disetujui tidak dapat diedit.
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
        <h1 className="text-2xl font-semibold text-gray-900">Edit Pengajuan Tugas Akhir</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ubah pengajuan tugas akhir Anda
        </p>
      </div>
      
      <PengajuanTAForm 
        onSubmit={handleSubmit} 
        isSubmitting={isPending}
        defaultValues={{
          judul: pengajuan.judul,
          bidang_penelitian: pengajuan.bidang_penelitian,
          pembimbing_1: pengajuan.pembimbing_1,
          pembimbing_2: pengajuan.pembimbing_2
        }}
        isEditing={true}
      />
    </div>
  );
}
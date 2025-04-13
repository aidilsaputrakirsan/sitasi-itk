// app/dashboard/pengajuan/create/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { PengajuanTAForm } from '@/components/pengajuan-ta/PengajuanTAForm';
import { useCreatePengajuanTA } from '@/hooks/usePengajuanTA';
import { useMahasiswaByUserId } from '@/hooks/useMahasiswas';
import { PengajuanTAFormValues } from '@/types/pengajuan-ta';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRBAC } from '@/hooks/useRBAC';
import { AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function CreatePengajuanPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { mutate: createPengajuan, isPending } = useCreatePengajuanTA();
  const [mahasiswaId, setMahasiswaId] = useState<string>('');
  const [profileMissing, setProfileMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Check if user has the right role to access this page
  const { hasAccess, isLoading: rbacLoading } = useRBAC({
    allowedRoles: ['mahasiswa'],
  });
  
  // Fetch mahasiswa data directly
  useEffect(() => {
    async function fetchMahasiswaData() {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        console.log("Fetching mahasiswa data for user ID:", user.id);
        
        const { data, error } = await supabase
          .from('mahasiswas')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (error) {
          console.error('Error fetching mahasiswa data:', error);
          setProfileMissing(true);
          setLoading(false);
          return;
        }
        
        if (data) {
          console.log("Found mahasiswa ID:", data.id);
          setMahasiswaId(data.id);
          setProfileMissing(false);
        } else {
          console.log("No mahasiswa record found");
          setProfileMissing(true);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setProfileMissing(true);
      } finally {
        setLoading(false);
      }
    }
    
    fetchMahasiswaData();
  }, [user]);
  
  const handleSubmit = (formValues: PengajuanTAFormValues) => {
    if (!mahasiswaId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Data mahasiswa tidak ditemukan. Silakan lengkapi profil Anda terlebih dahulu.",
      });
      router.push('/dashboard/profile');
      return;
    }
    
    console.log("Submitting thesis proposal with mahasiswaId:", mahasiswaId);
    
    createPengajuan(
      { formValues, mahasiswaId },
      {
        onSuccess: () => {
          router.push('/dashboard/pengajuan');
        },
        onError: (error) => {
          console.error('Error submitting proposal:', error);
          toast({
            variant: "destructive",
            title: "Error",
            description: error.message || "Terjadi kesalahan saat mengajukan proposal tugas akhir.",
          });
        }
      }
    );
  };
  
  if (rbacLoading || loading) {
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
  
  if (profileMissing) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Pengajuan Tugas Akhir</h1>
          <p className="mt-1 text-sm text-gray-500">
            Isi formulir di bawah ini untuk mengajukan proposal tugas akhir Anda
          </p>
        </div>
        
        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="bg-red-50 border-l-4 border-red-400 p-4 flex">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800">Data Mahasiswa Tidak Ditemukan</h3>
                <p className="text-sm text-red-700 mt-1">
                  Anda perlu melengkapi data profil mahasiswa terlebih dahulu sebelum dapat mengajukan proposal tugas akhir.
                </p>
                <div className="mt-3">
                  <Button asChild variant="default">
                    <Link href="/dashboard/profile">
                      Lengkapi Profil
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
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
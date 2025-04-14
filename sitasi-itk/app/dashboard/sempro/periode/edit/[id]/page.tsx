'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdatePeriodeSempro } from '@/hooks/useSempro';
import { PeriodeSemproForm } from '@/components/sempro/PeriodeSemproForm';
import { PeriodeSemproFormValues } from '@/types/sempro';
import { UserRole } from '@/types/auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

export default function EditPeriodeSemproPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<UserRole>('tendik');
  const [isLoading, setIsLoading] = useState(true);
  const [periode, setPeriode] = useState<PeriodeSemproFormValues | null>(null);
  const { mutate: updatePeriode, isPending } = useUpdatePeriodeSempro();

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

  // Fetch periode data
  useEffect(() => {
    const fetchPeriode = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('periode_sempros')
          .select('*')
          .eq('id', params.id)
          .single();
          
        if (error) {
          console.error('Error fetching periode:', error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Gagal memuat data periode",
          });
          return;
        }
        
        setPeriode({
          nama_periode: data.nama_periode,
          tanggal_mulai: data.tanggal_mulai,
          tanggal_selesai: data.tanggal_selesai,
          is_active: data.is_active
        });
      } catch (error) {
        console.error('Unexpected error:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Terjadi kesalahan saat memuat data periode",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPeriode();
  }, [params.id, toast]);

  // Check access permissions - only admin can edit periods
  const checkAccess = () => {
    if (!user) return false;
    return userRole === 'koorpro' || userRole === 'tendik';
  };

  const handleSubmit = (formValues: PeriodeSemproFormValues) => {
    updatePeriode({
      id: params.id,
      data: formValues
    }, {
      onSuccess: () => {
        toast({
          title: "Periode Diperbarui",
          description: "Periode pendaftaran seminar proposal berhasil diperbarui",
        });
        router.push('/dashboard/sempro/periode');
      },
      onError: (error) => {
        toast({
          variant: "destructive", 
          title: "Gagal Memperbarui Periode",
          description: error.message || "Terjadi kesalahan saat memperbarui periode",
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
            Hanya admin yang dapat mengedit periode pendaftaran seminar proposal.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center">
          <p className="text-gray-500">Memuat data periode...</p>
        </div>
      </div>
    );
  }

  if (!periode) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center py-12">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Tidak Ditemukan</h1>
          <p className="text-gray-500">
            Periode pendaftaran tidak ditemukan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Edit Periode Pendaftaran</h1>
      
      <PeriodeSemproForm
        onSubmit={handleSubmit}
        isSubmitting={isPending}
        defaultValues={periode}
        isEditing={true}
      />
    </div>
  );
}
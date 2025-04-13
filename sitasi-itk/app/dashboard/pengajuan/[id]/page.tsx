// app/dashboard/pengajuan/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PengajuanTADetail } from '@/components/pengajuan-ta/PengajuanTADetail';
import { usePengajuanTADetail, useApprovePengajuanTA, useUpdatePengajuanTA } from '@/hooks/usePengajuanTA';
import { useMahasiswaByUserId } from '@/hooks/useMahasiswas';
import { useDosenByUserId } from '@/hooks/useDosens';
import { UserRole } from '@/types/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export default function PengajuanDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: pengajuan, isLoading, error } = usePengajuanTADetail(params.id);
  const { mutate: approvePengajuan, isPending: isApproving } = useApprovePengajuanTA();
  const { mutate: updatePengajuan, isPending: isUpdating } = useUpdatePengajuanTA();
  
  const [userRole, setUserRole] = useState<UserRole>('mahasiswa');
  const [mahasiswaId, setMahasiswaId] = useState<string>('');
  const [dosenId, setDosenId] = useState<string>('');
  const [isPembimbing1, setIsPembimbing1] = useState(false);
  const [isPembimbing2, setIsPembimbing2] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Fetch mahasiswa data if user is a student
  const { data: mahasiswaData } = useMahasiswaByUserId(
    user?.roles.includes('mahasiswa') ? user.id : ''
  );
  
  // Fetch dosen data if user is a lecturer
  const { data: dosenData } = useDosenByUserId(
    user?.roles.includes('dosen') ? user.id : ''
  );
  
  // Set mahasiswaId, dosenId, and check if user is pembimbing 1 or 2
  useEffect(() => {
    if (mahasiswaData) {
      setMahasiswaId(mahasiswaData.id);
    }
    
    if (dosenData && pengajuan) {
      setDosenId(dosenData.id);
      
      // For dosen, we need to check against user_id instead of dosen.id
      setIsPembimbing1(pengajuan.pembimbing_1 === user?.id);
      setIsPembimbing2(pengajuan.pembimbing_2 === user?.id);
    }
  }, [mahasiswaData, dosenData, pengajuan, user?.id]);
  
  // Set user role
  useEffect(() => {
    if (user?.roles.includes('koorpro')) {
      setUserRole('koorpro');
    } else if (user?.roles.includes('tendik')) {
      setUserRole('tendik');
    } else if (user?.roles.includes('dosen')) {
      setUserRole('dosen');
    } else {
      setUserRole('mahasiswa');
    }
  }, [user]);
  
  const handleApprove = async (isFirstSupervisor: boolean) => {
    if (!pengajuan || !user?.id) return;
    
    setIsProcessing(true);
    
    try {
      // Get mahasiswa user_id from the pengajuan data
      const { data: mahasiswaInfo, error: mahasiswaError } = await supabase
        .from('mahasiswas')
        .select('user_id')
        .eq('id', pengajuan.mahasiswa_id)
        .single();
        
      if (mahasiswaError) {
        console.error('Error fetching mahasiswa user_id:', mahasiswaError);
        throw new Error('Failed to get student information');
      }
      
      // Call the mutation
      approvePengajuan({
        id: pengajuan.id,
        isPembimbing1: isFirstSupervisor,
        dosenId: user.id, // We use the user's auth ID here
        mahasiswaId: mahasiswaInfo.user_id // We use the student's user_id for notification
      }, {
        onSuccess: () => {
          toast({
            title: "Berhasil",
            description: "Pengajuan tugas akhir telah disetujui.",
          });
          setIsProcessing(false);
          
          // Refresh the data
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        },
        onError: (error) => {
          console.error('Error approving pengajuan:', error);
          toast({
            variant: "destructive",
            title: "Error",
            description: error.message || "Terjadi kesalahan saat menyetujui pengajuan.",
          });
          setIsProcessing(false);
        }
      });
    } catch (error) {
      console.error('Error in approval process:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Terjadi kesalahan saat menyetujui pengajuan.",
      });
      setIsProcessing(false);
    }
  };
  
  const handleReject = async (isFirstSupervisor: boolean, reason: string) => {
    if (!pengajuan || !user?.id || !reason) return;
    
    setIsProcessing(true);
    
    try {
      // Update the pengajuan status to rejected
      updatePengajuan({
        id: pengajuan.id,
        data: {
          status: 'rejected'
        },
        userId: user.id
      }, {
        onSuccess: async () => {
          // Add rejection reason to riwayat_pengajuans
          const { error: historyError } = await supabase
            .from('riwayat_pengajuans')
            .insert([{
              pengajuan_ta_id: pengajuan.id,
              user_id: user.id,
              riwayat: 'Ditolak',
              keterangan: `Ditolak dengan alasan: ${reason}`,
              status: 'rejected',
            }]);
          
          if (historyError) {
            console.error('Error adding rejection history:', historyError);
          }
          
          // Get mahasiswa user_id for notification
          const { data: mahasiswaInfo, error: mahasiswaError } = await supabase
            .from('mahasiswas')
            .select('user_id, nama')
            .eq('id', pengajuan.mahasiswa_id)
            .single();
            
          if (mahasiswaError) {
            console.error('Error fetching mahasiswa for notification:', mahasiswaError);
          } else {
            // Send notification to student
            const { error: notifError } = await supabase
              .from('notifikasis')
              .insert([{
                from_user: user.id,
                to_user: mahasiswaInfo.user_id,
                judul: 'Pengajuan TA Ditolak',
                pesan: `Pengajuan tugas akhir Anda ditolak${isFirstSupervisor ? ' oleh Pembimbing 1' : ' oleh Pembimbing 2'} dengan alasan: ${reason}`,
                is_read: false
              }]);
              
            if (notifError) {
              console.error('Error sending rejection notification:', notifError);
            }
          }
          
          toast({
            title: "Pengajuan Ditolak",
            description: "Pengajuan tugas akhir telah ditolak.",
          });
          
          setIsProcessing(false);
          
          // Navigate back to list
          router.push('/dashboard/pengajuan');
        },
        onError: (error) => {
          console.error('Error rejecting pengajuan:', error);
          toast({
            variant: "destructive",
            title: "Error",
            description: error.message || "Terjadi kesalahan saat menolak pengajuan.",
          });
          setIsProcessing(false);
        }
      });
    } catch (error) {
      console.error('Error in rejection process:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Terjadi kesalahan saat menolak pengajuan.",
      });
      setIsProcessing(false);
    }
  };
  
  const handleRevision = async (notes: string) => {
    if (!pengajuan || !user?.id || !notes) return;
    
    setIsProcessing(true);
    
    try {
      // Update the pengajuan status to revision
      updatePengajuan({
        id: pengajuan.id,
        data: {
          status: 'revision'
        },
        userId: user.id
      }, {
        onSuccess: async () => {
          // Add revision notes to riwayat_pengajuans
          const { error: historyError } = await supabase
            .from('riwayat_pengajuans')
            .insert([{
              pengajuan_ta_id: pengajuan.id,
              user_id: user.id,
              riwayat: 'Perlu Revisi',
              keterangan: `Perlu revisi: ${notes}`,
              status: 'revision',
            }]);
          
          if (historyError) {
            console.error('Error adding revision history:', historyError);
          }
          
          // Get mahasiswa user_id for notification
          const { data: mahasiswaInfo, error: mahasiswaError } = await supabase
            .from('mahasiswas')
            .select('user_id, nama')
            .eq('id', pengajuan.mahasiswa_id)
            .single();
            
          if (mahasiswaError) {
            console.error('Error fetching mahasiswa for notification:', mahasiswaError);
          } else {
            // Send notification to student
            const { error: notifError } = await supabase
              .from('notifikasis')
              .insert([{
                from_user: user.id,
                to_user: mahasiswaInfo.user_id,
                judul: 'Pengajuan TA Perlu Revisi',
                pesan: `Pengajuan tugas akhir Anda perlu direvisi${isPembimbing1 ? ' menurut Pembimbing 1' : ' menurut Pembimbing 2'}: ${notes}`,
                is_read: false
              }]);
              
            if (notifError) {
              console.error('Error sending revision notification:', notifError);
            }
          }
          
          toast({
            title: "Revisi Diminta",
            description: "Permintaan revisi telah dikirim ke mahasiswa.",
          });
          
          setIsProcessing(false);
          
          // Navigate back to list
          router.push('/dashboard/pengajuan');
        },
        onError: (error) => {
          console.error('Error requesting revision:', error);
          toast({
            variant: "destructive",
            title: "Error",
            description: error.message || "Terjadi kesalahan saat meminta revisi.",
          });
          setIsProcessing(false);
        }
      });
    } catch (error) {
      console.error('Error in revision process:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Terjadi kesalahan saat meminta revisi.",
      });
      setIsProcessing(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[500px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  if (!pengajuan) {
    return (
      <div className="text-center py-10">
        <h3 className="text-lg font-medium text-gray-900">Pengajuan tidak ditemukan</h3>
        <p className="mt-1 text-sm text-gray-500">
          Pengajuan tugas akhir yang Anda cari tidak ditemukan.
        </p>
        <Button onClick={() => router.push('/dashboard/pengajuan')} className="mt-4">
          Kembali ke Daftar Pengajuan
        </Button>
      </div>
    );
  }
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Detail Pengajuan Tugas Akhir</h1>
        <p className="mt-1 text-sm text-gray-500">
          Lihat detail dan status pengajuan tugas akhir
        </p>
      </div>
      
      <PengajuanTADetail 
        pengajuan={pengajuan} 
        userRole={userRole}
        isPembimbing1={isPembimbing1}
        isPembimbing2={isPembimbing2}
        isApprovable={(isPembimbing1 || isPembimbing2) && pengajuan.status !== 'approved' && !isProcessing}
        onApprove={handleApprove}
        onReject={handleReject}
        onRevision={handleRevision}
      />
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PengajuanTADetail } from '@/components/pengajuan-ta/PengajuanTADetail';
import { usePengajuanTADetail, useApprovePengajuanTA, useUpdatePengajuanTA } from '@/hooks/usePengajuanTA';
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
  
  // Set user role
  useEffect(() => {
    if (!user?.roles) return;
    
    if (user.roles.includes('koorpro')) {
      setUserRole('koorpro');
    } else if (user.roles.includes('tendik')) {
      setUserRole('tendik');
    } else if (user.roles.includes('dosen')) {
      setUserRole('dosen');
    } else {
      setUserRole('mahasiswa');
    }
  }, [user]);
  
  // Determine mahasiswa ID for access control
  useEffect(() => {
    async function fetchMahasiswaData() {
      if (!user || !user.roles?.includes('mahasiswa')) return;
      
      try {
        const { data, error } = await supabase
          .from('mahasiswas')
          .select('id')
          .eq('user_id', user.id)
          .single();
          
        if (data) {
          setMahasiswaId(data.id);
        }
      } catch (err) {
        console.error('Error fetching mahasiswa data:', err);
      }
    }
    
    fetchMahasiswaData();
  }, [user]);
  
  // Determine dosen role for access control
  useEffect(() => {
    if (!user || !pengajuan) return;
    
    // Check if user is a supervisor for this proposal
    setIsPembimbing1(pengajuan.pembimbing_1 === user.id);
    setIsPembimbing2(pengajuan.pembimbing_2 === user.id);
  }, [user, pengajuan]);
  
  // Calculate access permissions
  const isOwner = userRole === 'mahasiswa' && mahasiswaId && pengajuan?.mahasiswa_id === mahasiswaId;
  const isSupervisor = userRole === 'dosen' && (isPembimbing1 || isPembimbing2);
  const isAdmin = userRole === 'tendik' || userRole === 'koorpro';
  
  // Check if current user has already approved this proposal
  const hasApproved = isPembimbing1 ? pengajuan?.approve_pembimbing1 : 
                      isPembimbing2 ? pengajuan?.approve_pembimbing2 : false;
  
  const handleApprove = async () => {
    if (!pengajuan || !user?.id || !isSupervisor) return;
    
    setIsProcessing(true);
    
    try {
      // Get mahasiswa user_id for notification
      const { data: mahasiswaInfo, error: mahasiswaError } = await supabase
        .from('mahasiswas')
        .select('user_id')
        .eq('id', pengajuan.mahasiswa_id)
        .single();
        
      if (mahasiswaError) {
        throw new Error('Gagal mendapatkan informasi mahasiswa');
      }
      
      // Call the approvePengajuan mutation
      approvePengajuan({
        id: pengajuan.id,
        isPembimbing1,
        dosenId: user.id,
        mahasiswaId: mahasiswaInfo.user_id
      }, {
        onSuccess: () => {
          toast({
            title: "Berhasil",
            description: "Pengajuan tugas akhir telah disetujui.",
          });
          setIsProcessing(false);
          
          // Reload page after short delay
          setTimeout(() => window.location.reload(), 1500);
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "Error",
            description: error.message || "Terjadi kesalahan saat menyetujui."
          });
          setIsProcessing(false);
        }
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Terjadi kesalahan saat proses persetujuan."
      });
      setIsProcessing(false);
    }
  };
  
  const handleReject = async (isFirstSupervisor: boolean, reason: string) => {
    if (!pengajuan || !user?.id || !isSupervisor || !reason) return;
    
    setIsProcessing(true);
    
    try {
      // Update the pengajuan status to rejected
      updatePengajuan({
        id: pengajuan.id,
        data: { status: 'rejected' },
        userId: user.id
      }, {
        onSuccess: async () => {
          // Add rejection history record and notification
          try {
            await supabase
              .from('riwayat_pengajuans')
              .insert([{
                pengajuan_ta_id: pengajuan.id,
                user_id: user.id,
                riwayat: 'Ditolak',
                keterangan: `Ditolak dengan alasan: ${reason}`,
                status: 'rejected',
              }]);
              
            const { data: mahasiswaInfo } = await supabase
              .from('mahasiswas')
              .select('user_id, nama')
              .eq('id', pengajuan.mahasiswa_id)
              .single();
              
            if (mahasiswaInfo) {
              await supabase
                .from('notifikasis')
                .insert([{
                  from_user: user.id,
                  to_user: mahasiswaInfo.user_id,
                  judul: 'Pengajuan TA Ditolak',
                  pesan: `Pengajuan tugas akhir Anda ditolak${isPembimbing1 ? ' oleh Pembimbing 1' : ' oleh Pembimbing 2'} dengan alasan: ${reason}`,
                  is_read: false
                }]);
            }
          } catch (notifError) {
            console.error('Error in notification/history:', notifError);
          }
          
          toast({
            title: "Pengajuan Ditolak",
            description: "Pengajuan tugas akhir telah ditolak.",
          });
          
          setIsProcessing(false);
          router.push('/dashboard/pengajuan');
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Error",
            description: error.message || "Terjadi kesalahan saat menolak pengajuan.",
          });
          setIsProcessing(false);
        }
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Terjadi kesalahan saat menolak pengajuan.",
      });
      setIsProcessing(false);
    }
  };
  
  const handleRevision = async (notes: string) => {
    if (!pengajuan || !user?.id || !isSupervisor || !notes) return;
    
    setIsProcessing(true);
    
    try {
      // Update the pengajuan status to revision
      updatePengajuan({
        id: pengajuan.id,
        data: { status: 'revision' },
        userId: user.id
      }, {
        onSuccess: async () => {
          // Add revision notes to riwayat_pengajuans
          try {
            await supabase
              .from('riwayat_pengajuans')
              .insert([{
                pengajuan_ta_id: pengajuan.id,
                user_id: user.id,
                riwayat: 'Perlu Revisi',
                keterangan: `Perlu revisi: ${notes}`,
                status: 'revision',
              }]);
              
            // Get mahasiswa user_id for notification
            const { data: mahasiswaInfo } = await supabase
              .from('mahasiswas')
              .select('user_id, nama')
              .eq('id', pengajuan.mahasiswa_id)
              .single();
              
            if (mahasiswaInfo) {
              // Send notification to student
              await supabase
                .from('notifikasis')
                .insert([{
                  from_user: user.id,
                  to_user: mahasiswaInfo.user_id,
                  judul: 'Pengajuan TA Perlu Revisi',
                  pesan: `Pengajuan tugas akhir Anda perlu direvisi${isPembimbing1 ? ' menurut Pembimbing 1' : ' menurut Pembimbing 2'}: ${notes}`,
                  is_read: false
                }]);
            }
          } catch (err) {
            console.error('Error in revision process:', err);
          }
          
          toast({
            title: "Revisi Diminta",
            description: "Permintaan revisi telah dikirim ke mahasiswa.",
          });
          
          setIsProcessing(false);
          router.push('/dashboard/pengajuan');
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Error",
            description: error.message || "Terjadi kesalahan saat meminta revisi.",
          });
          setIsProcessing(false);
        }
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Terjadi kesalahan saat meminta revisi.",
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
  
  // Calculate action permissions based on role and status
  const canApprove = isSupervisor && pengajuan.status !== 'approved' && !hasApproved && !isProcessing;
  const canReject = isSupervisor && pengajuan.status !== 'approved' && !hasApproved && !isProcessing;
  const canRevise = isSupervisor && pengajuan.status !== 'approved' && !hasApproved && !isProcessing;
  const canEdit = isOwner && pengajuan.status !== 'approved' && !isProcessing;
  
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
        isApprovable={canApprove}
        onApprove={handleApprove}
        onReject={handleReject}
        onRevision={handleRevision}
      />
    </div>
  );
}
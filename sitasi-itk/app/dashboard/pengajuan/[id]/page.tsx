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
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function PengajuanDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: pengajuan, isLoading } = usePengajuanTADetail(params.id);
  const { mutate: approvePengajuan } = useApprovePengajuanTA();
  const { mutate: updatePengajuan } = useUpdatePengajuanTA();
  
  const [userRole, setUserRole] = useState<UserRole>('mahasiswa');
  const [mahasiswaId, setMahasiswaId] = useState<string>('');
  const [dosenId, setDosenId] = useState<string>('');
  const [isPembimbing1, setIsPembimbing1] = useState(false);
  const [isPembimbing2, setIsPembimbing2] = useState(false);
  
  // Dialog states
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  
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
      setIsPembimbing1(pengajuan.pembimbing_1 === dosenData.id);
      setIsPembimbing2(pengajuan.pembimbing_2 === dosenData.id);
    }
  }, [mahasiswaData, dosenData, pengajuan]);
  
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
  
  const handleApprove = (isFirstSupervisor: boolean) => {
    if (!pengajuan || !dosenId) return;
    
    approvePengajuan({
      id: pengajuan.id,
      isPembimbing1: isFirstSupervisor,
      dosenId,
      mahasiswaId: pengajuan.mahasiswa_id
    });
  };
  
  const handleReject = () => {
    if (!pengajuan || !dosenId || !rejectReason) return;
    
    updatePengajuan({
      id: pengajuan.id,
      data: {
        status: 'rejected'
      },
      userId: dosenId
    }, {
      onSuccess: () => {
        // Add rejection reason to riwayat_pengajuans
        updatePengajuan({
          id: pengajuan.id,
          data: {}, // No need to update pengajuan_ta again
          userId: dosenId,
          keterangan: `Ditolak dengan alasan: ${rejectReason}`
        });
        
        setShowRejectDialog(false);
        setRejectReason('');
        
        toast({
          title: "Pengajuan Ditolak",
          description: "Pengajuan tugas akhir telah ditolak.",
        });
      }
    });
  };
  
  const handleRequestRevision = () => {
    if (!pengajuan || !dosenId || !revisionNotes) return;
    
    updatePengajuan({
      id: pengajuan.id,
      data: {
        status: 'revision'
      },
      userId: dosenId
    }, {
      onSuccess: () => {
        // Add revision notes to riwayat_pengajuans
        updatePengajuan({
          id: pengajuan.id,
          data: {}, // No need to update pengajuan_ta again
          userId: dosenId,
          keterangan: `Perlu revisi: ${revisionNotes}`
        });
        
        setShowRevisionDialog(false);
        setRevisionNotes('');
        
        toast({
          title: "Revisi Diminta",
          description: "Permintaan revisi telah dikirim ke mahasiswa.",
        });
      }
    });
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
        isApprovable={(isPembimbing1 || isPembimbing2) && pengajuan.status !== 'approved'}
        onApprove={handleApprove}
        onReject={() => setShowRejectDialog(true)}
        onRevision={() => setShowRevisionDialog(true)}
      />
      
      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tolak Pengajuan</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menolak pengajuan tugas akhir ini? Silakan berikan alasan penolakan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="reject-reason">Alasan Penolakan</Label>
            <Textarea
              id="reject-reason"
              placeholder="Tulis alasan penolakan di sini..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReject}
              disabled={!rejectReason}
            >
              Tolak Pengajuan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Revision Dialog */}
      <AlertDialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Minta Revisi</AlertDialogTitle>
            <AlertDialogDescription>
              Silakan berikan catatan revisi yang perlu dilakukan oleh mahasiswa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="revision-notes">Catatan Revisi</Label>
            <Textarea
              id="revision-notes"
              placeholder="Tulis catatan revisi di sini..."
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRequestRevision}
              disabled={!revisionNotes}
            >
              Kirim Permintaan Revisi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
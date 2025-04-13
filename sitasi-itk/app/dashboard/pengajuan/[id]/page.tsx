// app/dashboard/pengajuan/[id]/page.tsx
'use client';

import { useState, useEffect, ReactNode, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PengajuanTADetail } from '@/components/pengajuan-ta/PengajuanTADetail';
import { usePengajuanTADetail, useApprovePengajuanTA, useUpdatePengajuanTA } from '@/hooks/usePengajuanTA';
import { useMahasiswaByUserId } from '@/hooks/useMahasiswas';
import { useDosenByUserId } from '@/hooks/useDosens';
import { UserRole } from '@/types/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

// Tambahkan interface untuk PageProps
interface PageProps {
  params: {
    id: string;
  };
}

// Tetap pertahankan komponen UI temporary
interface AlertDialogProps {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AlertDialogContentProps {
  children: ReactNode;
}

interface AlertDialogHeaderProps {
  children: ReactNode;
}

interface AlertDialogTitleProps {
  children: ReactNode;
}

interface AlertDialogDescriptionProps {
  children: ReactNode;
}

interface AlertDialogFooterProps {
  children: ReactNode;
}

interface AlertDialogCancelProps {
  children: ReactNode;
  onClick: () => void;
}

interface AlertDialogActionProps {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

interface TextareaProps {
  id: string;
  placeholder: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
}

interface LabelProps {
  htmlFor: string;
  children: ReactNode;
}

// Komponen UI temporary tetap sama
const AlertDialog = ({ children, open, onOpenChange }: AlertDialogProps) => (
  open ? <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
    <div className="bg-white p-6 rounded-lg max-w-md w-full">
      {children}
    </div>
  </div> : null
);

const AlertDialogContent = ({ children }: AlertDialogContentProps) => <div>{children}</div>;
const AlertDialogHeader = ({ children }: AlertDialogHeaderProps) => <div className="mb-4">{children}</div>;
const AlertDialogTitle = ({ children }: AlertDialogTitleProps) => <h3 className="text-lg font-medium">{children}</h3>;
const AlertDialogDescription = ({ children }: AlertDialogDescriptionProps) => <p className="text-sm text-gray-500">{children}</p>;
const AlertDialogFooter = ({ children }: AlertDialogFooterProps) => <div className="flex justify-end gap-2 mt-4">{children}</div>;
const AlertDialogCancel = ({ children, onClick }: AlertDialogCancelProps) => (
  <button 
    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-50"
    onClick={onClick}
  >
    {children}
  </button>
);
const AlertDialogAction = ({ children, onClick, disabled }: AlertDialogActionProps) => (
  <button 
    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
);

const Textarea = ({ id, placeholder, value, onChange, className }: TextareaProps) => (
  <textarea
    id={id}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${className}`}
  />
);

const Label = ({ htmlFor, children }: LabelProps) => (
  <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
    {children}
  </label>
);

export default function PengajuanDetailPage({ params }: PageProps) {
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
  
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  
  const { data: mahasiswaData } = useMahasiswaByUserId(
    user?.roles.includes('mahasiswa') ? user.id : ''
  );
  
  const { data: dosenData } = useDosenByUserId(
    user?.roles.includes('dosen') ? user.id : ''
  );
  
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
        addRiwayatPengajuan(pengajuan.id, dosenId, 'Ditolak', `Ditolak dengan alasan: ${rejectReason}`);
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
        addRiwayatPengajuan(pengajuan.id, dosenId, 'Revisi', `Perlu revisi: ${revisionNotes}`);
        setShowRevisionDialog(false);
        setRevisionNotes('');
        
        toast({
          title: "Revisi Diminta",
          description: "Permintaan revisi telah dikirim ke mahasiswa.",
        });
      }
    });
  };
  
  const addRiwayatPengajuan = async (pengajuanId: string, userId: string, riwayat: string, keterangan: string) => {
    try {
      const { supabase } = await import('@/lib/supabase');
      
      await supabase.from('riwayat_pengajuans').insert([{
        pengajuan_ta_id: pengajuanId,
        user_id: userId,
        riwayat,
        keterangan,
        status: riwayat.toLowerCase(),
      }]);
    } catch (error) {
      console.error('Error adding riwayat:', error);
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
        isApprovable={(isPembimbing1 || isPembimbing2) && pengajuan.status !== 'approved'}
        onApprove={handleApprove}
        onReject={() => setShowRejectDialog(true)}
        onRevision={() => setShowRevisionDialog(true)}
      />
      
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
            <AlertDialogCancel onClick={() => setShowRejectDialog(false)}>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReject}
              disabled={!rejectReason}
            >
              Tolak Pengajuan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
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
            <AlertDialogCancel onClick={() => setShowRevisionDialog(false)}>Batal</AlertDialogCancel>
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
// components/pengajuan-ta/PengajuanTADetail.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { PengajuanTA } from '@/types/pengajuan-ta';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  FileEdit, CheckCircle, XCircle, History, User, CalendarClock, FileText, Book 
} from 'lucide-react';
import { useRiwayatPengajuan } from '@/hooks/usePengajuanTA';
import { useAuth } from '@/contexts/AuthContext';

// Simple Separator replacement
const Separator = () => <div className="h-[1px] w-full bg-gray-200 my-4"></div>;

// Simpler date formatting without date-fns
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

interface PengajuanTADetailProps {
  pengajuan: PengajuanTA;
  onApprove?: (isPembimbing1: boolean) => void;
  onReject?: (isPembimbing1: boolean) => void;
  onRevision?: () => void;
  userRole: 'mahasiswa' | 'dosen' | 'tendik' | 'koorpro';
  isPembimbing1?: boolean;
  isPembimbing2?: boolean;
  isApprovable?: boolean;
}

export function PengajuanTADetail({ 
  pengajuan, 
  onApprove, 
  onReject, 
  onRevision,
  userRole,
  isPembimbing1 = false,
  isPembimbing2 = false,
  isApprovable = false
}: PengajuanTADetailProps) {
  const { data: riwayat } = useRiwayatPengajuan(pengajuan.id);
  const { user } = useAuth();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Detail Pengajuan Tugas Akhir</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">{pengajuan.judul}</h3>
              <div className="flex items-center mt-2">
                <StatusBadge status={pengajuan.status} />
                <span className="ml-2 text-sm text-gray-500">
                  Diajukan pada {formatDate(pengajuan.created_at)}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500 flex items-center">
                  <Book className="h-4 w-4 mr-2" />
                  Bidang Penelitian
                </p>
                <p>{pengajuan.bidang_penelitian}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Mahasiswa
                </p>
                <p>{pengajuan.mahasiswa?.nama} ({pengajuan.mahasiswa?.nim})</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h4 className="font-medium">Pembimbing</h4>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarFallback>
                      {pengajuan.dosen_pembimbing1?.nama_dosen?.charAt(0) || 'P1'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{pengajuan.dosen_pembimbing1?.nama_dosen}</p>
                    <p className="text-sm text-gray-500">Pembimbing 1</p>
                  </div>
                </div>
                {pengajuan.approve_pembimbing1 ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-5 w-5 mr-1" />
                    <span className="text-sm">Disetujui</span>
                  </div>
                ) : (
                  <div className="flex items-center text-yellow-600">
                    <CalendarClock className="h-5 w-5 mr-1" />
                    <span className="text-sm">Menunggu</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarFallback>
                      {pengajuan.dosen_pembimbing2?.nama_dosen?.charAt(0) || 'P2'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{pengajuan.dosen_pembimbing2?.nama_dosen}</p>
                    <p className="text-sm text-gray-500">Pembimbing 2</p>
                  </div>
                </div>
                {pengajuan.approve_pembimbing2 ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-5 w-5 mr-1" />
                    <span className="text-sm">Disetujui</span>
                  </div>
                ) : (
                  <div className="flex items-center text-yellow-600">
                    <CalendarClock className="h-5 w-5 mr-1" />
                    <span className="text-sm">Menunggu</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            {userRole === 'mahasiswa' && pengajuan.status !== 'approved' && (
              <Button variant="outline" asChild>
                <Link href={`/dashboard/pengajuan/edit/${pengajuan.id}`}>
                  <FileEdit className="h-4 w-4 mr-2" />
                  Edit Pengajuan
                </Link>
              </Button>
            )}
            
            {userRole === 'dosen' && isApprovable && (
              <>
                <Button 
                  variant="default" 
                  onClick={() => onApprove?.(isPembimbing1)}
                  disabled={
                    (isPembimbing1 && pengajuan.approve_pembimbing1) || 
                    (isPembimbing2 && pengajuan.approve_pembimbing2)
                  }
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Setujui
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => onReject?.(isPembimbing1)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Tolak
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => onRevision?.()}
                >
                  <FileEdit className="h-4 w-4 mr-2" />
                  Minta Revisi
                </Button>
              </>
            )}
            
            {(userRole === 'tendik' || userRole === 'koorpro') && (
              <Button asChild variant="outline">
                <Link href={`/dashboard/data-pengajuan/edit/${pengajuan.id}`}>
                  <FileEdit className="h-4 w-4 mr-2" />
                  Edit Status
                </Link>
              </Button>
            )}
            
            <Button variant="outline" asChild>
              <Link href="/dashboard/pengajuan">
                Kembali
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <div>
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <History className="h-5 w-5 mr-2" />
              <CardTitle className="text-base">Riwayat Pengajuan</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[300px] overflow-y-auto pr-4">
              <div className="space-y-4">
                {riwayat?.map((item) => (
                  <div key={item.id} className="border-l-2 border-gray-200 pl-4 py-1">
                    <div className="flex justify-between items-start">
                      <p className="font-medium text-sm">{item.riwayat}</p>
                      <StatusBadge status={item.status as any} className="ml-2" />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{item.keterangan}</p>
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                      <span>{item.user?.name || 'User'}</span>
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                  </div>
                ))}
                
                {!riwayat?.length && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Belum ada riwayat pengajuan
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
// components/pengajuan-ta/PengajuanTADetail.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PengajuanTA } from '@/types/pengajuan-ta';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  FileEdit, CheckCircle, XCircle, History, User, CalendarClock, FileText, Book, AlertCircle 
} from 'lucide-react';
import { useRiwayatPengajuan } from '@/hooks/usePengajuanTA';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

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
  onReject?: (isPembimbing1: boolean, reason: string) => void;
  onRevision?: (notes: string) => void;
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
  const { toast } = useToast();
  
  // State for action modals
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  
  // Handle approval
  const handleApprove = () => {
    if (!onApprove) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Fungsi persetujuan tidak tersedia",
      });
      return;
    }
    
    if (isPembimbing1) {
      onApprove(true);
    } else if (isPembimbing2) {
      onApprove(false);
    }
  };
  
  // Handle rejection
  const handleReject = () => {
    if (!onReject || !rejectReason) return;
    
    onReject(isPembimbing1, rejectReason);
    setShowRejectModal(false);
    setRejectReason('');
  };
  
  // Handle revision request
  const handleRevision = () => {
    if (!onRevision || !revisionNotes) return;
    
    onRevision(revisionNotes);
    setShowRevisionModal(false);
    setRevisionNotes('');
  };
  
  // Check if current user has already approved this proposal
  const hasApproved = isPembimbing1 ? pengajuan.approve_pembimbing1 : 
                      isPembimbing2 ? pengajuan.approve_pembimbing2 : false;

                      useEffect(() => {
                        console.log("Pembimbing status:", {
                          isPembimbing1, 
                          isPembimbing2,
                          approve_pembimbing1: pengajuan.approve_pembimbing1,
                          approve_pembimbing2: pengajuan.approve_pembimbing2,
                          isApprovable,
                          hasApproved
                        });
                      }, [isPembimbing1, isPembimbing2, pengajuan.approve_pembimbing1, pengajuan.approve_pembimbing2, isApprovable, hasApproved]);

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
                    <p className="font-medium"> {pengajuan.dosen_pembimbing1?.nama_dosen || 'Pembimbing 1'}</p>
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
                    <p className="font-medium"> {pengajuan.dosen_pembimbing2?.nama_dosen || 'Pembimbing 2'}</p>
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
          {/* Debug panel untuk approval */}
            {/* Debug panel removed
              {isPembimbing1 || isPembimbing2 ? (
                <div className="mt-4 p-2 bg-gray-50 rounded text-xs">
                  <p>Status Approval Debug:</p>
                  <ul className="list-disc pl-4 mt-1">
                    <li>Role: {isPembimbing1 ? "Pembimbing 1" : "Pembimbing 2"}</li>
                    <li>Approval Status: {isPembimbing1 ? 
                      (pengajuan.approve_pembimbing1 ? "Sudah disetujui" : "Belum disetujui") : 
                      (pengajuan.approve_pembimbing2 ? "Sudah disetujui" : "Belum disetujui")}</li>
                    <li>IsApprovable: {isApprovable ? "Ya" : "Tidak"}</li>
                    <li>hasApproved: {hasApproved ? "Ya" : "Tidak"}</li>
                  </ul>
                </div>
              ) : null}
              */}
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
                {!hasApproved ? (
                  <Button 
                    variant="default" 
                    onClick={handleApprove}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Setujui
                  </Button>
                ) : (
                  <Button 
                    variant="default" 
                    disabled={true}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Telah Disetujui
                  </Button>
                )}
                
                {!hasApproved && (
                  <>
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowRejectModal(true)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Tolak
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowRevisionModal(true)}
                    >
                      <FileEdit className="h-4 w-4 mr-2" />
                      Minta Revisi
                    </Button>
                  </>
                )}
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
              {riwayat && riwayat.length > 0 ? (
                riwayat.map((item) => (
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
                ))
              ) : (
                <div>
                  <p className="text-sm text-gray-500 text-center py-4">
                    Belum ada riwayat pengajuan
                  </p>
                  {process.env.NODE_ENV === 'development' && (
                    <p className="text-xs text-gray-400 text-center mt-2">
                      Pengajuan ID: {pengajuan.id}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
      
      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2">Tolak Pengajuan</h3>
            <p className="text-sm text-gray-600 mb-4">
              Berikan alasan penolakan pengajuan tugas akhir ini
            </p>
            
            <div className="mb-4">
              <Label htmlFor="reject-reason">Alasan Penolakan</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Jelaskan alasan penolakan..."
                className="min-h-[100px] mt-1"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowRejectModal(false)}
              >
                Batal
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleReject}
                disabled={!rejectReason.trim()}
              >
                Tolak Pengajuan
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Revision Modal */}
      {showRevisionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2">Minta Revisi</h3>
            <p className="text-sm text-gray-600 mb-4">
              Berikan catatan revisi yang perlu dilakukan
            </p>
            
            <div className="mb-4">
              <Label htmlFor="revision-notes">Catatan Revisi</Label>
              <Textarea
                id="revision-notes"
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="Jelaskan revisi yang diperlukan..."
                className="min-h-[100px] mt-1"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowRevisionModal(false)}
              >
                Batal
              </Button>
              <Button 
                variant="default" 
                onClick={handleRevision}
                disabled={!revisionNotes.trim()}
              >
                Kirim Permintaan Revisi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
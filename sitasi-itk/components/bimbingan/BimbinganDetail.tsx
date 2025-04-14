// components/bimbingan/BimbinganDetail.tsx
import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Bimbingan } from '@/types/bimbingan';
import { UserRole } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { BimbinganStatusBadge } from './BimbinganStatusBadge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useApproveBimbingan } from '@/hooks/useBimbingan';
import { Check, X, Edit } from 'lucide-react';

interface BimbinganDetailProps {
  bimbingan: Bimbingan;
  userRole: UserRole;
}

export function BimbinganDetail({ bimbingan, userRole }: BimbinganDetailProps) {
  const { mutate: approveBimbingan, isPending: isProcessing } = useApproveBimbingan();

  const handleApprove = () => {
    approveBimbingan({
      id: bimbingan.id,
      isApproved: true,
      mahasiswaId: bimbingan.user_id
    });
  };

  const handleReject = () => {
    approveBimbingan({
      id: bimbingan.id,
      isApproved: false,
      mahasiswaId: bimbingan.user_id
    });
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy');
    } catch (e) {
      return dateString || '-';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Detail Bimbingan</CardTitle>
          <BimbinganStatusBadge status={bimbingan.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Tanggal Bimbingan</h3>
              <p className="mt-1">{formatDate(bimbingan.tanggal)}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Dosen Pembimbing</h3>
              <p className="mt-1">{bimbingan.dosen_pembimbing?.nama_dosen || '-'}</p>
              {bimbingan.dosen_pembimbing?.nip && (
                <p className="text-xs text-gray-500">NIP: {bimbingan.dosen_pembimbing.nip}</p>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Mahasiswa</h3>
              <p className="mt-1">{bimbingan.mahasiswa?.nama || '-'}</p>
              {bimbingan.mahasiswa?.nim && (
                <p className="text-xs text-gray-500">NIM: {bimbingan.mahasiswa.nim}</p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Tugas Akhir</h3>
              <p className="mt-1">{bimbingan.pengajuan_ta?.judul || '-'}</p>
              {bimbingan.pengajuan_ta?.bidang_penelitian && (
                <p className="text-xs text-gray-500">
                  Bidang: {bimbingan.pengajuan_ta.bidang_penelitian}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Consultation Details */}
        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Keterangan Bimbingan</h3>
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="text-gray-700 whitespace-pre-line">{bimbingan.ket_bimbingan}</p>
          </div>
        </div>

        {/* Consultation Results */}
        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Hasil Bimbingan</h3>
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="text-gray-700 whitespace-pre-line">{bimbingan.hasil_bimbingan}</p>
          </div>
        </div>

        {/* Metadata */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Dibuat: {formatDate(bimbingan.created_at)}</span>
            {bimbingan.updated_at && bimbingan.updated_at !== bimbingan.created_at && (
              <span>Diperbarui: {formatDate(bimbingan.updated_at)}</span>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button variant="outline" asChild>
          <Link href="/dashboard/bimbingan">Kembali</Link>
        </Button>

        <div className="flex gap-2">
          {/* Edit button for mahasiswa with pending status */}
          {userRole === 'mahasiswa' && bimbingan.status === 'pending' && (
            <Button variant="outline" asChild>
              <Link href={`/dashboard/bimbingan/edit/${bimbingan.id}`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          )}

          {/* Approve/Reject buttons for dosen with pending status */}
          {userRole === 'dosen' && bimbingan.status === 'pending' && (
            <>
              <Button 
                variant="outline" 
                className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                onClick={handleApprove}
                disabled={isProcessing}
              >
                <Check className="h-4 w-4 mr-2" />
                Setujui
              </Button>
              <Button 
                variant="outline" 
                className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                onClick={handleReject}
                disabled={isProcessing}
              >
                <X className="h-4 w-4 mr-2" />
                Tolak
              </Button>
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
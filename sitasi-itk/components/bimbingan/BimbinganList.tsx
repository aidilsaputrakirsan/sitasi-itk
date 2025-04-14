// components/bimbingan/BimbinganList.tsx
import React from 'react';
import Link from 'next/link';
import { Bimbingan } from '@/types/bimbingan';
import { UserRole } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BimbinganStatusBadge } from './BimbinganStatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useApproveBimbingan } from '@/hooks/useBimbingan';
import { format } from 'date-fns';
import { Eye, Edit, Check, X } from 'lucide-react';

interface BimbinganListProps {
  bimbinganList: Bimbingan[];
  userRole: UserRole;
  isLoading: boolean;
}

export function BimbinganList({
  bimbinganList,
  userRole,
  isLoading
}: BimbinganListProps) {
  const { mutate: approveBimbingan, isPending: isProcessing } = useApproveBimbingan();

  const handleApprove = (bimbingan: Bimbingan) => {
    approveBimbingan({
      id: bimbingan.id,
      isApproved: true,
      mahasiswaId: bimbingan.user_id
    });
  };

  const handleReject = (bimbingan: Bimbingan) => {
    approveBimbingan({
      id: bimbingan.id,
      isApproved: false,
      mahasiswaId: bimbingan.user_id
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center">
            <p className="text-gray-500">Memuat data bimbingan...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!bimbinganList || bimbinganList.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-gray-500 mb-4">Belum ada catatan bimbingan</p>
            {userRole === 'mahasiswa' && (
              <Button asChild>
                <Link href="/dashboard/bimbingan/create">
                  Catat Bimbingan Baru
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tanggal</TableHead>
            {(userRole === 'dosen' || userRole === 'tendik' || userRole === 'koorpro') && (
              <TableHead>Mahasiswa</TableHead>
            )}
            {(userRole === 'mahasiswa' || userRole === 'tendik' || userRole === 'koorpro') && (
              <TableHead>Dosen</TableHead>
            )}
            <TableHead>Tugas Akhir</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bimbinganList.map((bimbingan) => (
            <TableRow key={bimbingan.id}>
              <TableCell>
                {bimbingan.tanggal ? format(new Date(bimbingan.tanggal), 'dd/MM/yyyy') : '-'}
              </TableCell>
              
              {/* Mahasiswa column (for dosen and admin) */}
              {(userRole === 'dosen' || userRole === 'tendik' || userRole === 'koorpro') && (
                <TableCell>
                  {bimbingan.mahasiswa?.nama || '-'}
                  {bimbingan.mahasiswa?.nim && <div className="text-xs text-gray-500">{bimbingan.mahasiswa.nim}</div>}
                </TableCell>
              )}
              
              {/* Dosen column (for mahasiswa and admin) */}
              {(userRole === 'mahasiswa' || userRole === 'tendik' || userRole === 'koorpro') && (
                <TableCell>
                  {bimbingan.dosen_pembimbing?.nama_dosen || '-'}
                </TableCell>
              )}
              
              {/* Thesis title */}
              <TableCell>
                {bimbingan.pengajuan_ta?.judul || '-'}
              </TableCell>
              
              {/* Status badge */}
              <TableCell>
                <BimbinganStatusBadge status={bimbingan.status} />
              </TableCell>
              
              {/* Actions column */}
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {/* View button - available to all */}
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/bimbingan/${bimbingan.id}`}>
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">View</span>
                    </Link>
                  </Button>
                  
                  {/* Edit button - only for mahasiswa with pending status */}
                  {userRole === 'mahasiswa' && bimbingan.status === 'pending' && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/bimbingan/edit/${bimbingan.id}`}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Link>
                    </Button>
                  )}
                  
                  {/* Approve/Reject buttons - only for dosen with pending status */}
                  {userRole === 'dosen' && bimbingan.status === 'pending' && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                        onClick={() => handleApprove(bimbingan)}
                        disabled={isProcessing}
                      >
                        <Check className="h-4 w-4" />
                        <span className="sr-only">Approve</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                        onClick={() => handleReject(bimbingan)}
                        disabled={isProcessing}
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Reject</span>
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
// components/sempro/SemproList.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { Sempro, JadwalSempro } from '@/types/sempro';
import { UserRole } from '@/types/auth';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SemproStatusBadge } from './SemproStatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Eye, FileText, Calendar } from 'lucide-react';

interface SemproListProps {
  semproList: Sempro[] | JadwalSempro[];
  userRole: UserRole;
  isLoading: boolean;
  isJadwalView?: boolean;
}

export function SemproList({
  semproList,
  userRole,
  isLoading,
  isJadwalView = false
}: SemproListProps) {
  
  // Format date for display
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch (e) {
      return dateString;
    }
  };
  
  // Format time for display
  const formatTime = (timeString: string | null | undefined): string => {
    if (!timeString) return '-';
    return timeString.substring(0, 5); // Format: HH:mm
  };

  // Function for console logging - for debugging
  const debugLog = (data: any, label: string) => {
    console.log(`DEBUG ${label}:`, data);
  };

  // Log list data for debugging
  React.useEffect(() => {
    if (semproList && semproList.length > 0) {
      debugLog(semproList[0], 'First item in semproList');
    }
  }, [semproList]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center">
            <p className="text-gray-500">Memuat data seminar proposal...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!semproList || semproList.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-gray-500 mb-4">
              {isJadwalView 
                ? "Belum ada jadwal seminar proposal" 
                : "Belum ada pendaftaran seminar proposal"}
            </p>
            {userRole === 'mahasiswa' && !isJadwalView && (
              <Button asChild>
                <Link href="/dashboard/sempro/register">
                  Daftar Seminar Proposal
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render different tables for sempro list and jadwal list
  return (
    <div className="rounded-md border">
      {isJadwalView ? (
        // Jadwal View
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Waktu</TableHead>
              <TableHead>Ruangan</TableHead>
              {(userRole === 'dosen' || userRole === 'tendik' || userRole === 'koorpro') && (
                <TableHead>Mahasiswa</TableHead>
              )}
              <TableHead>Judul TA</TableHead>
              {(userRole === 'mahasiswa' || userRole === 'tendik' || userRole === 'koorpro') && (
                <TableHead>Penguji</TableHead>
              )}
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(semproList as JadwalSempro[]).map((jadwal) => (
              <TableRow key={jadwal.id}>
                <TableCell>
                  {formatDate(jadwal.tanggal_sempro)}
                </TableCell>
                <TableCell>
                  {formatTime(jadwal.waktu_mulai)} - {formatTime(jadwal.waktu_selesai)}
                </TableCell>
                <TableCell>
                  {jadwal.ruangan}
                </TableCell>
                
                {/* Mahasiswa column (for dosen and admin) */}
                {(userRole === 'dosen' || userRole === 'tendik' || userRole === 'koorpro') && (
                  <TableCell>
                    {jadwal.mahasiswa?.nama || '-'}
                    {jadwal.mahasiswa?.nim && <div className="text-xs text-gray-500">{jadwal.mahasiswa.nim}</div>}
                  </TableCell>
                )}
                
                {/* Thesis title */}
                <TableCell>
                  {jadwal.pengajuan_ta?.judul || '-'}
                </TableCell>
                
                {/* Penguji column (for mahasiswa and admin) */}
                {(userRole === 'mahasiswa' || userRole === 'tendik' || userRole === 'koorpro') && (
                  <TableCell>
                    <div className="text-xs">
                      <div>Penguji 1: {jadwal.penguji1?.nama_dosen || '-'}</div>
                      <div>Penguji 2: {jadwal.penguji2?.nama_dosen || '-'}</div>
                    </div>
                  </TableCell>
                )}
                
                {/* Actions column */}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {/* View button - available to all */}
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/sempro/jadwal/${jadwal.id}`}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Lihat Detail</span>
                      </Link>
                    </Button>
                    
                    {/* Penilaian button - only for dosen */}
                    {userRole === 'dosen' && jadwal.sempro?.status === 'scheduled' && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/sempro/penilaian/${jadwal.sempro.id}`}>
                          <FileText className="h-4 w-4" />
                          <span className="sr-only">Beri Nilai</span>
                        </Link>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        // Regular Sempro View
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal Daftar</TableHead>
              {(userRole === 'dosen' || userRole === 'tendik' || userRole === 'koorpro') && (
                <TableHead>Mahasiswa</TableHead>
              )}
              <TableHead>Tugas Akhir</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(semproList as Sempro[]).map((sempro) => (
              <TableRow key={sempro.id}>
                <TableCell>
                  {/* Perbaikan: Menggunakan sempro.tanggal sesuai dengan schema database */}
                  {formatDate(sempro.tanggal)}
                </TableCell>
                
                {/* Mahasiswa column (for dosen and admin) */}
                {(userRole === 'dosen' || userRole === 'tendik' || userRole === 'koorpro') && (
                  <TableCell>
                    {sempro.mahasiswa?.nama || '-'}
                    {sempro.mahasiswa?.nim && <div className="text-xs text-gray-500">{sempro.mahasiswa.nim}</div>}
                  </TableCell>
                )}
                
                {/* Thesis title */}
                <TableCell>
                  {sempro.pengajuan_ta?.judul || '-'}
                </TableCell>
                
                {/* Status badge */}
                <TableCell>
                  <SemproStatusBadge status={sempro.status} />
                </TableCell>
                
                {/* Actions column */}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {/* View button - available to all */}
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/sempro/${sempro.id}`}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Lihat Detail</span>
                      </Link>
                    </Button>
                    
                    {/* Schedule button - only for admin with verified sempros */}
                    {(userRole === 'tendik' || userRole === 'koorpro') && 
                     (sempro.status === 'verified' || sempro.status === 'evaluated') && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/sempro/schedule/${sempro.id}`}>
                          <Calendar className="h-4 w-4" />
                          <span className="sr-only">Jadwalkan</span>
                        </Link>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
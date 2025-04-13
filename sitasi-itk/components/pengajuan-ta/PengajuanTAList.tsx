// components/pengajuan-ta/PengajuanTAList.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { PengajuanTA } from '@/types/pengajuan-ta';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, FileText, Eye, MoreHorizontal } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface PengajuanTAListProps {
  pengajuanList: PengajuanTA[];
  userRole: 'mahasiswa' | 'dosen' | 'tendik' | 'koorpro';
  isLoading?: boolean;
  hiddenButton?: boolean;
}

export function PengajuanTAList({ pengajuanList, userRole, isLoading = false, hiddenButton = false }: PengajuanTAListProps) {
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd MMM yyyy', { locale: id });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getColumns = (): ColumnDef<PengajuanTA>[] => {
    // Common columns for all roles
    const commonColumns: ColumnDef<PengajuanTA>[] = [
      {
        accessorKey: 'judul',
        header: ({ column }) => {
          return (
            <div
              className="flex cursor-pointer items-center"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Judul
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </div>
          );
        },
        cell: ({ row }) => (
          <div className="font-medium">{row.getValue('judul')}</div>
        ),
      },
      {
        accessorKey: 'bidang_penelitian',
        header: 'Bidang Penelitian',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <StatusBadge status={row.getValue('status')} />
        ),
      },
      {
        accessorKey: 'created_at',
        header: 'Tanggal Pengajuan',
        cell: ({ row }) => formatDate(row.getValue('created_at')),
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const pengajuan = row.original;
          
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/pengajuan/${pengajuan.id}`} className="w-full cursor-pointer">
                    <Eye className="h-4 w-4 mr-2" /> Lihat Detail
                  </Link>
                </DropdownMenuItem>
                
                {userRole === 'mahasiswa' && pengajuan.status !== 'approved' && (
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/pengajuan/edit/${pengajuan.id}`} className="w-full cursor-pointer">
                      <FileText className="h-4 w-4 mr-2" /> Edit Pengajuan
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ];
    
    // Role-specific columns
    if (userRole === 'dosen') {
      // Insert mahasiswa column after judul for dosen view
      commonColumns.splice(1, 0, {
        accessorKey: 'mahasiswa.nama',
        header: 'Mahasiswa',
        cell: ({ row }) => {
          const mahasiswa = row.original.mahasiswa;
          return mahasiswa ? (
            <div>
              {mahasiswa.nama} 
              <div className="text-xs text-gray-500">{mahasiswa.nim}</div>
            </div>
          ) : (
            <div className="text-gray-400 italic">Data tidak tersedia</div>
          );
        },
      });
    }
    
    if (userRole === 'tendik' || userRole === 'koorpro') {
      // Insert mahasiswa and pembimbing columns for admin view
      commonColumns.splice(1, 0, {
        accessorKey: 'mahasiswa.nama',
        header: 'Mahasiswa',
        cell: ({ row }) => {
          const mahasiswa = row.original.mahasiswa;
          return mahasiswa ? (
            <div>
              {mahasiswa.nama} 
              <div className="text-xs text-gray-500">{mahasiswa.nim}</div>
            </div>
          ) : (
            <div className="text-gray-400 italic">Data tidak tersedia</div>
          );
        },
      });
      
      commonColumns.splice(3, 0, {
        accessorKey: 'pembimbing',
        header: 'Pembimbing',
        cell: ({ row }) => {
          const p1 = row.original.dosen_pembimbing1?.nama_dosen;
          const p2 = row.original.dosen_pembimbing2?.nama_dosen;
          return (
            <div className="text-sm">
              <div>{p1 || 'Tidak tersedia'}</div>
              <div className="text-gray-500">{p2 || 'Tidak tersedia'}</div>
            </div>
          );
        },
      });
    }
    
    return commonColumns;
  };

  const columns = getColumns();
  
  // Custom empty state component
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-10">
      <FileText className="h-16 w-16 text-gray-300 mb-4" />
      <h3 className="text-lg font-medium text-gray-900">Belum ada pengajuan</h3>
      {userRole === 'mahasiswa' ? (
        <p className="mt-1 text-sm text-gray-500 text-center max-w-md mb-4">
          Anda belum mengajukan proposal tugas akhir.
          {!hiddenButton && (
            <Button asChild className="mt-4">
              <Link href="/dashboard/pengajuan/create">
                Ajukan Tugas Akhir
              </Link>
            </Button>
          )}
        </p>
      ) : userRole === 'dosen' ? (
        <p className="mt-1 text-sm text-gray-500 text-center max-w-md">
          Belum ada mahasiswa yang mengajukan proposal tugas akhir kepada Anda.
        </p>
      ) : (
        <p className="mt-1 text-sm text-gray-500 text-center max-w-md">
          Belum ada pengajuan proposal tugas akhir.
        </p>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftar Pengajuan Tugas Akhir</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[300px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : pengajuanList && pengajuanList.length > 0 ? (
          <DataTable 
            columns={columns} 
            data={pengajuanList} 
            searchColumn="judul"
            searchPlaceholder="Cari judul tugas akhir..."
          />
        ) : (
          <EmptyState />
        )}
      </CardContent>
    </Card>
  );
}
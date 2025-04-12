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
import { ArrowUpDown, FileText, Eye, MoreHorizontal, PlusCircle } from 'lucide-react';
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
}

export function PengajuanTAList({ pengajuanList, userRole, isLoading = false }: PengajuanTAListProps) {
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'dd MMM yyyy', { locale: id });
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
        cell: ({ row }) => (
          <div>
            {row.original.mahasiswa?.nama} 
            <div className="text-xs text-gray-500">{row.original.mahasiswa?.nim}</div>
          </div>
        ),
      });
    }
    
    if (userRole === 'tendik' || userRole === 'koorpro') {
      // Insert mahasiswa and pembimbing columns for admin view
      commonColumns.splice(1, 0, {
        accessorKey: 'mahasiswa.nama',
        header: 'Mahasiswa',
        cell: ({ row }) => (
          <div>
            {row.original.mahasiswa?.nama} 
            <div className="text-xs text-gray-500">{row.original.mahasiswa?.nim}</div>
          </div>
        ),
      });
      
      commonColumns.splice(3, 0, {
        accessorKey: 'pembimbing',
        header: 'Pembimbing',
        cell: ({ row }) => (
          <div className="text-sm">
            <div>{row.original.dosen_pembimbing1?.nama_dosen}</div>
            <div className="text-gray-500">{row.original.dosen_pembimbing2?.nama_dosen}</div>
          </div>
        ),
      });
    }
    
    return commonColumns;
  };

  const columns = getColumns();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Daftar Pengajuan Tugas Akhir</CardTitle>
        {userRole === 'mahasiswa' && (
          <Button asChild>
            <Link href="/dashboard/pengajuan/create">
              <PlusCircle className="h-4 w-4 mr-2" />
              Ajukan Tugas Akhir
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[300px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : pengajuanList?.length ? (
          <DataTable 
            columns={columns} 
            data={pengajuanList} 
            searchColumn="judul"
            searchPlaceholder="Cari judul tugas akhir..."
          />
        ) : (
          <div className="text-center py-10">
            <FileText className="h-10 w-10 mx-auto text-gray-400 mb-2" />
            <h3 className="text-lg font-medium text-gray-900">Belum ada pengajuan</h3>
            <p className="mt-1 text-sm text-gray-500">
              {userRole === 'mahasiswa' 
                ? 'Anda belum mengajukan proposal tugas akhir.' 
                : userRole === 'dosen'
                  ? 'Belum ada mahasiswa yang mengajukan proposal tugas akhir kepada Anda.'
                  : 'Belum ada pengajuan proposal tugas akhir.'}
            </p>
            {userRole === 'mahasiswa' && (
              <Button className="mt-4" asChild>
                <Link href="/dashboard/pengajuan/create">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Ajukan Tugas Akhir
                </Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
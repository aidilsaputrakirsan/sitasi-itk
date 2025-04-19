'use client';

import { useState } from 'react';
import { useRBAC } from '@/hooks/useRBAC';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { useDosens, Dosen } from '@/hooks/useDosens';
import { ColumnDef } from '@tanstack/react-table';
import { 
  ArrowUpDown, 
  MoreHorizontal, 
  UserPlus 
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DataDosenPage() {
  // Check if user has the right role to access this page
  const { hasAccess, isLoading: rbacLoading } = useRBAC({
    allowedRoles: ['tendik', 'koorpro'],
  });

  const { data: dosens, isLoading, error } = useDosens();

  const columns: ColumnDef<Dosen>[] = [
    {
      accessorKey: 'nama_dosen',
      header: 'Nama',
      cell: ({ row }) => {
        const dosen = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              {dosen.profiles?.photo_url ? (
                <AvatarImage src={dosen.profiles.photo_url} alt={dosen.nama_dosen} />
              ) : (
                <AvatarFallback>{dosen.nama_dosen.charAt(0).toUpperCase()}</AvatarFallback>
              )}
            </Avatar>
            <div className="font-medium">{dosen.nama_dosen}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'nip',
      header: ({ column }) => {
        return (
          <div
            className="flex cursor-pointer items-center"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            NIP
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </div>
        );
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const dosen = row.original;
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Link href={`/dashboard/data-dosen/${dosen.id}`} className="w-full">
                  Detail
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href={`/dashboard/data-dosen/${dosen.id}/edit`} className="w-full">
                  Edit
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  if (rbacLoading) {
    return (
      <div className="flex justify-center items-center min-h-[500px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Anda tidak memiliki akses ke halaman ini.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Data Dosen</h1>
          <p className="mt-1 text-sm text-gray-500">
            Daftar dosen yang terdaftar dalam sistem
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Tambah Dosen
        </Button>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {String(error)}
              </p>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Dosen</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center min-h-[300px]">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <DataTable 
              columns={columns} 
              data={dosens || []} 
              searchColumn="nama_dosen"
              searchPlaceholder="Cari dosen..."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
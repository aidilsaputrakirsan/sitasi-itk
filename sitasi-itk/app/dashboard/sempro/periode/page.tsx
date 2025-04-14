'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePeriodeSempros, useUpdatePeriodeSempro } from '@/hooks/useSempro';
import { UserRole } from '@/types/auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, ArrowLeft, Edit, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function PeriodeSemproPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<UserRole>('tendik');
  const { data: periodes, isLoading, isError } = usePeriodeSempros();
  const { mutate: updatePeriode, isPending } = useUpdatePeriodeSempro();

  // Set user role
  useEffect(() => {
    if (!user) return;
    
    if (user.roles.includes('koorpro')) {
      setUserRole('koorpro');
    } else if (user.roles.includes('tendik')) {
      setUserRole('tendik');
    } else {
      router.push('/dashboard/sempro');
    }
  }, [user, router]);

  // Check access permissions - only admin can manage periods
  const checkAccess = () => {
    if (!user) return false;
    return userRole === 'koorpro' || userRole === 'tendik';
  };

  // Handle toggle active status
  const handleToggleActive = (id: string, currentStatus: boolean) => {
    updatePeriode({
      id,
      data: { is_active: !currentStatus }
    }, {
      onSuccess: () => {
        toast({
          title: currentStatus ? "Periode Dinonaktifkan" : "Periode Diaktifkan",
          description: currentStatus 
            ? "Periode pendaftaran telah dinonaktifkan" 
            : "Periode pendaftaran telah diaktifkan",
        });
      }
    });
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy');
    } catch (e) {
      return dateString;
    }
  };

  if (!checkAccess()) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center py-12">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Akses Terbatas</h1>
          <p className="text-gray-500">
            Hanya admin yang dapat mengelola periode pendaftaran seminar proposal.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Kelola Periode Seminar Proposal</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tambah, edit, dan kelola periode pendaftaran seminar proposal
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/sempro">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/sempro/periode/create">
              <PlusCircle className="h-4 w-4 mr-2" />
              Tambah Periode
            </Link>
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Daftar Periode Pendaftaran</CardTitle>
          <CardDescription>
            Periode aktif akan tersedia untuk pendaftaran seminar proposal oleh mahasiswa
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center">
              <p className="text-gray-500">Memuat data periode...</p>
            </div>
          ) : isError ? (
            <div className="py-8 text-center">
              <p className="text-red-500">Gagal memuat data periode</p>
            </div>
          ) : !periodes || periodes.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-500">Belum ada periode pendaftaran seminar proposal</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Periode</TableHead>
                  <TableHead>Tanggal Mulai</TableHead>
                  <TableHead>Tanggal Selesai</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodes.map((periode) => (
                  <TableRow key={periode.id}>
                    <TableCell className="font-medium">{periode.nama_periode}</TableCell>
                    <TableCell>{formatDate(periode.tanggal_mulai)}</TableCell>
                    <TableCell>{formatDate(periode.tanggal_selesai)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={periode.is_active}
                          onCheckedChange={() => handleToggleActive(periode.id, periode.is_active)}
                          disabled={isPending}
                        />
                        <Badge
                          variant={periode.is_active ? "success" : "secondary"}
                          className={periode.is_active ? "bg-green-100 text-green-800" : ""}
                        >
                          {periode.is_active ? "Aktif" : "Tidak Aktif"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/sempro/periode/edit/${periode.id}`}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
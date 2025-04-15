// components/sempro/JadwalSemproDetail.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { JadwalSempro } from '@/types/sempro';
import { UserRole } from '@/types/auth';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SemproStatusBadge } from './SemproStatusBadge';
import { useUpdateJadwalSempro } from '@/hooks/useSempro';
import { Calendar, Users, MapPin, Clock, FileText, Check, AlertTriangle } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';

// Date/time formatter
const formatDate = (dateString: string) => {
  try {
    return format(new Date(dateString), 'dd MMMM yyyy');
  } catch (e) {
    return dateString || '-';
  }
};

const formatTime = (timeString: string | undefined) => {
  if (!timeString) return '-';
  return timeString.substring(0, 5); // Format: HH:mm
};

interface JadwalSemproDetailProps {
  jadwal: JadwalSempro;
  userRole: UserRole;
  onEdit?: () => void;
}

export function JadwalSemproDetail({ 
  jadwal, 
  userRole,
  onEdit
}: JadwalSemproDetailProps) {
  const { mutate: updateJadwal, isPending } = useUpdateJadwalSempro();
  const [publishState, setPublishState] = useState(jadwal.is_published);
  
  // Handle publish toggle
  const handlePublishChange = (checked: boolean) => {
    if (userRole !== 'tendik' && userRole !== 'koorpro') return;
    
    setPublishState(checked);
    updateJadwal({
      id: jadwal.id,
      data: { is_published: checked }
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Detail Jadwal Seminar Proposal</CardTitle>
          {jadwal.sempro && <SemproStatusBadge status={jadwal.sempro.status} />}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Judul TA */}
        <div>
          <h3 className="text-lg font-semibold">{jadwal.pengajuan_ta?.judul || 'Judul Tidak Tersedia'}</h3>
          <div className="flex items-center mt-1">
            <Calendar className="h-4 w-4 mr-1 text-gray-500" />
            <span className="text-sm text-gray-500">
              {formatDate(jadwal.tanggal_sempro)}
            </span>
          </div>
        </div>
        
        {/* Jadwal & Tempat Section */}
        <div className="bg-blue-50 p-4 rounded-md border border-blue-100 space-y-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span className="font-medium">
              {formatDate(jadwal.tanggal_sempro)}
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start space-x-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">Waktu</p>
                <p className="text-sm text-gray-600">
                  {formatTime(jadwal.waktu_mulai)} - {formatTime(jadwal.waktu_selesai)}
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">Ruangan</p>
                <p className="text-sm text-gray-600">{jadwal.ruangan}</p>
              </div>
            </div>
          </div>
          
          {!jadwal.is_published && (
            <div className="flex items-center text-amber-600 text-sm border-t border-blue-200 pt-3 mt-3">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <span>Jadwal belum dipublikasikan</span>
            </div>
          )}
        </div>
        
        {/* Mahasiswa & Penguji Section */}
        <div className="space-y-4">
          {/* Mahasiswa */}
          <div className="p-4 bg-gray-50 rounded-md">
            <h4 className="font-medium mb-3 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Mahasiswa
            </h4>
            <div className="flex items-center">
              <Avatar className="h-10 w-10 mr-3">
                <AvatarFallback>
                  {jadwal.mahasiswa?.nama?.charAt(0) || 'M'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{jadwal.mahasiswa?.nama || 'Nama Tidak Tersedia'}</p>
                <p className="text-sm text-gray-500">{jadwal.mahasiswa?.nim || 'NIM Tidak Tersedia'}</p>
              </div>
            </div>
          </div>
          
          {/* Penguji */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Penguji 1 */}
            <div className="p-4 bg-gray-50 rounded-md">
              <h4 className="font-medium mb-3">Penguji 1</h4>
              <div className="flex items-center">
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarFallback>
                    {jadwal.penguji1?.nama_dosen?.charAt(0) || 'P1'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{jadwal.penguji1?.nama_dosen || 'Nama Tidak Tersedia'}</p>
                  {jadwal.penguji1?.nip && (
                    <p className="text-sm text-gray-500">NIP: {jadwal.penguji1?.nip}</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Penguji 2 */}
            <div className="p-4 bg-gray-50 rounded-md">
              <h4 className="font-medium mb-3">Penguji 2</h4>
              <div className="flex items-center">
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarFallback>
                    {jadwal.penguji2?.nama_dosen?.charAt(0) || 'P2'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{jadwal.penguji2?.nama_dosen || 'Nama Tidak Tersedia'}</p>
                  {jadwal.penguji2?.nip && (
                    <p className="text-sm text-gray-500">NIP: {jadwal.penguji2?.nip}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Publication Setting (for admin only) */}
        {(userRole === 'tendik' || userRole === 'koorpro') && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Status Publikasi</h4>
                <p className="text-sm text-gray-500">
                  Jadwal yang dipublikasikan akan dikirimkan notifikasi ke mahasiswa dan dosen penguji
                </p>
              </div>
              <Switch
                checked={publishState}
                onCheckedChange={handlePublishChange}
                disabled={isPending}
              />
            </div>
          </div>
        )}
        
        {/* Metadata */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Dibuat: {format(new Date(jadwal.created_at), 'dd/MM/yyyy HH:mm')}</span>
            {jadwal.updated_at && jadwal.updated_at !== jadwal.created_at && (
              <span>Diperbarui: {format(new Date(jadwal.updated_at), 'dd/MM/yyyy HH:mm')}</span>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-between gap-2">
        <Button variant="outline" asChild>
          <Link href="/dashboard/sempro/jadwal">Kembali</Link>
        </Button>
        
        <div className="flex gap-2">
          {/* Admin can edit jadwal */}
          {(userRole === 'tendik' || userRole === 'koorpro') && onEdit && (
            <Button onClick={onEdit}>
              <FileText className="h-4 w-4 mr-2" />
              Edit Jadwal
            </Button>
          )}
          
          {/* Dosen can give penilaian when status is scheduled */}
          {userRole === 'dosen' && jadwal.sempro?.status === 'scheduled' && (
            <Button asChild>
              <Link href={`/dashboard/sempro/penilaian/${jadwal.sempro.id}`}>
                <Check className="h-4 w-4 mr-2" />
                Berikan Penilaian
              </Link>
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
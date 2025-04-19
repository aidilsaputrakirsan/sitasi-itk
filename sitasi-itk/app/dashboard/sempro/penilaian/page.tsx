'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { useRoleBasedSempros } from '@/hooks/useSempro';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Sempro, JadwalSempro } from '@/types/sempro';
import { columns } from './columns';

// Tipe data untuk item yang akan ditampilkan di tabel
type SemproTableItem = Sempro | JadwalSempro | {
  mahasiswa?: { nama?: string; nim?: string };
  sempro?: Sempro;
  pengajuan_ta?: { judul?: string };
  status?: string;
  isPenilaianSubmitted?: boolean;
};

export default function PenilaianSemproPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: sempros, isLoading, error } = useRoleBasedSempros();
  const [filteredSempros, setFilteredSempros] = useState<SemproTableItem[]>([]);

  useEffect(() => {
    if (sempros && user) {
      // Untuk dosen, filter sempro scheduled & completed yang perlu penilaian
      if (user.roles.includes('dosen')) {
        const filtered = sempros.filter(item => {
          // Cek apakah item adalah JadwalSempro dengan properti sempro
          if ('sempro' in item && item.sempro) {
            return ['scheduled', 'completed'].includes(item.sempro.status || '');
          } 
          // Atau item adalah Sempro langsung
          else if ('status' in item) {
            return ['scheduled', 'completed'].includes(item.status || '');
          }
          return false;
        });
        setFilteredSempros(filtered);
      } else {
        setFilteredSempros(sempros);
      }
    }
  }, [sempros, user]);

  if (isLoading) return <div className="py-10 text-center">Memuat data...</div>;
  if (error) return <div className="py-10 text-center text-red-500">Error: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Penilaian Seminar Proposal</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Seminar Proposal untuk Dinilai</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSempros.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500">Tidak ada seminar proposal yang perlu dinilai</p>
            </div>
          ) : (
            <DataTable 
              columns={columns} 
              data={filteredSempros} 
              searchPlaceholder="Cari nama/nim..."
              searchColumn="nama_mahasiswa"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
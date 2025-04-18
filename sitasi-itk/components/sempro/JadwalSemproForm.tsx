// components/sempro/JadwalSemproForm.tsx
// Sesuaikan dengan struktur tabel jadwal_sempros yang sudah ada

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { JadwalSemproFormValues } from '@/types/sempro';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, Option } from "@/components/ui/select";
import { useDosens } from '@/hooks/useDosens';
import { usePeriodeSempros } from '@/hooks/useSempro';
import { Switch } from '@/components/ui/switch';

// Schema validation untuk form sesuaikan dengan struktur tabel yang ada
const formSchema = z.object({
  periode_id: z.string().min(1, 'Periode harus dipilih'),
  pengajuan_ta_id: z.string(),
  user_id: z.string(),
  penguji_1: z.string().min(1, 'Penguji 1 harus dipilih'),
  penguji_2: z.string().min(1, 'Penguji 2 harus dipilih'),
  tanggal_sempro: z.string().min(1, 'Tanggal seminar harus diisi'),
  waktu_mulai: z.string().min(1, 'Waktu mulai harus diisi'),
  waktu_selesai: z.string().min(1, 'Waktu selesai harus diisi'),
  ruangan: z.string().min(1, 'Ruangan harus diisi'),
  is_published: z.boolean().optional()
}).refine(data => data.penguji_1 !== data.penguji_2, {
  message: "Penguji 1 dan Penguji 2 tidak boleh sama",
  path: ["penguji_2"]
});

interface JadwalSemproFormProps {
  onSubmit: (values: JadwalSemproFormValues) => void;
  isSubmitting: boolean;
  defaultValues?: Partial<JadwalSemproFormValues>;
  semproId?: string;
  pengajuanTaId: string;
  userId: string;
  pembimbing1?: string;
  pembimbing2?: string;
  isEditing?: boolean;
}

export function JadwalSemproForm({ 
  onSubmit, 
  isSubmitting,
  defaultValues,
  semproId,
  pengajuanTaId,
  userId,
  pembimbing1,
  pembimbing2,
  isEditing = false
}: JadwalSemproFormProps) {
  // Fetch data for dropdowns
  const { data: dosens, isLoading: isLoadingDosens } = useDosens();
  const { data: periodes, isLoading: isLoadingPeriodes } = usePeriodeSempros();
  
  // Filter out pembimbing from potential penguji
  const filteredDosens = dosens?.filter(dosen => 
    dosen.user_id !== pembimbing1 && dosen.user_id !== pembimbing2
  ) || [];
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<JadwalSemproFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || {
      periode_id: '',
      pengajuan_ta_id: pengajuanTaId,
      user_id: userId,
      penguji_1: '',
      penguji_2: '',
      tanggal_sempro: '',
      waktu_mulai: '',
      waktu_selesai: '',
      ruangan: '',
      is_published: false
    }
  });

  // Watch penguji_1 to filter options for penguji_2
  const penguji1 = watch('penguji_1');
  const isPublished = watch('is_published');

  // Set hidden fields
  useEffect(() => {
    setValue('pengajuan_ta_id', pengajuanTaId);
    setValue('user_id', userId);
  }, [pengajuanTaId, userId, setValue]);

  const onFormSubmit = (data: JadwalSemproFormValues) => {
    console.log("Submitting jadwal form data:", data);
    onSubmit(data);
  };

  // Handle switch change with proper typing
  const handlePublishedChange = (checked: boolean) => {
    setValue('is_published', checked);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Jadwalkan Seminar Proposal</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onFormSubmit)}>
        <CardContent className="space-y-6">
          {/* Periode Selection - Gunakan data dari tabel periodes */}
          <div className="space-y-2">
            <Label htmlFor="periode_id">Periode Seminar</Label>
            <Select
              id="periode_id"
              {...register('periode_id')}
              error={errors.periode_id?.message}
            >
              <Option value="">Pilih Periode</Option>
              {isLoadingPeriodes ? (
                <Option value="" disabled>Loading...</Option>
              ) : periodes?.length === 0 ? (
                <Option value="" disabled>Tidak ada periode yang tersedia</Option>
              ) : periodes?.map(periode => (
                <Option key={periode.id} value={periode.id}>
                  {periode.nama_periode} ({new Date(periode.tanggal_mulai).toLocaleDateString()} - {new Date(periode.tanggal_selesai).toLocaleDateString()})
                </Option>
              ))}
            </Select>
            {errors.periode_id && (
              <p className="text-red-500 text-xs mt-1">{errors.periode_id.message}</p>
            )}
          </div>

          {/* Penguji Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="penguji_1">Penguji 1</Label>
              <Select
                id="penguji_1"
                {...register('penguji_1')}
                error={errors.penguji_1?.message}
              >
                <Option value="">Pilih Penguji 1</Option>
                {isLoadingDosens ? (
                  <Option value="" disabled>Loading...</Option>
                ) : filteredDosens.map(dosen => (
                  <Option key={dosen.id} value={dosen.user_id}>
                    {dosen.nama_dosen}
                  </Option>
                ))}
              </Select>
              {errors.penguji_1 && (
                <p className="text-red-500 text-xs mt-1">{errors.penguji_1.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="penguji_2">Penguji 2</Label>
              <Select
                id="penguji_2"
                {...register('penguji_2')}
                error={errors.penguji_2?.message}
              >
                <Option value="">Pilih Penguji 2</Option>
                {isLoadingDosens ? (
                  <Option value="" disabled>Loading...</Option>
                ) : filteredDosens
                    .filter(dosen => dosen.user_id !== penguji1)
                    .map(dosen => (
                      <Option key={dosen.id} value={dosen.user_id}>
                        {dosen.nama_dosen}
                      </Option>
                    ))}
              </Select>
              {errors.penguji_2 && (
                <p className="text-red-500 text-xs mt-1">{errors.penguji_2.message}</p>
              )}
            </div>
          </div>

          {/* Jadwal Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tanggal_sempro">Tanggal Seminar</Label>
              <Input 
                id="tanggal_sempro" 
                type="date"
                {...register('tanggal_sempro')} 
              />
              {errors.tanggal_sempro && (
                <p className="text-red-500 text-xs mt-1">{errors.tanggal_sempro.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="waktu_mulai">Waktu Mulai</Label>
                <Input 
                  id="waktu_mulai" 
                  type="time"
                  {...register('waktu_mulai')} 
                />
                {errors.waktu_mulai && (
                  <p className="text-red-500 text-xs mt-1">{errors.waktu_mulai.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="waktu_selesai">Waktu Selesai</Label>
                <Input 
                  id="waktu_selesai" 
                  type="time"
                  {...register('waktu_selesai')} 
                />
                {errors.waktu_selesai && (
                  <p className="text-red-500 text-xs mt-1">{errors.waktu_selesai.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Ruangan */}
          <div className="space-y-2">
            <Label htmlFor="ruangan">Ruangan</Label>
            <Input 
              id="ruangan" 
              placeholder="Masukkan ruangan seminar" 
              {...register('ruangan')} 
            />
            {errors.ruangan && (
              <p className="text-red-500 text-xs mt-1">{errors.ruangan.message}</p>
            )}
          </div>

          {/* Publikasi Switch */}
          <div className="flex items-center space-x-2">
            <Switch
              id="is_published"
              checked={!!isPublished}
              onCheckedChange={handlePublishedChange}
            />
            <Label htmlFor="is_published" className="cursor-pointer">
              Publikasikan Jadwal
            </Label>
          </div>
          <p className="text-xs text-gray-500">
            Jika jadwal dipublikasikan, mahasiswa dan dosen penguji akan menerima notifikasi.
          </p>

        </CardContent>
        <CardFooter className="flex justify-between">
        <Button variant="outline" type="button" onClick={() => window.history.back()}>
          Batal
        </Button>
        <Button type="submit" disabled={!!isSubmitting}>
          {isSubmitting 
            ? 'Menyimpan...' 
            : isEditing 
              ? 'Perbarui Jadwal' 
              : 'Simpan Jadwal'}
        </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
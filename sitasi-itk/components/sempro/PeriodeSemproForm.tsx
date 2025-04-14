// components/sempro/PeriodeSemproForm.tsx
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PeriodeSemproFormValues } from '@/types/sempro';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from '@/components/ui/switch';

// Schema validation for the form using Zod
const formSchema = z.object({
  nama_periode: z.string().min(3, 'Nama periode minimal 3 karakter'),
  tanggal_mulai: z.string().min(1, 'Tanggal mulai harus diisi'),
  tanggal_selesai: z.string().min(1, 'Tanggal selesai harus diisi'),
  is_active: z.boolean()
}).refine(data => {
  const startDate = new Date(data.tanggal_mulai);
  const endDate = new Date(data.tanggal_selesai);
  return endDate >= startDate;
}, {
  message: "Tanggal selesai harus setelah tanggal mulai",
  path: ["tanggal_selesai"]
});

interface PeriodeSemproFormProps {
  onSubmit: (values: PeriodeSemproFormValues) => void;
  isSubmitting: boolean;
  defaultValues?: Partial<PeriodeSemproFormValues>;
  isEditing?: boolean;
}

export function PeriodeSemproForm({ 
  onSubmit, 
  isSubmitting,
  defaultValues,
  isEditing = false
}: PeriodeSemproFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<PeriodeSemproFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || {
      nama_periode: '',
      tanggal_mulai: '',
      tanggal_selesai: '',
      is_active: false
    }
  });

  // Watch is_active value for UI
  const isActive = watch('is_active');

  const onFormSubmit = (data: PeriodeSemproFormValues) => {
    console.log("Submitting periode form data:", data);
    onSubmit(data);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Periode Pendaftaran' : 'Tambah Periode Pendaftaran'}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onFormSubmit)}>
        <CardContent className="space-y-4">
          {/* Nama Periode */}
          <div className="space-y-2">
            <Label htmlFor="nama_periode">Nama Periode</Label>
            <Input 
              id="nama_periode" 
              placeholder="Contoh: Periode Seminar Proposal Semester Genap 2024/2025" 
              {...register('nama_periode')} 
            />
            {errors.nama_periode && (
              <p className="text-red-500 text-xs mt-1">{errors.nama_periode.message}</p>
            )}
          </div>

          {/* Tanggal Periode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tanggal_mulai">Tanggal Mulai</Label>
              <Input 
                id="tanggal_mulai" 
                type="date"
                {...register('tanggal_mulai')} 
              />
              {errors.tanggal_mulai && (
                <p className="text-red-500 text-xs mt-1">{errors.tanggal_mulai.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tanggal_selesai">Tanggal Selesai</Label>
              <Input 
                id="tanggal_selesai" 
                type="date"
                {...register('tanggal_selesai')} 
              />
              {errors.tanggal_selesai && (
                <p className="text-red-500 text-xs mt-1">{errors.tanggal_selesai.message}</p>
              )}
            </div>
          </div>

          {/* Status Aktif */}
          <div className="flex items-center space-x-2 pt-4">
            <Switch
              id="is_active"
              {...register('is_active')}
              checked={isActive}
              onCheckedChange={value => setValue('is_active', value)}
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              Aktifkan Periode
            </Label>
          </div>
          
          <p className="text-sm text-amber-600">
            {isActive ? (
              'Jika periode ini diaktifkan, periode lain yang aktif akan dinonaktifkan secara otomatis.'
            ) : (
              'Periode tidak aktif tidak akan tersedia untuk pendaftaran seminar proposal.'
            )}
          </p>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" type="button" onClick={() => window.history.back()}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : isEditing ? 'Perbarui' : 'Simpan'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
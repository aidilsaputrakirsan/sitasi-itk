// components/pengajuan-ta/PengajuanTAForm.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PengajuanTAFormValues } from '@/types/pengajuan-ta';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useDosens } from '@/hooks/useDosens';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define the form schema with Zod
const formSchema = z.object({
  judul: z.string().min(10, 'Judul minimal 10 karakter'),
  bidang_penelitian: z.string().min(3, 'Bidang penelitian harus diisi'),
  pembimbing_1: z.string().min(1, 'Pembimbing 1 harus dipilih'),
  pembimbing_2: z.string().min(1, 'Pembimbing 2 harus dipilih')
}).refine(data => data.pembimbing_1 !== data.pembimbing_2, {
  message: "Pembimbing 1 dan Pembimbing 2 tidak boleh sama",
  path: ["pembimbing_2"]
});

interface PengajuanTAFormProps {
  onSubmit: (values: PengajuanTAFormValues) => void;
  isSubmitting: boolean;
  defaultValues?: Partial<PengajuanTAFormValues>;
  isEditing?: boolean;
}

export function PengajuanTAForm({ 
  onSubmit, 
  isSubmitting, 
  defaultValues,
  isEditing = false
}: PengajuanTAFormProps) {
  const { toast } = useToast();
  const { data: dosens, isLoading: isLoadingDosens } = useDosens();
  
  // State for select values (as a fallback for the radix-ui selects)
  const [bidangPenelitian, setBidangPenelitian] = useState(defaultValues?.bidang_penelitian || '');
  const [pembimbing1, setPembimbing1] = useState(defaultValues?.pembimbing_1 || '');
  const [pembimbing2, setPembimbing2] = useState(defaultValues?.pembimbing_2 || '');
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PengajuanTAFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || {
      judul: '',
      bidang_penelitian: '',
      pembimbing_1: '',
      pembimbing_2: ''
    }
  });

  // Update the form values when the select values change
  useEffect(() => {
    if (bidangPenelitian) {
      setValue('bidang_penelitian', bidangPenelitian);
    }
    if (pembimbing1) {
      setValue('pembimbing_1', pembimbing1);
    }
    if (pembimbing2) {
      setValue('pembimbing_2', pembimbing2);
    }
  }, [bidangPenelitian, pembimbing1, pembimbing2, setValue]);

  const handleFormSubmit = (data: PengajuanTAFormValues) => {
    onSubmit(data);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Pengajuan Tugas Akhir' : 'Pengajuan Tugas Akhir'}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="judul">Judul Tugas Akhir</Label>
            <Input 
              id="judul" 
              placeholder="Masukkan judul tugas akhir" 
              {...register('judul')} 
            />
            {errors.judul && (
              <p className="text-red-500 text-xs mt-1">{errors.judul.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bidang_penelitian">Bidang Penelitian</Label>
            <Select 
              onValueChange={(value: string) => {
                setBidangPenelitian(value);
                setValue('bidang_penelitian', value);
              }}
              defaultValue={defaultValues?.bidang_penelitian}
            >
              <SelectTrigger id="bidang_penelitian">
                <SelectValue placeholder="Pilih bidang penelitian" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Data Science">Data Science</SelectItem>
                <SelectItem value="Artificial Intelligence">Artificial Intelligence</SelectItem>
                <SelectItem value="Computer Network">Computer Network</SelectItem>
                <SelectItem value="Mobile Application">Mobile Application</SelectItem>
                <SelectItem value="Web Development">Web Development</SelectItem>
                <SelectItem value="System Development">System Development</SelectItem>
                <SelectItem value="Internet of Things">Internet of Things</SelectItem>
                <SelectItem value="Game Development">Game Development</SelectItem>
                <SelectItem value="Cybersecurity">Cybersecurity</SelectItem>
                <SelectItem value="Human-Computer Interaction">Human-Computer Interaction</SelectItem>
              </SelectContent>
            </Select>
            {errors.bidang_penelitian && (
              <p className="text-red-500 text-xs mt-1">{errors.bidang_penelitian.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pembimbing_1">Pembimbing 1</Label>
            <Select 
              onValueChange={(value: string) => {
                setPembimbing1(value);
                setValue('pembimbing_1', value);
              }}
              defaultValue={defaultValues?.pembimbing_1}
            >
              <SelectTrigger id="pembimbing_1">
                <SelectValue placeholder="Pilih pembimbing 1" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingDosens ? (
                  <SelectItem value="" disabled>Loading...</SelectItem>
                ) : dosens?.map(dosen => (
                  <SelectItem key={dosen.id} value={dosen.id}>
                    {dosen.nama_dosen} - {dosen.nip}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.pembimbing_1 && (
              <p className="text-red-500 text-xs mt-1">{errors.pembimbing_1.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pembimbing_2">Pembimbing 2</Label>
            <Select 
              onValueChange={(value: string) => {
                setPembimbing2(value);
                setValue('pembimbing_2', value);
              }}
              defaultValue={defaultValues?.pembimbing_2}
            >
              <SelectTrigger id="pembimbing_2">
                <SelectValue placeholder="Pilih pembimbing 2" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingDosens ? (
                  <SelectItem value="" disabled>Loading...</SelectItem>
                ) : dosens?.filter(dosen => dosen.id !== pembimbing1).map(dosen => (
                  <SelectItem key={dosen.id} value={dosen.id}>
                    {dosen.nama_dosen} - {dosen.nip}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.pembimbing_2 && (
              <p className="text-red-500 text-xs mt-1">{errors.pembimbing_2.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" type="button" onClick={() => window.history.back()}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Ajukan'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
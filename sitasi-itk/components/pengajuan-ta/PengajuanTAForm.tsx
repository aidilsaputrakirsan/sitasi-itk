// Updated PengajuanTAForm.tsx to fix foreign key constraints issue
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PengajuanTAFormValues } from '@/types/pengajuan-ta';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDosens } from '@/hooks/useDosens';
import { Select, Option } from "@/components/ui/select"; // Import the simplified components

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
  const { data: dosens, isLoading: isLoadingDosens } = useDosens();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<PengajuanTAFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || {
      judul: '',
      bidang_penelitian: '',
      pembimbing_1: '',
      pembimbing_2: ''
    }
  });

  // When editing, ensure we use the correct default values
  useEffect(() => {
    if (isEditing && defaultValues) {
      console.log("Setting default values for editing:", defaultValues);
      setValue('judul', defaultValues.judul || '');
      setValue('bidang_penelitian', defaultValues.bidang_penelitian || '');
      setValue('pembimbing_1', defaultValues.pembimbing_1 || '');
      setValue('pembimbing_2', defaultValues.pembimbing_2 || '');
    }
  }, [isEditing, defaultValues, setValue]);

  const handleFormSubmit = (data: PengajuanTAFormValues) => {
    // Log the form data being submitted
    console.log("Submitting form data:", data);
    onSubmit(data);
  };

  // Watch for pembimbing_1 to filter pembimbing_2 options
  const pembimbing1 = watch('pembimbing_1');

  // Research fields
  const researchFields = [
    "Data Science",
    "Artificial Intelligence",
    "Computer Network",
    "Mobile Application",
    "Web Development",
    "System Development",
    "Internet of Things",
    "Game Development",
    "Cybersecurity",
    "Human-Computer Interaction"
  ];

  // Log the current dosens data to help debug
  useEffect(() => {
    if (dosens) {
      console.log("Available dosens:", dosens);
    }
  }, [dosens]);

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
              id="bidang_penelitian"
              {...register('bidang_penelitian')}
              error={errors.bidang_penelitian?.message}
            >
              <Option value="">Pilih bidang penelitian</Option>
              {researchFields.map(field => (
                <Option key={field} value={field}>{field}</Option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pembimbing_1">Pembimbing 1</Label>
            <Select
              id="pembimbing_1"
              {...register('pembimbing_1')}
              error={errors.pembimbing_1?.message}
            >
              <Option value="">Pilih pembimbing 1</Option>
              {isLoadingDosens ? (
                <Option value="" disabled>Loading...</Option>
              ) : dosens?.map(dosen => (
                <Option key={dosen.id} value={dosen.user_id}>
                  {dosen.nama_dosen} - {dosen.nip}
                </Option>
              ))}
            </Select>
            {isEditing && (
              <p className="text-xs text-amber-600 mt-1">
                Perhatian: Mengubah pembimbing akan mereset status persetujuan
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pembimbing_2">Pembimbing 2</Label>
            <Select
              id="pembimbing_2"
              {...register('pembimbing_2')}
              error={errors.pembimbing_2?.message}
            >
              <Option value="">Pilih pembimbing 2</Option>
              {isLoadingDosens ? (
                <Option value="" disabled>Loading...</Option>
              ) : dosens?.filter(dosen => dosen.user_id !== pembimbing1).map(dosen => (
                <Option key={dosen.id} value={dosen.user_id}>
                  {dosen.nama_dosen} - {dosen.nip}
                </Option>
              ))}
            </Select>
            {isEditing && (
              <p className="text-xs text-amber-600 mt-1">
                Perhatian: Mengubah pembimbing akan mereset status persetujuan
              </p>
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
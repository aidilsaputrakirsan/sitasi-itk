// components/bimbingan/BimbinganForm.tsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { BimbinganFormValues } from '@/types/bimbingan';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, Option } from "@/components/ui/select";
import { useStudentPengajuanTAforBimbingan } from '@/hooks/useBimbingan';

// Schema validation for the form using Zod
const formSchema = z.object({
  tanggal: z.string().min(1, 'Tanggal bimbingan harus diisi'),
  dosen: z.string().min(1, 'Dosen pembimbing harus dipilih'),
  ket_bimbingan: z.string().min(10, 'Keterangan bimbingan minimal 10 karakter'),
  hasil_bimbingan: z.string().min(10, 'Hasil bimbingan minimal 10 karakter'),
  pengajuan_ta_id: z.string().min(1, 'Tugas akhir harus dipilih')
});

// Define the form values type based on the schema
type FormValues = z.infer<typeof formSchema>;

interface BimbinganFormProps {
  onSubmit: (values: BimbinganFormValues) => void;
  isSubmitting: boolean;
  defaultValues?: Partial<BimbinganFormValues>;
  isEditing?: boolean;
}

export function BimbinganForm({ 
  onSubmit, 
  isSubmitting, 
  defaultValues,
  isEditing = false
}: BimbinganFormProps) {
  // Fetch student's thesis proposals for the dropdown
  const { data: pengajuanList, isLoading: isLoadingPengajuan } = useStudentPengajuanTAforBimbingan();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tanggal: defaultValues?.tanggal || new Date().toISOString().split('T')[0],
      dosen: defaultValues?.dosen || '',
      ket_bimbingan: defaultValues?.ket_bimbingan || '',
      hasil_bimbingan: defaultValues?.hasil_bimbingan || '',
      pengajuan_ta_id: defaultValues?.pengajuan_ta_id || ''
    }
  });

  // For editing mode, set default values
  useEffect(() => {
    if (isEditing && defaultValues) {
      console.log("Setting default values for edit:", defaultValues);
      setValue('tanggal', defaultValues.tanggal || '');
      setValue('dosen', defaultValues.dosen || '');
      setValue('ket_bimbingan', defaultValues.ket_bimbingan || '');
      setValue('hasil_bimbingan', defaultValues.hasil_bimbingan || '');
      setValue('pengajuan_ta_id', defaultValues.pengajuan_ta_id || '');
    }
  }, [isEditing, defaultValues, setValue]);

  const onFormSubmit = (data: FormValues) => {
    console.log("Submitting form data:", data);
    onSubmit(data);
  };

  // Watch the selected thesis proposal to filter eligible supervisors
  const selectedPengajuanId = watch('pengajuan_ta_id');
  
  // Find the selected thesis proposal to get supervisor IDs
  const selectedPengajuan = pengajuanList?.find(p => p.id === selectedPengajuanId);
  
  // Prepare supervisor options based on the selected thesis
  const supervisorOptions = React.useMemo(() => {
    if (!selectedPengajuan) return [];
    
    return [
      { id: selectedPengajuan.pembimbing_1, label: "Pembimbing 1" },
      { id: selectedPengajuan.pembimbing_2, label: "Pembimbing 2" }
    ];
  }, [selectedPengajuan]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Catatan Bimbingan' : 'Catat Bimbingan Baru'}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onFormSubmit)}>
        <CardContent className="space-y-4">
          {/* Tugas Akhir Selection */}
          <div className="space-y-2">
            <Label htmlFor="pengajuan_ta_id">Tugas Akhir</Label>
            <Select
              id="pengajuan_ta_id"
              {...register('pengajuan_ta_id')}
              error={errors.pengajuan_ta_id?.message}
              disabled={isEditing} // Disable changing TA in edit mode
            >
              <Option value="">Pilih Tugas Akhir</Option>
              {isLoadingPengajuan ? (
                <Option value="" disabled>Loading...</Option>
              ) : pengajuanList?.map(pengajuan => (
                <Option key={pengajuan.id} value={pengajuan.id}>
                  {pengajuan.judul}
                </Option>
              ))}
            </Select>
            {errors.pengajuan_ta_id && (
              <p className="text-red-500 text-xs mt-1">{errors.pengajuan_ta_id.message}</p>
            )}
          </div>

          {/* Date field */}
          <div className="space-y-2">
            <Label htmlFor="tanggal">Tanggal Bimbingan</Label>
            <Input 
              id="tanggal" 
              type="date"
              {...register('tanggal')} 
            />
            {errors.tanggal && (
              <p className="text-red-500 text-xs mt-1">{errors.tanggal.message}</p>
            )}
          </div>

          {/* Supervisor field */}
          <div className="space-y-2">
            <Label htmlFor="dosen">Dosen Pembimbing</Label>
            <Select
              id="dosen"
              {...register('dosen')}
              error={errors.dosen?.message}
              disabled={!selectedPengajuan || supervisorOptions.length === 0}
            >
              <Option value="">Pilih Dosen Pembimbing</Option>
              {supervisorOptions.map(option => (
                <Option key={option.id} value={option.id}>
                  {option.label}
                </Option>
              ))}
            </Select>
            {errors.dosen && (
              <p className="text-red-500 text-xs mt-1">{errors.dosen.message}</p>
            )}
            {!selectedPengajuan && (
              <p className="text-amber-500 text-xs mt-1">
                Pilih Tugas Akhir terlebih dahulu untuk melihat dosen pembimbing
              </p>
            )}
          </div>

          {/* Consultation details */}
          <div className="space-y-2">
            <Label htmlFor="ket_bimbingan">Keterangan Bimbingan</Label>
            <Textarea 
              id="ket_bimbingan" 
              placeholder="Deskripsikan topik yang didiskusikan dalam bimbingan" 
              {...register('ket_bimbingan')} 
              rows={4}
            />
            {errors.ket_bimbingan && (
              <p className="text-red-500 text-xs mt-1">{errors.ket_bimbingan.message}</p>
            )}
          </div>

          {/* Consultation results */}
          <div className="space-y-2">
            <Label htmlFor="hasil_bimbingan">Hasil Bimbingan</Label>
            <Textarea 
              id="hasil_bimbingan" 
              placeholder="Deskripsikan hasil/kesimpulan dari bimbingan" 
              {...register('hasil_bimbingan')} 
              rows={4}
            />
            {errors.hasil_bimbingan && (
              <p className="text-red-500 text-xs mt-1">{errors.hasil_bimbingan.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" type="button" onClick={() => window.history.back()}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Simpan Bimbingan'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
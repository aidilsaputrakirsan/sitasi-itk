// components/sempro/PenilaianSemproForm.tsx
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PenilaianSemproFormValues } from '@/types/sempro';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from '@/components/ui/slider';

// Schema validation for the form using Zod
const formSchema = z.object({
  sempro_id: z.string(),
  media_presentasi: z.number().min(0).max(100),
  komunikasi: z.number().min(0).max(100),
  penguasaan_materi: z.number().min(0).max(100),
  isi_laporan_ta: z.number().min(0).max(100),
  struktur_penulisan: z.number().min(0).max(100),
  catatan: z.string().optional()
});

interface PenilaianSemproFormProps {
  onSubmit: (values: PenilaianSemproFormValues) => void;
  isSubmitting: boolean;
  semproId: string;
}

export function PenilaianSemproForm({ 
  onSubmit, 
  isSubmitting,
  semproId
}: PenilaianSemproFormProps) {
  // State for slider values to show in UI
  const [mediaValue, setMediaValue] = useState(70);
  const [komunikasiValue, setKomunikasiValue] = useState(70);
  const [materiValue, setMateriValue] = useState(70);
  const [isiValue, setIsiValue] = useState(70);
  const [strukturValue, setStrukturValue] = useState(70);
  
  // Calculate total score
  const totalScore = (mediaValue + komunikasiValue + materiValue + isiValue + strukturValue) / 5;
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm<PenilaianSemproFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sempro_id: semproId,
      media_presentasi: 70,
      komunikasi: 70,
      penguasaan_materi: 70,
      isi_laporan_ta: 70,
      struktur_penulisan: 70,
      catatan: ''
    }
  });

  // Handle slider changes
  const handleMediaChange = (value: number[]) => {
    const newValue = value[0];
    setMediaValue(newValue);
    setValue('media_presentasi', newValue);
  };
  
  const handleKomunikasiChange = (value: number[]) => {
    const newValue = value[0];
    setKomunikasiValue(newValue);
    setValue('komunikasi', newValue);
  };
  
  const handleMateriChange = (value: number[]) => {
    const newValue = value[0];
    setMateriValue(newValue);
    setValue('penguasaan_materi', newValue);
  };
  
  const handleIsiChange = (value: number[]) => {
    const newValue = value[0];
    setIsiValue(newValue);
    setValue('isi_laporan_ta', newValue);
  };
  
  const handleStrukturChange = (value: number[]) => {
    const newValue = value[0];
    setStrukturValue(newValue);
    setValue('struktur_penulisan', newValue);
  };

  const onFormSubmit = (data: PenilaianSemproFormValues) => {
    console.log("Submitting penilaian form data:", data);
    
    // Make sure all values are numbers (not strings)
    const numericData = {
      ...data,
      media_presentasi: Number(data.media_presentasi),
      komunikasi: Number(data.komunikasi),
      penguasaan_materi: Number(data.penguasaan_materi),
      isi_laporan_ta: Number(data.isi_laporan_ta),
      struktur_penulisan: Number(data.struktur_penulisan)
    };
    
    onSubmit(numericData);
  };

  // Helper function to get color based on score
  const getColorClass = (score: number): string => {
    if (score >= 80) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Penilaian Seminar Proposal</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onFormSubmit)}>
        <CardContent className="space-y-8">
          <input type="hidden" {...register('sempro_id')} value={semproId} />
          
          {/* Media Presentasi */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label htmlFor="media_presentasi" className="text-base font-medium">Media Presentasi</Label>
              <span className={`text-lg font-semibold ${getColorClass(mediaValue)}`}>{mediaValue}</span>
            </div>
            <Slider
              id="media_presentasi"
              defaultValue={[70]}
              max={100}
              step={1}
              onValueChange={handleMediaChange}
              className="w-full"
            />
            <p className="text-sm text-gray-500">
              Kualitas slide presentasi, kerapian, visualisasi, dan kejelasan.
            </p>
          </div>
          
          {/* Komunikasi */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label htmlFor="komunikasi" className="text-base font-medium">Kemampuan Komunikasi</Label>
              <span className={`text-lg font-semibold ${getColorClass(komunikasiValue)}`}>{komunikasiValue}</span>
            </div>
            <Slider
              id="komunikasi"
              defaultValue={[70]}
              max={100}
              step={1}
              onValueChange={handleKomunikasiChange}
              className="w-full"
            />
            <p className="text-sm text-gray-500">
              Kemampuan penyampaian, kejelasan, dan kemampuan menjawab pertanyaan.
            </p>
          </div>
          
          {/* Penguasaan Materi */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label htmlFor="penguasaan_materi" className="text-base font-medium">Penguasaan Materi</Label>
              <span className={`text-lg font-semibold ${getColorClass(materiValue)}`}>{materiValue}</span>
            </div>
            <Slider
              id="penguasaan_materi"
              defaultValue={[70]}
              max={100}
              step={1}
              onValueChange={handleMateriChange}
              className="w-full"
            />
            <p className="text-sm text-gray-500">
              Pemahaman konsep, metodologi penelitian, dan literatur pendukung.
            </p>
          </div>
          
          {/* Isi Laporan TA */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label htmlFor="isi_laporan_ta" className="text-base font-medium">Kualitas Isi Proposal</Label>
              <span className={`text-lg font-semibold ${getColorClass(isiValue)}`}>{isiValue}</span>
            </div>
            <Slider
              id="isi_laporan_ta"
              defaultValue={[70]}
              max={100}
              step={1}
              onValueChange={handleIsiChange}
              className="w-full"
            />
            <p className="text-sm text-gray-500">
              Relevansi penelitian, kebaruan, dan kontribusi terhadap bidang.
            </p>
          </div>
          
          {/* Struktur Penulisan */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label htmlFor="struktur_penulisan" className="text-base font-medium">Struktur Penulisan</Label>
              <span className={`text-lg font-semibold ${getColorClass(strukturValue)}`}>{strukturValue}</span>
            </div>
            <Slider
              id="struktur_penulisan"
              defaultValue={[70]}
              max={100}
              step={1}
              onValueChange={handleStrukturChange}
              className="w-full"
            />
            <p className="text-sm text-gray-500">
              Kesesuaian format, penggunaan bahasa, tata tulis, dan referensi.
            </p>
          </div>
          
          {/* Total Score */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg border">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Total Nilai</h3>
              <span className={`text-2xl font-bold ${getColorClass(totalScore)}`}>
                {totalScore.toFixed(1)}
              </span>
            </div>
          </div>
          
          {/* Catatan */}
          <div className="space-y-2">
            <Label htmlFor="catatan">Catatan dan Saran</Label>
            <Textarea 
              id="catatan" 
              placeholder="Berikan catatan dan saran untuk perbaikan proposal" 
              {...register('catatan')} 
              rows={5}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" type="button" onClick={() => window.history.back()}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : 'Kirim Penilaian'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
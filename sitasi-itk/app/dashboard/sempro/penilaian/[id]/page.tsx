// app/dashboard/sempro/penilaian/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSemproDetail, useSubmitPenilaianSempro } from "@/hooks/useSempro";
// import { Skeleton } from "@/components/ui/skeleton"; // Hapus atau komentari baris ini

// Tambahkan interface untuk PenilaianSempro jika belum ada di types/sempro.ts
interface PenilaianSempro {
  id?: string;
  sempro_id: string;
  user_id: string;
  media_presentasi: number;
  komunikasi: number;
  penguasaan_materi: number;
  isi_laporan_ta: number;
  struktur_penulisan: number;
  nilai_total?: number;
  catatan?: string;
  created_at?: string;
  updated_at?: string;
}

export default function PenilaianSemproDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { session } = useAuth();
  const semproId = params.id as string;
  
  const { data, isLoading, error } = useSemproDetail(semproId);
  const submitPenilaian = useSubmitPenilaianSempro();
  
  const [penilaian, setPenilaian] = useState({
    media_presentasi: 0,
    komunikasi: 0,
    penguasaan_materi: 0,
    isi_laporan_ta: 0,
    struktur_penulisan: 0,
    catatan: "",
  });

  useEffect(() => {
    if (data?.penilaian_sempros && Array.isArray(data.penilaian_sempros)) {
      const myPenilaian = data.penilaian_sempros.find(
        (p: PenilaianSempro) => p.user_id === session?.user.id
      );
      
      if (myPenilaian) {
        setPenilaian({
          media_presentasi: myPenilaian.media_presentasi || 0,
          komunikasi: myPenilaian.komunikasi || 0,
          penguasaan_materi: myPenilaian.penguasaan_materi || 0,
          isi_laporan_ta: myPenilaian.isi_laporan_ta || 0,
          struktur_penulisan: myPenilaian.struktur_penulisan || 0,
          catatan: myPenilaian.catatan || "",
        });
      }
    }
  }, [data, session]);

  const handleSubmit = async () => {
    try {
      await submitPenilaian.mutateAsync({
        sempro_id: semproId,
        ...penilaian,
      });
      
      toast({
        title: "Penilaian berhasil disimpan",
        description: "Terima kasih telah memberikan penilaian",
      });
      
      router.push("/dashboard/sempro/penilaian");
    } catch (error) {
      console.error(error);
      toast({
        title: "Gagal menyimpan penilaian",
        description: "Terjadi kesalahan saat menyimpan penilaian",
        variant: "destructive",
      });
    }
  };

  // Ganti Skeleton dengan div animasi
  if (isLoading) {
    return <div className="w-full h-96 animate-pulse rounded-md bg-gray-200" />;
  }

  if (error || !data) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">Error</h1>
        <p>Data seminar proposal tidak ditemukan.</p>
        <Button
          onClick={() => router.push("/dashboard/sempro/penilaian")}
          className="mt-4"
        >
          Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Card className="mb-8">
        <CardHeader>
          <h1 className="text-xl font-bold">Penilaian Seminar Proposal</h1>
          <h2 className="text-lg">{data.pengajuan_ta?.judul || "Judul tidak tersedia"}</h2>
          <p>Mahasiswa: {data.pengajuan_ta?.mahasiswa?.nama || "Nama tidak tersedia"} ({data.pengajuan_ta?.mahasiswa?.nim || "NIM tidak tersedia"})</p>
        </CardHeader>
        
        {/* Sisa kode tetap sama... */}
      </Card>
    </div>
  );
}
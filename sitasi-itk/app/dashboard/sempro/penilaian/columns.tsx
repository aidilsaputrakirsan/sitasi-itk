// app/dashboard/sempro/penilaian/columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { SemproStatusBadge } from "@/components/sempro/SemproStatusBadge";
import { StatusSempro } from "@/types/sempro"; // Import dari types/sempro.ts

export type SemproListItem = {
  id: string;
  pengajuan_ta?: {
    id: string;
    judul: string;
    bidang_penelitian: string;
  };
  mahasiswa?: {
    nama: string;
    nim: string;
  };
  tanggal: string;
  ruangan: string;
  waktu: string;
  status: string;
  semproId?: string;
  isPenilaianSubmitted?: boolean;
};

// Helper function untuk validasi status
const getValidStatus = (status: string): StatusSempro => {
  // Daftar nilai yang valid untuk StatusSempro berdasarkan definisi type
  const validStatusValues: StatusSempro[] = [
    'registered', 
    'evaluated', 
    'verified',
    'scheduled', 
    'completed', 
    'revision_required',
    'rejected',
    'approved'
  ];
  
  // Cek apakah nilai status valid, jika tidak gunakan default
  return validStatusValues.includes(status as StatusSempro) 
    ? status as StatusSempro 
    : 'registered';
};

export const columns: ColumnDef<SemproListItem>[] = [
  {
    accessorKey: "pengajuan_ta.judul",
    header: "Judul TA",
    cell: ({ row }) => {
      const data = row.original;
      return data.pengajuan_ta?.judul || "-";
    }
  },
  {
    accessorKey: "mahasiswa.nama",
    header: "Mahasiswa",
    cell: ({ row }) => {
      const data = row.original;
      return (
        <div>
          <div>{data.mahasiswa?.nama || "-"}</div>
          <div className="text-sm text-gray-500">{data.mahasiswa?.nim || "-"}</div>
        </div>
      );
    }
  },
  {
    accessorKey: "tanggal",
    header: "Tanggal",
  },
  {
    accessorKey: "waktu",
    header: "Waktu",
  },
  {
    accessorKey: "ruangan",
    header: "Ruangan",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return <SemproStatusBadge status={getValidStatus(status)} />;
    }
  },
  {
    id: "actions",
    header: "Aksi",
    cell: ({ row }) => {
      const data = row.original;
      const router = useRouter();
      
      if (!data.semproId) {
        return <span className="text-gray-500">Belum terdaftar sempro</span>;
      }
      
      return (
        <div className="flex space-x-2">
          <Button 
            onClick={() => router.push(`/dashboard/sempro/penilaian/${data.semproId}`)}
            variant={data.isPenilaianSubmitted ? "outline" : "default"}
          >
            {data.isPenilaianSubmitted ? "Edit Nilai" : "Nilai Sempro"}
          </Button>
        </div>
      );
    }
  }
];
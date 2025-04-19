"use client";

import { Button } from "@/components/ui/button";
import { SemproStatusBadge } from "@/components/sempro/SemproStatusBadge";
import { useRouter } from "next/navigation";
import { Sempro, JadwalSempro, StatusSempro } from "@/types/sempro";

// Definisi type untuk data row
interface RowData {
  original: Sempro | JadwalSempro | {
    mahasiswa?: { nama?: string; nim?: string };
    sempro?: Sempro;
    pengajuan_ta?: { judul?: string };
    status?: string;
    isPenilaianSubmitted?: boolean;
  };
}

export const columns = [
  {
    accessorKey: "mahasiswa.nama",
    header: "Nama Mahasiswa",
    cell: ({ row }: { row: RowData }) => {
      const mahasiswa = row.original.mahasiswa ||
                        (row.original as any).sempro?.mahasiswa;
      return <div>{mahasiswa?.nama || '-'}</div>;
    },
  },
  {
    accessorKey: "mahasiswa.nim",
    header: "NIM",
    cell: ({ row }: { row: RowData }) => {
      const mahasiswa = row.original.mahasiswa ||
                        (row.original as any).sempro?.mahasiswa;
      return <div>{mahasiswa?.nim || '-'}</div>;
    },
  },
  {
    accessorKey: "pengajuan_ta.judul",
    header: "Judul Proposal",
    cell: ({ row }: { row: RowData }) => {
      const judul = row.original.pengajuan_ta?.judul ||
                   (row.original as any).sempro?.pengajuan_ta?.judul;
      return <div className="max-w-md truncate">{judul || '-'}</div>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }: { row: RowData }) => {
      let status;
      // Determine status from the complex data structure
      if ('status' in row.original && row.original.status) {
        status = row.original.status;
      } else if ('sempro' in row.original && row.original.sempro && 'status' in row.original.sempro) {
        status = row.original.sempro.status;
      } else {
        status = 'registered'; // Default fallback
      }
     
      // Define valid status values for type safety
      const validStatuses: StatusSempro[] = [
        'registered', 'evaluated', 'verified', 'scheduled',
        'completed', 'revision_required', 'rejected', 'approved'
      ];
     
      // Validate and ensure we return a valid StatusSempro type
      const validStatus = validStatuses.includes(status as StatusSempro)
        ? (status as StatusSempro)
        : ('registered' as StatusSempro);
       
      return <SemproStatusBadge status={validStatus} />;
    },
  },
  {
    id: "actions",
    header: "Aksi",
    cell: ({ row }: { row: RowData }) => {
      const router = useRouter();
      const sempro = (row.original as any).sempro || row.original;
      const id = sempro.id;
      const isPenilaianSubmitted = (row.original as any).isPenilaianSubmitted;
     
      return (
        <div className="flex space-x-2">
          <Button
            variant={isPenilaianSubmitted ? "outline" : "default"}
            onClick={() => router.push(`/dashboard/sempro/penilaian/${id}`)}
          >
            {isPenilaianSubmitted ? "Lihat Penilaian" : "Nilai Sempro"}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/sempro/request-revision/${id}`)}
          >
            Revisi
          </Button>
        </div>
      );
    },
  },
];
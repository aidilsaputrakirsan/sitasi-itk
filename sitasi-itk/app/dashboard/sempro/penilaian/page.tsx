// app/dashboard/sempro/penilaian/page.tsx
"use client";

import { useState } from "react";
import { DataTable } from "@/components/DataTable";
import { columns } from "./columns";
import { useDosenSempros } from "@/hooks/useSempro";
import { Skeleton } from "@/components/ui/skeleton";

export default function PenilaianSemproPage() {
  const { data, isLoading, error } = useDosenSempros();
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredData = data?.filter((item) => {
    const searchableFields = [
      item.pengajuan_ta?.judul,
      item.mahasiswa?.nama,
      item.mahasiswa?.nim,
    ];
    
    return searchableFields.some(
      (field) => field && field.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  if (isLoading) {
    return <Skeleton className="w-full h-96" />;
  }

  if (error) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">Error</h1>
        <p>Terjadi kesalahan saat memuat data.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Penilaian Seminar Proposal</h1>
      
      <div className="mb-4">
        <input
          type="text"
          placeholder="Cari berdasarkan judul, nama, atau NIM..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      
      <DataTable columns={columns} data={filteredData || []} />
    </div>
  );
}
// components/sempro/SemproStatusBadge.tsx
import { StatusSempro } from "@/types/sempro";

interface SemproStatusBadgeProps {
  status: StatusSempro;
  className?: string;
}

export function SemproStatusBadge({ status, className = "" }: SemproStatusBadgeProps) {
  let bgColor = "";
  let textColor = "";
  let label = "";

  switch (status) {
    case "registered":
      bgColor = "bg-blue-100";
      textColor = "text-blue-800";
      label = "Terdaftar";
      break;
    case "verified":
      bgColor = "bg-purple-100";
      textColor = "text-purple-800";
      label = "Terverifikasi";
      break;
    case "scheduled":
      bgColor = "bg-orange-100";
      textColor = "text-orange-800";
      label = "Terjadwal";
      break;
    case "completed":
      bgColor = "bg-green-100";
      textColor = "text-green-800";
      label = "Selesai";
      break;
    case "revision_required":
      bgColor = "bg-amber-100";
      textColor = "text-amber-800";
      label = "Perlu Revisi";
      break;
    case "rejected": // Nilai khusus frontend untuk pendaftaran ditolak
      bgColor = "bg-red-100";
      textColor = "text-red-800";
      label = "Ditolak";
      break;
    case "approved": // Nilai untuk seminar yang telah disetujui pembimbing
      bgColor = "bg-emerald-100";
      textColor = "text-emerald-800";
      label = "Disetujui";
      break;
    default:
      bgColor = "bg-gray-100";
      textColor = "text-gray-800";
      label = "Status Tidak Diketahui";
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor} ${className}`}
    >
      {label}
    </span>
  );
}
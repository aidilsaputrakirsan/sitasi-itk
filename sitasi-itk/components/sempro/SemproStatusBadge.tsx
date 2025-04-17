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
    case "evaluated": // Menggunakan nilai database yang benar
      bgColor = "bg-purple-100";
      textColor = "text-purple-800";
      label = "Terverifikasi"; // Label tetap sama untuk konsistensi UI
      break;
    case "revision_required":
      bgColor = "bg-amber-100";
      textColor = "text-amber-800";
      label = "Perlu Revisi";
      break;
    case "rejected":
      bgColor = "bg-red-100";
      textColor = "text-red-800";
      label = "Ditolak";
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
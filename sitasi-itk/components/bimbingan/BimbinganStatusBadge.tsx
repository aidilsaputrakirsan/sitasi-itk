// components/bimbingan/BimbinganStatusBadge.tsx
import { StatusBimbingan } from "@/types/bimbingan";

interface BimbinganStatusBadgeProps {
  status: StatusBimbingan;
}

export function BimbinganStatusBadge({ status }: BimbinganStatusBadgeProps) {
  let bgColor = "";
  let textColor = "";
  let label = "";

  switch (status) {
    case "pending":
      bgColor = "bg-yellow-100";
      textColor = "text-yellow-800";
      label = "Menunggu Persetujuan";
      break;
    case "approved":
      bgColor = "bg-green-100";
      textColor = "text-green-800";
      label = "Disetujui";
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
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}
    >
      {label}
    </span>
  );
}
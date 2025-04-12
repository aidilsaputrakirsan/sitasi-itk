// components/StatusBadge.tsx
import React from 'react';
import { StatusPengajuan } from '@/types/pengajuan-ta';

interface StatusBadgeProps {
  status: StatusPengajuan;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  let badgeClasses = "px-2 py-1 text-xs font-medium rounded-full ";
  
  switch (status) {
    case 'submitted':
      badgeClasses += "bg-blue-100 text-blue-800";
      break;
    case 'approved_pembimbing1':
      badgeClasses += "bg-indigo-100 text-indigo-800";
      break;
    case 'approved_pembimbing2':
      badgeClasses += "bg-purple-100 text-purple-800";
      break;
    case 'approved':
      badgeClasses += "bg-green-100 text-green-800";
      break;
    case 'revision':
      badgeClasses += "bg-yellow-100 text-yellow-800";
      break;
    case 'rejected':
      badgeClasses += "bg-red-100 text-red-800";
      break;
    case 'completed':
      badgeClasses += "bg-gray-100 text-gray-800";
      break;
    default:
      badgeClasses += "bg-gray-100 text-gray-800";
  }
  
  return (
    <span className={`${badgeClasses} ${className}`}>
      {getStatusLabel(status)}
    </span>
  );
}

export function getStatusLabel(status: StatusPengajuan): string {
  switch (status) {
    case 'submitted':
      return 'Diajukan';
    case 'approved_pembimbing1':
      return 'Disetujui Pembimbing 1';
    case 'approved_pembimbing2':
      return 'Disetujui Pembimbing 2';
    case 'approved':
      return 'Disetujui';
    case 'revision':
      return 'Revisi';
    case 'rejected':
      return 'Ditolak';
    case 'completed':
      return 'Selesai';
    default:
      return status;
  }
}
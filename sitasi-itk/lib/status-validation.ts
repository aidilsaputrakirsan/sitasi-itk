// lib/status-validation.ts - Helper untuk validasi transisi status
import { StatusSempro } from '@/types/sempro';
import { UserRole } from '@/types/auth';

/**
 * Helper untuk validasi transisi status sempro
 * Memastikan bahwa perubahan status hanya dapat dilakukan oleh peran yang sesuai
 * dan mengikuti alur yang benar
 */

// Definisi transisi status yang diizinkan berdasarkan peran
const allowedStatusTransitions: Record<StatusSempro, Partial<Record<UserRole, StatusSempro[]>>> = {
  'registered': {
    'tendik': ['verified', 'rejected'],
    'koorpro': ['verified', 'rejected'],
    'dosen': [],
    'mahasiswa': []
  },
  'verified': {
    'tendik': ['scheduled', 'rejected'],
    'koorpro': ['scheduled', 'rejected'],
    'dosen': [],
    'mahasiswa': []
  },
  'scheduled': {
    'tendik': ['rejected'],
    'koorpro': ['rejected'],
    'dosen': [], // Status akan berubah menjadi completed otomatis setelah semua penilaian
    'mahasiswa': []
  },
  'completed': {
    'tendik': [],
    'koorpro': [],
    'dosen': ['revision_required'], // Dosen bisa meminta revisi
    'mahasiswa': [] // Approve pembimbing akan berubah menjadi approved otomatis
  },
  'revision_required': {
    'tendik': [],
    'koorpro': [],
    'dosen': [],
    'mahasiswa': ['registered'] // Setelah submit revisi, kembali ke registered
  },
  'rejected': {
    'tendik': ['registered'], // Admin bisa mengembalikan ke registered
    'koorpro': ['registered'],
    'dosen': [],
    'mahasiswa': []
  },
  'approved': {
    'tendik': [],
    'koorpro': [],
    'dosen': [],
    'mahasiswa': []
  }
};

/**
 * Memeriksa apakah transisi status diizinkan
 * @param currentStatus Status saat ini
 * @param newStatus Status baru yang diinginkan
 * @param userRole Peran pengguna
 * @returns Boolean yang menunjukkan apakah transisi diizinkan
 */
export function isValidStatusTransition(
  currentStatus: StatusSempro,
  newStatus: StatusSempro,
  userRole: UserRole
): boolean {
  // Jika status tidak berubah, selalu valid
  if (currentStatus === newStatus) {
    return true;
  }
  
  // Cek apakah peran pengguna memiliki hak untuk mengubah status
  const allowedTransitions = allowedStatusTransitions[currentStatus]?.[userRole];
  if (!allowedTransitions) {
    return false;
  }
  
  // Cek apakah transisi ke status baru diizinkan
  return allowedTransitions.includes(newStatus);
}

/**
 * Mendapatkan status yang dapat diubah berdasarkan peran
 * @param currentStatus Status saat ini
 * @param userRole Peran pengguna
 * @returns Array status yang dapat diubah
 */
export function getPossibleStatusTransitions(
  currentStatus: StatusSempro,
  userRole: UserRole
): StatusSempro[] {
  return allowedStatusTransitions[currentStatus]?.[userRole] || [];
}

/**
 * Mendapatkan deskripsi alasan untuk transisi status
 * @param currentStatus Status saat ini
 * @param newStatus Status baru
 * @returns Deskripsi alasan
 */
export function getStatusTransitionReason(
  currentStatus: StatusSempro,
  newStatus: StatusSempro
): string {
  const transitions: Record<string, string> = {
    'registered_verified': 'Dokumen telah diverifikasi dan lengkap',
    'registered_rejected': 'Dokumen ditolak karena tidak memenuhi syarat',
    'verified_scheduled': 'Seminar telah dijadwalkan',
    'verified_rejected': 'Pembatalan verifikasi',
    'scheduled_completed': 'Semua penilaian telah selesai',
    'completed_revision_required': 'Revisi diperlukan berdasarkan hasil seminar',
    'completed_approved': 'Seminar disetujui oleh kedua pembimbing',
    'revision_required_registered': 'Revisi telah diupload dan menunggu verifikasi',
    'rejected_registered': 'Pengajuan ulang setelah perbaikan'
  };
  
  const key = `${currentStatus}_${newStatus}`;
  return transitions[key] || 'Status diperbarui';
}
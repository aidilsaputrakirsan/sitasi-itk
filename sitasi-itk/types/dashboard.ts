// types/dashboard.ts
import { UserRole } from './auth';

export interface DashboardStats {
  pengajuan: number;
  bimbingan: number;
  sempro: number;
  sidang: number;
}

export interface StatCardData {
  title: string;
  value: string | number;
  percentChange?: string | null;
  isIncreasing?: boolean;
  description?: string;
}

export interface ChartDataPoint {
  bulan: string;
  pendaftar: number;
  terverifikasi: number;
  terjadwal: number;
  selesai: number;
}

export interface BimbinganChartData {
  minggu: string;
  frekuensi: number;
}

export interface PieChartData {
  name: string;
  value: number;
}

export interface PeriodeCountdownData {
  nama: string;
  tanggalBerakhir: string;
}

export interface RoleDashboardStats {
  periodeAktif: PeriodeCountdownData;
  mahasiswa: {
    pengajuanTA: { total: number; change: string | null };
    bimbingan: { total: number; change: string | null };
    sempro: { total: number; change: string | null };
    sidang: { total: number; change: string | null };
  };
  dosen: {
    mahasiswaBimbingan: { total: number; change: string | null };
    pengajuanMenunggu: { total: number; change: string | null };
    jadwalSempro: { total: number; change: string | null };
    jadwalSidang: { total: number; change: string | null };
  };
  admin: {
    totalMahasiswaTA: { total: number; change: string | null };
    pendaftaranSempro: { total: number; change: string | null };
    pendaftaranSidang: { total: number; change: string | null };
    periodeBerjalan: { total: number; change: string | null };
  };
}
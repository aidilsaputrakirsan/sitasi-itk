// types/pengajuan-ta.ts

export type StatusPengajuan = 
  | 'submitted'  // Submitted but not yet approved
  | 'approved'   // Approved by both supervisors
  | 'revision'   // Needs revision
  | 'rejected'   // Rejected
  | 'completed'; // Completed

export interface PengajuanTA {
  id: string;
  judul: string;
  bidang_penelitian: string;
  mahasiswa_id: string;
  pembimbing_1: string;
  pembimbing_2: string;
  status: StatusPengajuan;
  approve_pembimbing1: boolean;
  approve_pembimbing2: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  mahasiswa?: {
    nama: string;
    nim: string;
    email: string;
    nomor_telepon?: string;
  };
  dosen_pembimbing1?: {
    nama_dosen: string;
    nip: string;
    email: string;
  };
  dosen_pembimbing2?: {
    nama_dosen: string;
    nip: string;
    email: string;
  };
}

export interface PengajuanTAFormValues {
  judul: string;
  bidang_penelitian: string;
  pembimbing_1: string;
  pembimbing_2: string;
}

export interface RiwayatPengajuan {
  id: string;
  pengajuan_ta_id: string;
  user_id: string;
  riwayat: string;
  keterangan: string;
  status: string;
  created_at: string;
  updated_at: string;
  user?: {
    name: string;
  };
}
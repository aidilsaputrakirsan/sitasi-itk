// types/bimbingan.ts

export type StatusBimbingan = 
  | 'pending'   // Waiting for approval from supervisor
  | 'approved'  // Approved by supervisor
  | 'rejected'; // Rejected by supervisor

export interface Bimbingan {
  id: string;
  user_id: string;
  pengajuan_ta_id: string;
  tanggal: string;
  dosen: string;
  ket_bimbingan: string;
  hasil_bimbingan: string;
  status: StatusBimbingan;
  created_at: string;
  updated_at: string;
  // Relations
  mahasiswa?: {
    id?: string;
    user_id?: string;
    nama: string;
    nim: string;
    email: string;
    nomor_telepon?: string;
  };
  dosen_pembimbing?: {
    id?: string;
    user_id?: string;
    nama_dosen: string;
    nip: string;
    email: string;
  };
  pengajuan_ta?: {
    id: string;
    judul: string;
    bidang_penelitian: string;
  };
}

export interface BimbinganFormValues {
  tanggal: string;
  dosen: string;
  ket_bimbingan: string;
  hasil_bimbingan: string;
  pengajuan_ta_id: string;
}
// types/sempro.ts

// types/sempro.ts - Definisi tipe StatusSempro
export type StatusSempro = 
  | 'registered'         // Awal pendaftaran
  | 'evaluated'          // Dokumen terverifikasi di database
  | 'verified'           // Nilai frontend untuk 'evaluated'
  | 'scheduled'          // Sudah dijadwalkan
  | 'completed'          // Seminar selesai
  | 'revision_required'  // Perlu revisi
  | 'rejected'           // Nilai frontend untuk penolakan
  | 'approved';          // Disetujui oleh pembimbing

export interface FileMetadata {
  fileId: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
}

export interface Sempro {
  id: string;
  user_id: string;
  pengajuan_ta_id: string;
  status: StatusSempro;
  tanggal: string; // Sesuai database, bukan tanggal_daftar
  // catatan: string | null; // Hapus jika tidak ada di database
  
  // Nama field sesuai database
  form_ta_012: string | null;
  bukti_plagiasi: string | null;
  proposal_ta: string | null;

  revisi_pembimbing_1: string | null;
  revisi_pembimbing_2: string | null;
  revisi_penguji_1: string | null;
  revisi_penguji_2: string | null;

  approve_pembimbing_1: boolean | null;
  approve_pembimbing_2: boolean | null;
  
  // Keep these for backwards compatibility (jika kode lain masih menggunakannya)
  dokumen_ta012?: FileMetadata | null;
  dokumen_plagiarisme?: FileMetadata | null; 
  dokumen_draft?: FileMetadata | null;
  
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
  pengajuan_ta?: {
    id: string;
    judul: string;
    bidang_penelitian: string;
    pembimbing_1: string;
    pembimbing_2: string;
  };
}

export interface JadwalSempro {
  id: string;
  periode_id: string;
  pengajuan_ta_id: string;
  user_id: string;
  penguji_1: string;
  penguji_2: string;
  tanggal_sempro: string;
  waktu_mulai: string;
  waktu_selesai: string;
  ruangan: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  sempro?: Sempro;
  mahasiswa?: {
    id?: string;
    user_id?: string;
    nama: string;
    nim: string;
    email: string;
    nomor_telepon?: string;
  };
  penguji1?: {
    id?: string;
    user_id?: string;
    nama_dosen: string;
    nip: string;
    email: string;
  };
  penguji2?: {
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

export interface SemproFormValues {
  pengajuan_ta_id: string;
  catatan?: string;
  dokumen_ta012?: File | null;
  dokumen_plagiarisme?: File | null;
  dokumen_draft?: File | null;
  // Tambahkan properti metadata (opsional)
  dokumen_ta012_metadata?: FileMetadata;
  dokumen_plagiarisme_metadata?: FileMetadata;
  dokumen_draft_metadata?: FileMetadata;
}

export interface PenilaianSempro {
  id: string;
  sempro_id: string;
  user_id: string;  // Dosen penguji yang memberi nilai
  media_presentasi: number;
  komunikasi: number;
  penguasaan_materi: number;
  isi_laporan_ta: number;
  struktur_penulisan: number;
  nilai_total: number | null;  // Dihitung otomatis backend
  catatan: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  dosen?: {
    id?: string;
    user_id?: string;
    nama_dosen: string;
    nip: string;
    email: string;
  };
  sempro_detail?: Sempro;
}

export interface PeriodeSempro {
  id: string;
  nama_periode: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RiwayatPendaftaranSempro {
  id: string;
  sempro_id: string;
  user_id: string;
  keterangan: string;
  status: StatusSempro;
  created_at: string;
  updated_at?: string;
  user?: {
    name: string;
  };
}

export interface JadwalSemproFormValues {
  periode_id: string;
  pengajuan_ta_id: string;
  user_id: string;
  penguji_1: string;
  penguji_2: string;
  tanggal_sempro: string;
  waktu_mulai: string;
  waktu_selesai: string;
  ruangan: string;
  is_published?: boolean;
}

export interface PenilaianSemproFormValues {
  sempro_id: string;
  media_presentasi: number;
  komunikasi: number;
  penguasaan_materi: number;
  isi_laporan_ta: number;
  struktur_penulisan: number;
  catatan?: string;
}

export interface PeriodeSemproFormValues {
  nama_periode: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  is_active: boolean;
}

export interface SemproRevisionFormValues {
  catatan?: string;
  dokumen_ta012?: File | null;
  dokumen_plagiarisme?: File | null;
  dokumen_draft?: File | null;
  dokumen_ta012_metadata?: FileMetadata | null; // Ubah dari FileMetadata menjadi FileMetadata | null
  dokumen_plagiarisme_metadata?: FileMetadata | null; // Ubah dari FileMetadata menjadi FileMetadata | null
  dokumen_draft_metadata?: FileMetadata | null; // Ubah dari FileMetadata menjadi FileMetadata | null
}

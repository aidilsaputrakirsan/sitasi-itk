// types/dosen.ts

export interface Dosen {
    id: string;
    user_id: string;
    nama_dosen: string;
    nip: string;
    email: string;
    created_at: string;
    updated_at: string;
    // Relations
    profiles?: {
      name: string;
      photo_url?: string;
    }
  }
  
  export interface DosenFormValues {
    nama_dosen: string;
    nip: string;
    email: string;
    user_id?: string;
  }
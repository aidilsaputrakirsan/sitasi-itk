import { Session, User } from '@supabase/supabase-js';

export type UserRole = 'mahasiswa' | 'dosen' | 'tendik' | 'koorpro';

export interface UserProfile {
  id: string;
  name: string;
  username?: string;
  photo_url?: string;
  signature_url?: string;
  roles: UserRole[];
  email?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthState {
  user: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  error: Error | null;
}

export interface MahasiswaProfile {
  id: string;
  user_id: string;
  nama: string;
  nim: string;
  email: string;
  nomor_telepon?: string;
}

export interface DosenProfile {
  id: string;
  user_id: string;
  nama_dosen: string;
  nip: string;
  email: string;
}

export interface TendikProfile {
  id: string;
  user_id: string;
  nama_tendik: string;
  nip: string;
  email: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  username?: string;
}

export interface ResetPasswordCredentials {
  email: string;
}

export interface UpdatePasswordCredentials {
  password: string;
}
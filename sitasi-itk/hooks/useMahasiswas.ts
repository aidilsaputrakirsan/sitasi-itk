// hooks/useMahasiswas.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export type Mahasiswa = {
  id: string;
  nama: string;
  nim: string;
  email: string;
  nomor_telepon?: string;
  user_id: string;
  profiles?: {
    name: string;
    photo_url?: string;
  }
};

// Fetch all students
export function useMahasiswas() {
  return useQuery({
    queryKey: ['mahasiswas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mahasiswas')
        .select(`
          id, 
          nama, 
          nim, 
          email, 
          nomor_telepon,
          user_id,
          profiles:user_id (
            name,
            photo_url
          )
        `)
        .order('nama');
      
      if (error) throw error;
      
      return data as unknown as Mahasiswa[];
    },
  });
}

// Fetch a single student by ID
export function useMahasiswaDetail(id: string) {
  return useQuery({
    queryKey: ['mahasiswas', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mahasiswas')
        .select(`
          id, 
          nama, 
          nim, 
          email, 
          nomor_telepon,
          user_id,
          profiles:user_id (
            name,
            photo_url
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return data as unknown as Mahasiswa;
    },
    enabled: !!id,
  });
}

// Fetch a student by user_id
export function useMahasiswaByUserId(userId: string) {
  return useQuery({
    queryKey: ['mahasiswas', 'user', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mahasiswas')
        .select(`
          id, 
          nama, 
          nim, 
          email, 
          nomor_telepon,
          user_id,
          profiles:user_id (
            name,
            photo_url
          )
        `)
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      
      return data as unknown as Mahasiswa;
    },
    enabled: !!userId,
  });
}
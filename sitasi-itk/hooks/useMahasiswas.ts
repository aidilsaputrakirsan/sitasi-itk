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
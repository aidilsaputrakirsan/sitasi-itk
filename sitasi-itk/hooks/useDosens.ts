// hooks/useDosens.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export type Dosen = {
  id: string;
  nama_dosen: string;
  nip: string;
  email: string;
  user_id: string;
  profiles?: {
    name: string;
    photo_url?: string;
  }
};

// Fetch all lecturers
export function useDosens() {
  return useQuery({
    queryKey: ['dosens'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dosens')
        .select(`
          id, 
          nama_dosen, 
          nip, 
          email,
          user_id,
          profiles:user_id (
            name,
            photo_url
          )
        `)
        .order('nama_dosen');
      
      if (error) throw error;
      
      return data as unknown as Dosen[];
    },
  });
}

// Fetch a single lecturer by ID
export function useDosenDetail(id: string) {
  return useQuery({
    queryKey: ['dosens', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dosens')
        .select(`
          id, 
          nama_dosen, 
          nip, 
          email,
          user_id,
          profiles:user_id (
            name,
            photo_url
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return data as unknown as Dosen;
    },
    enabled: !!id,
  });
}

// Fetch a lecturer by user_id
export function useDosenByUserId(userId: string) {
  return useQuery({
    queryKey: ['dosens', 'user', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dosens')
        .select(`
          id, 
          nama_dosen, 
          nip, 
          email,
          user_id,
          profiles:user_id (
            name,
            photo_url
          )
        `)
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      
      return data as unknown as Dosen;
    },
    enabled: !!userId,
  });
}
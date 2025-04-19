// hooks/useDosens.ts
'use client';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Definisi tipe tanpa jabatan
export type Dosen = {
  id: string;
  nama_dosen: string;
  nip: string;
  email: string;
  user_id: string;
  // Hapus jabatan karena tidak ada di database
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
      try {
        // Hapus jabatan dari query
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

        // Transformasi data
        const transformedData = data.map(dosen => ({
          ...dosen,
          profiles: dosen.profiles && dosen.profiles.length > 0 
            ? dosen.profiles[0] 
            : undefined
        }));
       
        return transformedData as Dosen[];
      } catch (error) {
        console.error('Error fetching dosens:', error);
        throw error;
      }
    },
  });
}

// Fetch a single lecturer by ID
export function useDosenDetail(id: string) {
  return useQuery({
    queryKey: ['dosens', id],
    queryFn: async () => {
      try {
        // Hapus jabatan dari query
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

        // Transformasi data
        const transformedData = {
          ...data,
          profiles: data.profiles && data.profiles.length > 0 
            ? data.profiles[0] 
            : undefined
        };
       
        return transformedData as Dosen;
      } catch (error) {
        console.error(`Error fetching dosen with id ${id}:`, error);
        throw error;
      }
    },
    enabled: !!id,
  });
}

// Fetch a lecturer by user_id
export function useDosenByUserId(userId: string) {
  return useQuery({
    queryKey: ['dosens', 'user', userId],
    queryFn: async () => {
      try {
        // Hapus jabatan dari query
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
       
        if (error) {
          // If no data found, return null instead of throwing an error
          if (error.code === 'PGRST116') {
            return null;
          }
          throw error;
        }

        if (!data) return null;

        // Transformasi data
        const transformedData = {
          ...data,
          profiles: data.profiles && data.profiles.length > 0 
            ? data.profiles[0] 
            : undefined
        };
       
        return transformedData as Dosen;
      } catch (error) {
        console.error(`Error fetching dosen with user_id ${userId}:`, error);
        throw error;
      }
    },
    enabled: !!userId,
  });
}
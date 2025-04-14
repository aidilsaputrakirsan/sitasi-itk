// hooks/useBimbingan.ts
'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Bimbingan, BimbinganFormValues } from '../types/bimbingan';
import { useToast } from './use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/auth';

// Fetch all consultations (for admin users)
export function useAllBimbingans() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['bimbingans', 'all', user?.id],
    queryFn: async () => {
      try {
        console.log("Fetching all consultation records for admin");
        
        // Verify if user has admin access
        if (!user?.roles.includes('tendik') && !user?.roles.includes('koorpro')) {
          console.log("User does not have admin access", user?.roles);
        }
        
        // Perform the query with basic joins
        const { data, error } = await supabase
          .from('bimbingans')
          .select(`
            *,
            pengajuan_ta:pengajuan_ta_id(judul, bidang_penelitian)
          `)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error("Error fetching all consultations:", error);
          throw error;
        }
        
        // Enhance data with mahasiswa and dosen details
        const enhancedData = await Promise.all(data.map(async (bimbingan) => {
          try {
            // Get mahasiswa data
            const { data: mahasiswaData, error: mahasiswaError } = await supabase
              .from('mahasiswas')
              .select('nama, nim, email, nomor_telepon')
              .eq('user_id', bimbingan.user_id)
              .single();
              
            // Get dosen data
            const { data: dosenData, error: dosenError } = await supabase
              .from('dosens')
              .select('nama_dosen, nip, email')
              .eq('user_id', bimbingan.dosen)
              .single();
              
            return {
              ...bimbingan,
              mahasiswa: mahasiswaError ? null : mahasiswaData,
              dosen_pembimbing: dosenError ? null : dosenData
            };
          } catch (err) {
            console.error(`Error enhancing bimbingan ID ${bimbingan.id}:`, err);
            return bimbingan;
          }
        }));
        
        console.log(`Found ${enhancedData.length} consultation records`);
        return enhancedData as Bimbingan[];
      } catch (error) {
        console.error("Unexpected error in useAllBimbingans:", error);
        return [];
      }
    },
    enabled: !!user && (user.roles.includes('tendik') || user.roles.includes('koorpro')),
  });
}

// Fetch consultations for a specific student
export function useStudentBimbingans() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['bimbingans', 'student', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        console.log("Fetching consultations for student with user ID:", user.id);
        
        // Query for the user's consultations
        const { data, error } = await supabase
          .from('bimbingans')
          .select(`
            *,
            pengajuan_ta:pengajuan_ta_id(judul, bidang_penelitian)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error("Error fetching student consultations:", error);
          throw error;
        }
        
        // Setelah mendapatkan data bimbingan, tambahkan data dosen secara manual
        const enhancedData = await Promise.all(data.map(async (bimbingan) => {
          try {
            // Ambil data dosen dengan query terpisah
            const { data: dosenData, error: dosenError } = await supabase
              .from('dosens')
              .select('nama_dosen, nip, email')
              .eq('user_id', bimbingan.dosen)
              .single();
              
            if (dosenError) {
              console.error("Error fetching dosen data:", dosenError);
              return {
                ...bimbingan,
                dosen_pembimbing: null
              };
            }
            
            return {
              ...bimbingan,
              dosen_pembimbing: dosenData
            };
          } catch (err) {
            console.error("Error enhancing bimbingan data:", err);
            return bimbingan;
          }
        }));
        
        console.log(`Found ${enhancedData.length} consultations for student`);
        return enhancedData as Bimbingan[];
      } catch (error) {
        console.error("Error in useStudentBimbingans:", error);
        return [];
      }
    },
    enabled: !!user && user.roles.includes('mahasiswa'),
  });
}

// Fetch consultations for a specific supervisor (dosen)
export function useDosenBimbingans() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['bimbingans', 'dosen', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        console.log("Fetching consultations for supervisor with user ID:", user.id);
        
        // Query for consultations where the user is the supervisor
        const { data, error } = await supabase
          .from('bimbingans')
          .select(`
            *,
            pengajuan_ta:pengajuan_ta_id(judul, bidang_penelitian)
          `)
          .eq('dosen', user.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error("Error fetching supervisor consultations:", error);
          throw error;
        }
        
        // Tambahkan data mahasiswa secara manual
        const enhancedData = await Promise.all(data.map(async (bimbingan) => {
          try {
            // Ambil data mahasiswa melalui user_id
            const { data: mahasiswaData, error: mahasiswaError } = await supabase
              .from('mahasiswas')
              .select('nama, nim, email, nomor_telepon')
              .eq('user_id', bimbingan.user_id)
              .single();
              
            if (mahasiswaError) {
              console.error("Error fetching mahasiswa data:", mahasiswaError);
              return bimbingan;
            }
            
            return {
              ...bimbingan,
              mahasiswa: mahasiswaData
            };
          } catch (err) {
            console.error("Error enhancing bimbingan data with mahasiswa:", err);
            return bimbingan;
          }
        }));
        
        console.log(`Found ${enhancedData.length} consultations for supervisor`);
        return enhancedData as Bimbingan[];
      } catch (error) {
        console.error("Error in useDosenBimbingans:", error);
        return [];
      }
    },
    enabled: !!user && user.roles.includes('dosen'),
  });
}

// Fetch role-appropriate bimbingans based on user role
export function useRoleBasedBimbingans() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<UserRole>('mahasiswa');
  
  useEffect(() => {
    if (!user) return;
    
    if (user.roles.includes('koorpro')) {
      setUserRole('koorpro');
    } else if (user.roles.includes('tendik')) {
      setUserRole('tendik');
    } else if (user.roles.includes('dosen')) {
      setUserRole('dosen');
    } else {
      setUserRole('mahasiswa');
    }
  }, [user]);
  
  // Use the appropriate hook based on role
  const adminQuery = useAllBimbingans();
  const studentQuery = useStudentBimbingans();
  const dosenQuery = useDosenBimbingans();
  
  // Return the appropriate query based on role
  if (userRole === 'koorpro' || userRole === 'tendik') {
    return adminQuery;
  } else if (userRole === 'dosen') {
    return dosenQuery;
  } else {
    return studentQuery;
  }
}

// Fetch a single consultation by ID
export function useBimbinganDetail(id: string) {
  return useQuery({
    queryKey: ['bimbingan', id],
    queryFn: async () => {
      console.log("Fetching consultation with ID:", id);
      
      if (!id) {
        console.log("No ID provided");
        return null;
      }
      
      try {
        // Fetch basic consultation data
        const { data, error } = await supabase
          .from('bimbingans')
          .select(`
            *,
            pengajuan_ta:pengajuan_ta_id(judul, bidang_penelitian)
          `)
          .eq('id', id)
          .single();
        
        if (error) {
          console.error("Error fetching consultation details:", error);
          throw error;
        }
        
        // Enhance with mahasiswa and dosen data
        try {
          // Get mahasiswa data
          const { data: mahasiswaData, error: mahasiswaError } = await supabase
            .from('mahasiswas')
            .select('nama, nim, email, nomor_telepon')
            .eq('user_id', data.user_id)
            .single();
            
          if (mahasiswaError) {
            console.error("Error fetching mahasiswa details:", mahasiswaError);
          }
          
          // Get dosen data
          const { data: dosenData, error: dosenError } = await supabase
            .from('dosens')
            .select('nama_dosen, nip, email')
            .eq('user_id', data.dosen)
            .single();
            
          if (dosenError) {
            console.error("Error fetching dosen details:", dosenError);
          }
          
          const enhancedData = {
            ...data,
            mahasiswa: mahasiswaError ? null : mahasiswaData,
            dosen_pembimbing: dosenError ? null : dosenData
          };
          
          console.log("Complete consultation data:", enhancedData);
          return enhancedData as Bimbingan;
        } catch (err) {
          console.error("Error enhancing bimbingan detail:", err);
          return data as Bimbingan;
        }
      } catch (error) {
        console.error("Error in useBimbinganDetail:", error);
        throw error;
      }
    },
    enabled: !!id,
  });
}

// Create a new consultation record
export function useCreateBimbingan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (formValues: BimbinganFormValues) => {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      try {
        console.log("Creating new consultation with data:", formValues);
        
        // Verifikasi bahwa formValues memiliki semua field yang diperlukan
        if (!formValues.tanggal || !formValues.dosen || !formValues.ket_bimbingan || 
            !formValues.hasil_bimbingan || !formValues.pengajuan_ta_id) {
          throw new Error('Semua field harus diisi');
        }
        
        // Create the consultation record
        const { data, error } = await supabase
          .from('bimbingans')
          .insert([
            {
              user_id: user.id,
              pengajuan_ta_id: formValues.pengajuan_ta_id,
              tanggal: formValues.tanggal,
              dosen: formValues.dosen,
              ket_bimbingan: formValues.ket_bimbingan,
              hasil_bimbingan: formValues.hasil_bimbingan,
              status: 'pending'
            }
          ])
          .select();
        
        if (error) {
          console.error('Error creating consultation record:', error);
          throw error;
        }
        
        if (!data || data.length === 0) {
          throw new Error('Failed to create consultation record: No data returned');
        }
        
        console.log("Successfully created bimbingan:", data[0]);
        
        // Send notification to the supervisor
        try {
          await supabase
            .from('notifikasis')
            .insert([
              {
                from_user: user.id,
                to_user: formValues.dosen,
                judul: 'Permohonan Persetujuan Bimbingan',
                pesan: `Mahasiswa telah mencatat sesi bimbingan pada tanggal ${formValues.tanggal} dan meminta persetujuan Anda.`,
                is_read: false
              }
            ]);
        } catch (notifError) {
          console.error("Error sending notification:", notifError);
          // Continue despite notification error
        }
        
        return data[0];
      } catch (error) {
        console.error('Error in consultation creation process:', error);
        throw error instanceof Error ? error : new Error(String(error));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bimbingans'] });
      
      toast({
        title: "Bimbingan Berhasil Dicatat",
        description: "Catatan bimbingan telah dikirim dan menunggu persetujuan dosen.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Gagal Mencatat Bimbingan",
        description: error.message || "Terjadi kesalahan saat mencatat bimbingan.",
      });
    },
  });
}

// Update an existing consultation
export function useUpdateBimbingan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: string, 
      data: Partial<BimbinganFormValues>
    }) => {
      try {
        console.log("Updating consultation with data:", data);
        
        // Only allow updating if status is still pending
        const { data: existingData, error: checkError } = await supabase
          .from('bimbingans')
          .select('status')
          .eq('id', id)
          .single();
          
        if (checkError) {
          console.error('Error checking consultation status:', checkError);
          throw checkError;
        }
        
        if (existingData.status !== 'pending') {
          throw new Error('Hanya catatan bimbingan dengan status pending yang dapat diubah');
        }
        
        // Reset status to pending if content is changed
        const updateData = { 
          ...data,
          status: 'pending',
          updated_at: new Date().toISOString()
        };
        
        // Perform the update
        const { data: updatedData, error } = await supabase
          .from('bimbingans')
          .update(updateData)
          .eq('id', id)
          .select();
          
        if (error) {
          console.error('Error updating consultation:', error);
          throw error;
        }
        
        return { id, ...updatedData[0] };
      } catch (error) {
        console.error('Failed to update consultation:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bimbingans'] });
      queryClient.invalidateQueries({ queryKey: ['bimbingan'] });
      
      toast({
        title: "Bimbingan Berhasil Diperbarui",
        description: "Catatan bimbingan telah diperbarui dan menunggu persetujuan ulang dari dosen.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Gagal Memperbarui Bimbingan",
        description: error.message || "Terjadi kesalahan saat memperbarui catatan bimbingan.",
      });
    },
  });
}

// Approve or reject a consultation record (for supervisors)
export function useApproveBimbingan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      isApproved,
      mahasiswaId
    }: { 
      id: string, 
      isApproved: boolean,
      mahasiswaId: string
    }) => {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      try {
        console.log(`${isApproved ? 'Approving' : 'Rejecting'} consultation record ID: ${id}`);
        
        // Update the consultation status
        const { data, error } = await supabase
          .from('bimbingans')
          .update({
            status: isApproved ? 'approved' : 'rejected',
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select();
          
        if (error) {
          console.error('Error updating consultation status:', error);
          throw error;
        }
        
        // Send notification to the student
        await supabase
          .from('notifikasis')
          .insert([
            {
              from_user: user.id,
              to_user: mahasiswaId,
              judul: isApproved ? 'Bimbingan Disetujui' : 'Bimbingan Ditolak',
              pesan: isApproved 
                ? 'Catatan bimbingan Anda telah disetujui oleh dosen pembimbing.' 
                : 'Catatan bimbingan Anda ditolak oleh dosen pembimbing. Silakan revisi dan ajukan kembali.',
              is_read: false
            }
          ]);
        
        return data[0];
      } catch (error) {
        console.error('Error in approve/reject process:', error);
        throw error instanceof Error ? error : new Error(String(error));
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bimbingans'] });
      queryClient.invalidateQueries({ queryKey: ['bimbingan', variables.id] });
      
      toast({
        title: variables.isApproved ? "Bimbingan Disetujui" : "Bimbingan Ditolak",
        description: variables.isApproved 
          ? "Catatan bimbingan telah berhasil disetujui." 
          : "Catatan bimbingan telah ditolak.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Gagal Memproses Bimbingan",
        description: error.message || "Terjadi kesalahan saat memproses catatan bimbingan.",
      });
    },
  });
}

// Fetch thesis proposals for a student to associate with consultations
export function useStudentPengajuanTAforBimbingan() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['pengajuan-ta', 'for-bimbingan', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        // Get the student's mahasiswa_id
        const { data: mahasiswaData, error: mahasiswaError } = await supabase
          .from('mahasiswas')
          .select('id')
          .eq('user_id', user.id)
          .single();
          
        if (mahasiswaError) {
          console.error("Error fetching mahasiswa ID:", mahasiswaError);
          return [];
        }
        
        // Get approved thesis proposals
        const { data, error } = await supabase
          .from('pengajuan_tas')
          .select('id, judul, bidang_penelitian, pembimbing_1, pembimbing_2')
          .eq('mahasiswa_id', mahasiswaData.id)
          .eq('status', 'approved');
          
        if (error) {
          console.error("Error fetching approved thesis proposals:", error);
          throw error;
        }
        
        return data;
      } catch (error) {
        console.error("Error in useStudentPengajuanTAforBimbingan:", error);
        return [];
      }
    },
    enabled: !!user && user.roles.includes('mahasiswa'),
  });
}
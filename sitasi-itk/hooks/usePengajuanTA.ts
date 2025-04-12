// hooks/usePengajuanTA.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { PengajuanTA, PengajuanTAFormValues, RiwayatPengajuan } from '../types/pengajuan-ta';
import { useToast } from './use-toast';

// Fetch all thesis proposals
export function usePengajuanTAs() {
  return useQuery({
    queryKey: ['pengajuan-ta'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pengajuan_tas')
        .select(`
          *,
          mahasiswa:mahasiswa_id (nama, nim, email, nomor_telepon),
          dosen_pembimbing1:pembimbing_1 (nama_dosen, nip, email),
          dosen_pembimbing2:pembimbing_2 (nama_dosen, nip, email)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PengajuanTA[];
    },
  });
}

// Fetch thesis proposals for a specific student
export function useStudentPengajuanTA(mahasiswaId: string) {
  return useQuery({
    queryKey: ['pengajuan-ta', 'student', mahasiswaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pengajuan_tas')
        .select(`
          *,
          dosen_pembimbing1:pembimbing_1 (nama_dosen, nip, email),
          dosen_pembimbing2:pembimbing_2 (nama_dosen, nip, email)
        `)
        .eq('mahasiswa_id', mahasiswaId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PengajuanTA[];
    },
    enabled: !!mahasiswaId,
  });
}

// Fetch thesis proposals for a specific supervisor
export function useSupervisorPengajuanTA(dosenId: string) {
  return useQuery({
    queryKey: ['pengajuan-ta', 'supervisor', dosenId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pengajuan_tas')
        .select(`
          *,
          mahasiswa:mahasiswa_id (nama, nim, email, nomor_telepon),
          dosen_pembimbing1:pembimbing_1 (nama_dosen, nip, email),
          dosen_pembimbing2:pembimbing_2 (nama_dosen, nip, email)
        `)
        .or(`pembimbing_1.eq.${dosenId},pembimbing_2.eq.${dosenId}`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PengajuanTA[];
    },
    enabled: !!dosenId,
  });
}

// Fetch a single thesis proposal by ID
export function usePengajuanTADetail(id: string) {
  return useQuery({
    queryKey: ['pengajuan-ta', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pengajuan_tas')
        .select(`
          *,
          mahasiswa:mahasiswa_id (nama, nim, email, nomor_telepon),
          dosen_pembimbing1:pembimbing_1 (nama_dosen, nip, email),
          dosen_pembimbing2:pembimbing_2 (nama_dosen, nip, email)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as PengajuanTA;
    },
    enabled: !!id,
  });
}

// Create a new thesis proposal
export function useCreatePengajuanTA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ formValues, mahasiswaId }: { formValues: PengajuanTAFormValues, mahasiswaId: string }) => {
      const { data, error } = await supabase
        .from('pengajuan_tas')
        .insert([
          {
            judul: formValues.judul,
            bidang_penelitian: formValues.bidang_penelitian,
            mahasiswa_id: mahasiswaId,
            pembimbing_1: formValues.pembimbing_1,
            pembimbing_2: formValues.pembimbing_2,
            status: 'submitted',
            approve_pembimbing1: false,
            approve_pembimbing2: false,
          }
        ])
        .select()
        .single();
        
      if (error) throw error;
      
      // Add record to riwayat_pengajuans
      const { error: historyError } = await supabase
        .from('riwayat_pengajuans')
        .insert([
          {
            pengajuan_ta_id: data.id,
            user_id: mahasiswaId,
            riwayat: 'Pengajuan baru',
            keterangan: 'Proposal tugas akhir telah diajukan',
            status: 'submitted',
          }
        ]);
        
      if (historyError) throw historyError;
      
      // Create notifications for supervisors
      await createSupervisorNotifications(data.id, mahasiswaId, formValues.pembimbing_1, formValues.pembimbing_2);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengajuan-ta'] });
      toast({
        title: "Pengajuan Berhasil",
        description: "Proposal tugas akhir berhasil diajukan. Menunggu persetujuan pembimbing.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Gagal Mengajukan",
        description: error.message || "Terjadi kesalahan saat mengajukan proposal tugas akhir.",
      });
    },
  });
}

// Update a thesis proposal
export function useUpdatePengajuanTA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, data, userId }: { id: string, data: Partial<PengajuanTA>, userId: string }) => {
      const { error } = await supabase
        .from('pengajuan_tas')
        .update(data)
        .eq('id', id);
        
      if (error) throw error;
      
      // Add record to riwayat_pengajuans
      const { error: historyError } = await supabase
        .from('riwayat_pengajuans')
        .insert([
          {
            pengajuan_ta_id: id,
            user_id: userId,
            riwayat: 'Update pengajuan',
            keterangan: 'Proposal tugas akhir telah diperbarui',
            status: data.status || 'updated',
          }
        ]);
        
      if (historyError) throw historyError;
      
      return { id, ...data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengajuan-ta'] });
      toast({
        title: "Berhasil Diperbarui",
        description: "Proposal tugas akhir berhasil diperbarui.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Gagal Memperbarui",
        description: error.message || "Terjadi kesalahan saat memperbarui proposal tugas akhir.",
      });
    },
  });
}

// Supervisor approval mutation
export function useApprovePengajuanTA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      isPembimbing1, 
      dosenId, 
      mahasiswaId 
    }: { 
      id: string, 
      isPembimbing1: boolean, 
      dosenId: string,
      mahasiswaId: string
    }) => {
      // Get current state first
      const { data: current, error: fetchError } = await supabase
        .from('pengajuan_tas')
        .select('*')
        .eq('id', id)
        .single();
        
      if (fetchError) throw fetchError;
      
      // Prepare update data
      const updateData: Partial<PengajuanTA> = isPembimbing1 
        ? { approve_pembimbing1: true } 
        : { approve_pembimbing2: true };
      
      // Check if both will be approved
      const bothApproved = isPembimbing1 
        ? (current.approve_pembimbing2 === true)
        : (current.approve_pembimbing1 === true);
        
      if (bothApproved) {
        updateData.status = 'approved';
      } else {
        updateData.status = isPembimbing1 ? 'approved_pembimbing1' : 'approved_pembimbing2';
      }
      
      // Update the proposal
      const { error } = await supabase
        .from('pengajuan_tas')
        .update(updateData)
        .eq('id', id);
        
      if (error) throw error;
      
      // Add record to riwayat_pengajuans
      const { error: historyError } = await supabase
        .from('riwayat_pengajuans')
        .insert([
          {
            pengajuan_ta_id: id,
            user_id: dosenId,
            riwayat: isPembimbing1 ? 'Disetujui Pembimbing 1' : 'Disetujui Pembimbing 2',
            keterangan: isPembimbing1 
              ? 'Proposal telah disetujui oleh Pembimbing 1' 
              : 'Proposal telah disetujui oleh Pembimbing 2',
            status: updateData.status,
          }
        ]);
        
      if (historyError) throw historyError;
      
      // Create notification for student
      await createStudentNotification(
        id, 
        dosenId, 
        mahasiswaId, 
        isPembimbing1 ? 'Pembimbing 1 menyetujui proposal' : 'Pembimbing 2 menyetujui proposal', 
        isPembimbing1 
          ? 'Proposal Anda telah disetujui oleh Pembimbing 1' 
          : 'Proposal Anda telah disetujui oleh Pembimbing 2'
      );
      
      return { id, ...updateData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengajuan-ta'] });
      toast({
        title: "Proposal Disetujui",
        description: "Proposal tugas akhir telah disetujui.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Gagal Menyetujui",
        description: error.message || "Terjadi kesalahan saat menyetujui proposal tugas akhir.",
      });
    },
  });
}

// Fetch history for a specific thesis proposal
export function useRiwayatPengajuan(pengajuanId: string) {
  return useQuery({
    queryKey: ['riwayat-pengajuan', pengajuanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('riwayat_pengajuans')
        .select(`
          *,
          user:user_id (name)
        `)
        .eq('pengajuan_ta_id', pengajuanId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as RiwayatPengajuan[];
    },
    enabled: !!pengajuanId,
  });
}

// Helper function to create notifications for supervisors
async function createSupervisorNotifications(
  pengajuanId: string, 
  mahasiswaId: string,
  pembimbing1Id: string,
  pembimbing2Id: string
) {
  // Get student name
  const { data: mahasiswa } = await supabase
    .from('mahasiswas')
    .select('nama')
    .eq('id', mahasiswaId)
    .single();
  
  const studentName = mahasiswa?.nama || 'Mahasiswa';
  
  // Create notifications for both supervisors
  const notifications = [
    {
      from_user: mahasiswaId,
      to_user: pembimbing1Id,
      judul: 'Permohonan Persetujuan Proposal TA',
      pesan: `${studentName} telah mengajukan proposal tugas akhir dan meminta persetujuan Anda sebagai Pembimbing 1.`,
      is_read: false
    },
    {
      from_user: mahasiswaId,
      to_user: pembimbing2Id,
      judul: 'Permohonan Persetujuan Proposal TA',
      pesan: `${studentName} telah mengajukan proposal tugas akhir dan meminta persetujuan Anda sebagai Pembimbing 2.`,
      is_read: false
    }
  ];
  
  const { error } = await supabase
    .from('notifikasis')
    .insert(notifications);
    
  if (error) console.error('Failed to create supervisor notifications:', error);
}

// Helper function to create notifications for students
async function createStudentNotification(
  pengajuanId: string, 
  dosenId: string,
  mahasiswaId: string,
  judul: string,
  pesan: string
) {
  const { error } = await supabase
    .from('notifikasis')
    .insert([
      {
        from_user: dosenId,
        to_user: mahasiswaId,
        judul,
        pesan,
        is_read: false
      }
    ]);
    
  if (error) console.error('Failed to create student notification:', error);
}
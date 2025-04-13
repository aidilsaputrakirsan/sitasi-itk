// hooks/usePengajuanTA.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { PengajuanTA, PengajuanTAFormValues, RiwayatPengajuan } from '../types/pengajuan-ta';
import { useToast } from './use-toast';
import { useAuth } from '@/contexts/AuthContext';

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
      console.log("Fetching student proposals with mahasiswaId:", mahasiswaId);
      
      if (!mahasiswaId) {
        console.log("No mahasiswaId provided, returning empty array");
        return [];
      }
      
      const { data, error } = await supabase
        .from('pengajuan_tas')
        .select(`
          *,
          mahasiswa:mahasiswa_id (nama, nim, email, nomor_telepon),
          dosen_pembimbing1:pembimbing_1 (nama_dosen, nip, email),
          dosen_pembimbing2:pembimbing_2 (nama_dosen, nip, email)
        `)
        .eq('mahasiswa_id', mahasiswaId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching student proposals:", error);
        throw error;
      }
      
      console.log(`Found ${data?.length || 0} proposals for student:`, data);
      return data as PengajuanTA[];
    },
    enabled: !!mahasiswaId,
  });
}

// Fetch thesis proposals for a specific supervisor
export function useSupervisorPengajuanTA(dosenId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['pengajuan-ta', 'supervisor', dosenId, user?.id],
    queryFn: async () => {
      try {
        console.log("Fetching supervisor proposals with dosenId:", dosenId);
        console.log("Current user ID:", user?.id);
        
        if (!user?.id) {
          console.log("No user ID available, returning empty array");
          return [];
        }
        
        // First, let's check if we can get any proposals at all
        const { data: allProposals, error: allError } = await supabase
          .from('pengajuan_tas')
          .select('id, judul')
          .limit(5);
          
        console.log("Sample of all proposals in the system:", allProposals);
        
        if (allError) {
          console.error("Error checking proposal table:", allError);
        }
        
        // Now query for this supervisor's proposals - using a simpler approach first
        const { data: proposals, error } = await supabase
          .from('pengajuan_tas')
          .select(`
            id, judul, bidang_penelitian, status, pembimbing_1, pembimbing_2, 
            approve_pembimbing1, approve_pembimbing2, created_at, updated_at,
            mahasiswa:mahasiswa_id (id, nama, nim, email, nomor_telepon)
          `);
        
        if (error) {
          console.error("Error fetching all proposals:", error);
          throw error;
        }
        
        // Filter client-side until we fix the query
        const filteredProposals = proposals.filter(p => 
          p.pembimbing_1 === user.id || p.pembimbing_2 === user.id
        );
        
        console.log(`Found ${filteredProposals.length} proposals for supervisor:`, filteredProposals);
        
        // Add dosen_pembimbing1 and dosen_pembimbing2 info to be consistent with the data model
        for (const proposal of filteredProposals) {
          // Fake the dosen info for now since we're filtering client-side
          proposal.dosen_pembimbing1 = { 
            nama_dosen: "Pembimbing 1", 
            nip: "", 
            email: "" 
          };
          proposal.dosen_pembimbing2 = { 
            nama_dosen: "Pembimbing 2", 
            nip: "", 
            email: "" 
          };
        }
        
        return filteredProposals as unknown as PengajuanTA[];
      } catch (err) {
        console.error("Unexpected error in supervisor query:", err);
        return []; // Return empty array on error to prevent crashes
      }
    },
    enabled: !!user?.id,
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
// This function assumes the foreign key constraint expects user_id values, not dosen.id values
  // Updated useCreatePengajuanTA with foreign key fix

  export function useCreatePengajuanTA() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    
    return useMutation({
      mutationFn: async ({ formValues, mahasiswaId }: { formValues: PengajuanTAFormValues, mahasiswaId: string }) => {
        try {
          // First, get the user_id associated with this mahasiswa
          console.log("Getting user_id for mahasiswa:", mahasiswaId);
          const { data: mahasiswaData, error: mahasiswaError } = await supabase
            .from('mahasiswas')
            .select('user_id, nama')
            .eq('id', mahasiswaId)
            .single();
          
          if (mahasiswaError) {
            console.error('Error fetching mahasiswa user_id:', mahasiswaError);
            throw new Error('Failed to get user information');
          }
          
          if (!mahasiswaData || !mahasiswaData.user_id) {
            console.error('No user_id found for mahasiswa:', mahasiswaId);
            throw new Error('User information incomplete');
          }
          
          const studentUserId = mahasiswaData.user_id;
          console.log("Found student user_id:", studentUserId);
          
          // Get user_ids for the supervisors - THIS IS THE KEY FIX
          // We need to convert dosen.id to user_id for the foreign key constraint
          console.log("Getting user_id for pembimbing 1:", formValues.pembimbing_1);
          const { data: pembimbing1Data, error: p1Error } = await supabase
            .from('dosens')
            .select('user_id')
            .eq('id', formValues.pembimbing_1)
            .single();
            
          if (p1Error) {
            console.error('Error fetching pembimbing 1 user_id:', p1Error);
            throw new Error('Could not find information for Pembimbing 1');
          }
          
          console.log("Getting user_id for pembimbing 2:", formValues.pembimbing_2);
          const { data: pembimbing2Data, error: p2Error } = await supabase
            .from('dosens')
            .select('user_id')
            .eq('id', formValues.pembimbing_2)
            .single();
            
          if (p2Error) {
            console.error('Error fetching pembimbing 2 user_id:', p2Error);
            throw new Error('Could not find information for Pembimbing 2');
          }
          
          // Now use user_ids for the supervisors instead of dosen.id
          const pembimbing1UserId = pembimbing1Data.user_id;
          const pembimbing2UserId = pembimbing2Data.user_id;
          
          console.log("Using supervisor user_ids:", pembimbing1UserId, pembimbing2UserId);
          
          // Create the thesis proposal with USER_IDs for supervisors
          console.log("Creating thesis proposal with correct foreign keys");
          const { data, error } = await supabase
            .from('pengajuan_tas')
            .insert([
              {
                judul: formValues.judul,
                bidang_penelitian: formValues.bidang_penelitian,
                mahasiswa_id: mahasiswaId,
                pembimbing_1: pembimbing1UserId, // Using USER_ID instead of dosen.id
                pembimbing_2: pembimbing2UserId, // Using USER_ID instead of dosen.id
                status: 'submitted',
                approve_pembimbing1: false,
                approve_pembimbing2: false,
              }
            ])
            .select()
            .single();
            
          if (error) {
            console.error('Error creating thesis proposal:', error);
            throw error;
          }
          
          console.log("Thesis proposal created with ID:", data.id);
          
          // Add record to riwayat_pengajuans
          console.log("Adding history record with user_id:", studentUserId);
          const { error: historyError } = await supabase
            .from('riwayat_pengajuans')
            .insert([
              {
                pengajuan_ta_id: data.id,
                user_id: studentUserId,
                riwayat: 'Pengajuan baru',
                keterangan: 'Proposal tugas akhir telah diajukan',
                status: 'submitted',
              }
            ]);
            
          if (historyError) {
            console.error('Error creating history record:', historyError);
            throw historyError;
          }
          
          // Create notifications for supervisors
          try {
            console.log("Creating notifications for supervisors");
            
            const studentName = mahasiswaData.nama || 'Mahasiswa';
            
            // Create notifications for both supervisors
            const notifications = [
              {
                from_user: studentUserId,
                to_user: pembimbing1UserId, // Already have the user_id
                judul: 'Permohonan Persetujuan Proposal TA',
                pesan: `${studentName} telah mengajukan proposal tugas akhir dan meminta persetujuan Anda sebagai Pembimbing 1.`,
                is_read: false
              },
              {
                from_user: studentUserId,
                to_user: pembimbing2UserId, // Already have the user_id
                judul: 'Permohonan Persetujuan Proposal TA',
                pesan: `${studentName} telah mengajukan proposal tugas akhir dan meminta persetujuan Anda sebagai Pembimbing 2.`,
                is_read: false
              }
            ];
            
            console.log("Sending notifications:", notifications);
            
            const { error: notifError } = await supabase
              .from('notifikasis')
              .insert(notifications);
              
            if (notifError) {
              console.error('Failed to create notifications:', notifError);
              // Don't throw error here, just log it to avoid breaking the flow
            } else {
              console.log("Notifications sent successfully");
            }
          } catch (notifError) {
            console.error('Error in notification creation:', notifError);
            // Don't throw error here, just log it to avoid breaking the flow
          }
          
          return data;
        } catch (error) {
          console.error('Error in thesis proposal submission:', error);
          throw error;
        }
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

// Supervisor approval mutation with correct ID usage
export function useApprovePengajuanTA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      isPembimbing1, 
      dosenId, // This is now the user's auth ID
      mahasiswaId // This is also the student's auth ID (user_id)
    }: { 
      id: string, 
      isPembimbing1: boolean, 
      dosenId: string, // Changed meaning
      mahasiswaId: string // Changed meaning
    }) => {
      try {
        console.log(`Starting approval process for pengajuan ${id} by dosen ${dosenId}`);
        
        // Get current state first
        const { data: current, error: fetchError } = await supabase
          .from('pengajuan_tas')
          .select('*')
          .eq('id', id)
          .single();
          
        if (fetchError) {
          console.error('Error fetching current pengajuan state:', fetchError);
          throw fetchError;
        }
        
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
        
        console.log(`Updating pengajuan with: ${JSON.stringify(updateData)}`);
        
        // Update the proposal
        const { error } = await supabase
          .from('pengajuan_tas')
          .update(updateData)
          .eq('id', id);
          
        if (error) {
          console.error('Error updating pengajuan:', error);
          throw error;
        }
        
        // Add record to riwayat_pengajuans
        console.log(`Adding approval history by dosen ${dosenId}`);
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
          
        if (historyError) {
          console.error('Error creating approval history:', historyError);
          throw historyError;
        }
        
        // Create notification for student
        console.log(`Sending approval notification to student ${mahasiswaId}`);
        const { error: notifError } = await supabase
          .from('notifikasis')
          .insert([
            {
              from_user: dosenId,
              to_user: mahasiswaId,
              judul: isPembimbing1 ? 'Pembimbing 1 menyetujui proposal' : 'Pembimbing 2 menyetujui proposal',
              pesan: isPembimbing1 
                ? 'Proposal Anda telah disetujui oleh Pembimbing 1' 
                : 'Proposal Anda telah disetujui oleh Pembimbing 2',
              is_read: false
            }
          ]);
          
        if (notifError) {
          console.error('Error creating approval notification:', notifError);
          throw notifError;
        }
        
        console.log(`Approval process completed successfully`);
        return { id, ...updateData };
      } catch (error) {
        console.error('Error in approval process:', error);
        throw error;
      }
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
  userId: string,  // The user_id from auth
  mahasiswaId: string, // The id from mahasiswas table
  pembimbing1Id: string,
  pembimbing2Id: string
) {
  try {
    // Get student name
    const { data: mahasiswa, error: mahasiswaError } = await supabase
      .from('mahasiswas')
      .select('nama')
      .eq('id', mahasiswaId)
      .single();
    
    if (mahasiswaError) {
      console.error('Error fetching mahasiswa data:', mahasiswaError);
      throw mahasiswaError;
    }
    
    const studentName = mahasiswa?.nama || 'Mahasiswa';
    
    // Create notifications for both supervisors
    const notifications = [
      {
        from_user: userId, // Now correctly using user_id, not mahasiswaId
        to_user: pembimbing1Id,
        judul: 'Permohonan Persetujuan Proposal TA',
        pesan: `${studentName} telah mengajukan proposal tugas akhir dan meminta persetujuan Anda sebagai Pembimbing 1.`,
        is_read: false
      },
      {
        from_user: userId, // Now correctly using user_id, not mahasiswaId
        to_user: pembimbing2Id,
        judul: 'Permohonan Persetujuan Proposal TA',
        pesan: `${studentName} telah mengajukan proposal tugas akhir dan meminta persetujuan Anda sebagai Pembimbing 2.`,
        is_read: false
      }
    ];
    
    const { error } = await supabase
      .from('notifikasis')
      .insert(notifications);
      
    if (error) {
      console.error('Failed to create supervisor notifications:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in createSupervisorNotifications:', error);
    // Don't throw here, just log the error to avoid breaking the main flow
  }
}

// Helper function to create notifications for students
// Helper function to create notifications for students
async function createStudentNotification(
  pengajuanId: string, 
  dosenId: string,
  mahasiswaUserId: string, // Changed to clearly indicate this is the USER ID
  judul: string,
  pesan: string
) {
  try {
    const { error } = await supabase
      .from('notifikasis')
      .insert([
        {
          from_user: dosenId,
          to_user: mahasiswaUserId,
          judul,
          pesan,
          is_read: false
        }
      ]);
      
    if (error) {
      console.error('Failed to create student notification:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in createStudentNotification:', error);
    // Don't throw here, just log the error to avoid breaking the main flow
  }
}
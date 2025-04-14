// hooks/usePengajuanTA.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { PengajuanTA, PengajuanTAFormValues, RiwayatPengajuan } from '../types/pengajuan-ta';
import { useToast } from './use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/auth';

// Perbaikan di hooks/usePengajuanTA.ts

// Fetch all thesis proposals
export function usePengajuanTAs() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['pengajuan-ta', 'all', user?.id],
    queryFn: async () => {
      try {
        console.log("Mengambil semua data pengajuan untuk admin");
        
        // Verifikasi jika user memiliki akses admin
        if (!user?.roles.includes('tendik') && !user?.roles.includes('koorpro')) {
          console.log("User tidak memiliki akses admin", user?.roles);
        }
        
        // Coba kueri dasar dulu (tanpa join)
        const { data: basicData, error: basicError } = await supabase
          .from('pengajuan_tas')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (basicError) {
          console.error("Error kueri dasar:", basicError);
          throw basicError;
        }
        
        console.log(`Ditemukan ${basicData?.length || 0} pengajuan dalam kueri dasar`);
        
        // Kemudian lakukan kueri lengkap dengan join
        const { data, error } = await supabase
          .from('pengajuan_tas')
          .select(`
            *,
            mahasiswa:mahasiswa_id (nama, nim, email, nomor_telepon)
          `)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error("Error kueri lengkap:", error);
          throw error;
        }
        
        console.log(`Ditemukan ${data?.length || 0} pengajuan dengan info mahasiswa`);
        
        // Tambahkan informasi pembimbing secara manual karena join rumit
        const result = await Promise.all(data.map(async (item) => {
          try {
            // Ambil data pembimbing 1
            const { data: pembimbing1Data, error: p1Error } = await supabase
              .from('dosens')
              .select('*')
              .eq('user_id', item.pembimbing_1)
              .single();
              
            // Ambil data pembimbing 2
            const { data: pembimbing2Data, error: p2Error } = await supabase
              .from('dosens')
              .select('*')
              .eq('user_id', item.pembimbing_2)
              .single();
              
            return {
              ...item,
              dosen_pembimbing1: pembimbing1Data || null,
              dosen_pembimbing2: pembimbing2Data || null
            };
          } catch (err) {
            console.error("Error saat mengambil data dosen:", err);
            return {
              ...item,
              dosen_pembimbing1: null,
              dosen_pembimbing2: null
            };
          }
        }));
        
        console.log(`Berhasil menyiapkan ${result.length} data lengkap`);
        return result as PengajuanTA[];
      } catch (error) {
        console.error("Error tak terduga di usePengajuanTAs:", error);
        // Return array kosong untuk mencegah crash
        return [];
      }
    },
    enabled: !!user?.id,
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

// Add this to hooks/usePengajuanTA.ts
export function useConsolidatedPengajuanTA(userRole: UserRole, userId: string) {
  return useQuery({
    queryKey: ['pengajuan-consolidated', userRole, userId],
    queryFn: async () => {
      if (!userId) return [];
      
      try {
        // For students, fetch their proposals
        if (userRole === 'mahasiswa') {
          // Get mahasiswa_id from user_id
          const { data: mahasiswaData, error: mahasiswaError } = await supabase
            .from('mahasiswas')
            .select('id')
            .eq('user_id', userId)
            .single();
            
          if (mahasiswaError || !mahasiswaData) {
            console.error("Error fetching mahasiswa id:", mahasiswaError);
            return [];
          }
          
          // Get proposals for this mahasiswa
          const { data, error } = await supabase
            .from('pengajuan_tas')
            .select(`
              *,
              mahasiswa:mahasiswa_id (nama, nim, email, nomor_telepon),
              dosen_pembimbing1:pembimbing_1 (nama_dosen, nip, email),
              dosen_pembimbing2:pembimbing_2 (nama_dosen, nip, email)
            `)
            .eq('mahasiswa_id', mahasiswaData.id)
            .order('created_at', { ascending: false });
            
          if (error) {
            console.error("Error fetching student proposals:", error);
            return [];
          }
            
          return data as PengajuanTA[];
        }
        
        // For lecturers, fetch proposals they supervise
        if (userRole === 'dosen') {
          // We need to query by user_id (not dosen.id)
          const { data, error } = await supabase
            .from('pengajuan_tas')
            .select(`
              *,
              mahasiswa:mahasiswa_id (nama, nim, email, nomor_telepon)
            `);
            
          if (error) {
            console.error("Error fetching lecturer proposals:", error);
            return [];
          }
          
          // Filter on the client side for proposals where this lecturer is pembimbing1 or pembimbing2
          const filteredData = data.filter(p => 
            p.pembimbing_1 === userId || p.pembimbing_2 === userId
          );
          
          // Add supervisor data to each proposal
          for (const proposal of filteredData) {
            try {
              // Get pembimbing1 data
              if (proposal.pembimbing_1) {
                const { data: p1Data } = await supabase
                  .from('dosens')
                  .select('nama_dosen, nip, email')
                  .eq('user_id', proposal.pembimbing_1)
                  .single();
                  
                if (p1Data) {
                  (proposal as any).dosen_pembimbing1 = p1Data;
                }
              }
              
              // Get pembimbing2 data
              if (proposal.pembimbing_2) {
                const { data: p2Data } = await supabase
                  .from('dosens')
                  .select('nama_dosen, nip, email')
                  .eq('user_id', proposal.pembimbing_2)
                  .single();
                  
                if (p2Data) {
                  (proposal as any).dosen_pembimbing2 = p2Data;
                }
              }
            } catch (err) {
              console.error('Error fetching supervisor data:', err);
            }
          }
            
          return filteredData as PengajuanTA[];
        }
        
        // For admins, fetch all proposals
        const { data, error } = await supabase
          .from('pengajuan_tas')
          .select(`
            *,
            mahasiswa:mahasiswa_id (nama, nim, email, nomor_telepon)
          `)
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error("Error fetching all proposals:", error);
          return [];
        }
        
        // Add supervisor data to each proposal
        for (const proposal of data) {
          try {
            // Get pembimbing1 data
            if (proposal.pembimbing_1) {
              const { data: p1Data } = await supabase
                .from('dosens')
                .select('nama_dosen, nip, email')
                .eq('user_id', proposal.pembimbing_1)
                .single();
                
              if (p1Data) {
                (proposal as any).dosen_pembimbing1 = p1Data;
              }
            }
            
            // Get pembimbing2 data
            if (proposal.pembimbing_2) {
              const { data: p2Data } = await supabase
                .from('dosens')
                .select('nama_dosen, nip, email')
                .eq('user_id', proposal.pembimbing_2)
                .single();
                
              if (p2Data) {
                (proposal as any).dosen_pembimbing2 = p2Data;
              }
            }
          } catch (err) {
            console.error('Error fetching supervisor data:', err);
          }
        }
          
        return data as PengajuanTA[];
      } catch (error) {
        console.error('Error in useConsolidatedPengajuanTA:', error);
        return [];
      }
    },
    enabled: !!userId,
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
        
        // Ubah kode ini di useSupervisorPengajuanTA
        for (const proposal of filteredProposals) {
          // Gunakan type assertion "as any"
          (proposal as any).dosen_pembimbing1 = { 
            nama_dosen: "Pembimbing 1", 
            nip: "", 
            email: "" 
          };
          (proposal as any).dosen_pembimbing2 = { 
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
// Update in usePengajuanTA.ts
export function usePengajuanTADetail(id: string) {
  return useQuery({
    queryKey: ['pengajuan-ta', id],
    queryFn: async () => {
      console.log("Fetching proposal with ID:", id);
      
      try {
        // Fetch basic proposal data
        const { data: basicData, error: basicError } = await supabase
          .from('pengajuan_tas')
          .select('*')
          .eq('id', id)
          .single();
          
        if (basicError) {
          console.error("Basic query error:", basicError);
          throw basicError;
        }
        
        console.log("Basic data found:", basicData);
        
        // Fetch mahasiswa data
        const mahasiswaPromise = supabase
          .from('mahasiswas')
          .select('*')
          .eq('id', basicData.mahasiswa_id)
          .single();
        
        // Fetch pembimbing 1 data (using user_id for join)
        const pembimbing1Promise = supabase
          .from('dosens')
          .select('*')
          .eq('user_id', basicData.pembimbing_1)
          .single();
        
        // Fetch pembimbing 2 data (using user_id for join)
        const pembimbing2Promise = supabase
          .from('dosens')
          .select('*')
          .eq('user_id', basicData.pembimbing_2)
          .single();
        
        // Wait for all promises to resolve
        const [mahasiswaResult, pembimbing1Result, pembimbing2Result] = 
          await Promise.all([mahasiswaPromise, pembimbing1Promise, pembimbing2Promise]);
        
        // Build complete object with all related data
        const result = {
          ...basicData,
          mahasiswa: mahasiswaResult.data,
          dosen_pembimbing1: pembimbing1Result.data,
          dosen_pembimbing2: pembimbing2Result.data
        };
        
        console.log("Complete proposal data:", result);
        
        return result as PengajuanTA;
      } catch (error) {
        console.error("Error in detail fetch:", error);
        throw error;
      }
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
    mutationFn: async ({ 
      id, 
      data, 
      userId 
    }: { 
      id: string, 
      data: Partial<PengajuanTA> & { pembimbing_1?: string, pembimbing_2?: string }, 
      userId: string 
    }) => {
      try {
        console.log("Updating proposal with data:", data);
        
        // Create a copy of the data to modify
        const updateData = { ...data };
        
        // Check if pembimbing_1 or pembimbing_2 are being updated
        const supervisorsChanged = updateData.pembimbing_1 || updateData.pembimbing_2;
        
        // If supervisors are changed, reset approval flags
        if (supervisorsChanged) {
          if (updateData.pembimbing_1) {
            updateData.approve_pembimbing1 = false;
          }
          if (updateData.pembimbing_2) {
            updateData.approve_pembimbing2 = false;
          }
          
          // Also set status back to submitted if previously approved
          if (data.status === 'approved') {
            updateData.status = 'submitted';
          }
        }
        
        // Perform the update
        const { data: updatedData, error } = await supabase
          .from('pengajuan_tas')
          .update(updateData)
          .eq('id', id)
          .select();
          
        if (error) {
          console.error('Error updating proposal:', error);
          throw error;
        }
        
        // Add record to riwayat_pengajuans
        const historyType = supervisorsChanged ? 'Perubahan pembimbing' : 'Update pengajuan';
        const historyDesc = supervisorsChanged 
          ? 'Pembimbing proposal tugas akhir telah diubah'
          : 'Proposal tugas akhir telah diperbarui';
          
        const { error: historyError } = await supabase
          .from('riwayat_pengajuans')
          .insert([
            {
              pengajuan_ta_id: id,
              user_id: userId,
              riwayat: historyType,
              keterangan: historyDesc,
              status: updateData.status || 'updated',
            }
          ]);
          
        if (historyError) {
          console.error('Error creating history record:', historyError);
          // Continue despite history error
        }
        
        return { id, ...updatedData[0] };
      } catch (error) {
        console.error('Failed to update proposal:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengajuan-ta'] });
      toast({
        title: "Berhasil Diperbarui",
        description: "Proposal tugas akhir berhasil diperbarui.",
      });
    },
    onError: (error) => {
      console.error('Update error details:', error);
      toast({
        variant: "destructive",
        title: "Gagal Memperbarui",
        description: error.message || "Terjadi kesalahan saat memperbarui proposal tugas akhir.",
      });
    },
  });
}

// Update the useApprovePengajuanTA hook in hooks/usePengajuanTA.ts
export function useApprovePengajuanTA() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation<
    { success: boolean; bothApproved: boolean },
    Error,
    { id: string; isPembimbing1: boolean; dosenId: string; mahasiswaId: string }
  >({
    mutationFn: async ({ 
      id, 
      isPembimbing1, 
      dosenId, 
      mahasiswaId 
    }) => {
      try {
        console.log(`Processing approval for thesis proposal ID: ${id}`);
        
        // 1. Get current state to check existing approvals
        const { data: current, error: fetchError } = await supabase
          .from('pengajuan_tas')
          .select('approve_pembimbing1, approve_pembimbing2, status')
          .eq('id', id)
          .single();
          
        if (fetchError) {
          console.error('Error fetching current approval state:', fetchError);
          throw new Error('Failed to check current approval status');
        }
        
        // 2. Prepare update data based on which supervisor is approving
        const updateData: Record<string, any> = {};
        
        if (isPembimbing1) {
          updateData.approve_pembimbing1 = true;
        } else {
          updateData.approve_pembimbing2 = true;
        }
        
        // 3. Check if both approvals will be complete
        const willBothBeApproved = isPembimbing1 
          ? current.approve_pembimbing2 // If pembimbing1 is approving, check if pembimbing2 already approved
          : current.approve_pembimbing1; // If pembimbing2 is approving, check if pembimbing1 already approved
        
        // 4. Only update status to "approved" if both supervisors approve
        if (willBothBeApproved) {
          updateData.status = 'approved';
        }
        
        console.log('Update data:', updateData);
        
        // 5. Update the pengajuan_tas record
        const { error: updateError } = await supabase
          .from('pengajuan_tas')
          .update(updateData)
          .eq('id', id);
          
        if (updateError) {
          console.error('Error updating thesis proposal:', updateError);
          throw new Error('Failed to update approval status');
        }
        
        // 6. Add history record
        const historyStatus = willBothBeApproved ? 'approved' : 'submitted';
        const historyDescription = isPembimbing1 
          ? 'Proposal telah disetujui oleh Pembimbing 1' 
          : 'Proposal telah disetujui oleh Pembimbing 2';
          
        const { error: historyError } = await supabase
          .from('riwayat_pengajuans')
          .insert([{
            pengajuan_ta_id: id,
            user_id: dosenId,
            riwayat: isPembimbing1 ? 'Disetujui Pembimbing 1' : 'Disetujui Pembimbing 2',
            keterangan: historyDescription,
            status: historyStatus,
          }]);
          
        if (historyError) {
          console.error('Error adding history record:', historyError);
          // Continue despite history error
        }
        
        // 7. Send notification to student
        const { error: notifError } = await supabase
          .from('notifikasis')
          .insert([{
            from_user: dosenId,
            to_user: mahasiswaId,
            judul: isPembimbing1 ? 'Pembimbing 1 menyetujui proposal' : 'Pembimbing 2 menyetujui proposal',
            pesan: historyDescription + (willBothBeApproved ? '. Proposal telah disetujui oleh kedua pembimbing.' : ''),
            is_read: false
          }]);
          
        if (notifError) {
          console.error('Error sending notification:', notifError);
          // Continue despite notification error
        }
        
        return { success: true, bothApproved: willBothBeApproved };
      } catch (error) {
        console.error('Error in approval process:', error);
        throw error instanceof Error ? error : new Error('Unknown error in approval process');
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pengajuan-ta'] });
      queryClient.invalidateQueries({ queryKey: ['riwayat-pengajuan'] });
      
      toast({
        title: "Proposal Disetujui",
        description: result.bothApproved 
          ? "Proposal tugas akhir telah disetujui oleh kedua pembimbing."
          : "Proposal tugas akhir telah disetujui.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Gagal Menyetujui",
        description: error.message || "Terjadi kesalahan saat menyetujui proposal."
      });
    },
  });
}

// Tambahkan fungsi ini untuk mengambil pengajuan TA berdasarkan user_id mahasiswa
// Tambahkan ini di bagian atas file hooks/usePengajuanTA.ts setelah import yang sudah ada
export function usePengajuanTAByStudentUserId(userId: string) {
  return useQuery({
    queryKey: ['pengajuan-ta', 'student-user', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      try {
        // Langkah 1: Dapatkan ID mahasiswa dari user_id
        const { data: mahasiswaData, error: mahasiswaError } = await supabase
          .from('mahasiswas')
          .select('id')
          .eq('user_id', userId)
          .single();
          
        if (mahasiswaError || !mahasiswaData) {
          console.error("Error fetching mahasiswa id:", mahasiswaError);
          return [];
        }
        
        const mahasiswaId = mahasiswaData.id;
        console.log("Found mahasiswa ID:", mahasiswaId);
        
        // Langkah 2: Dapatkan pengajuan TA dengan mahasiswa_id tersebut
        const { data, error } = await supabase
          .from('pengajuan_tas')
          .select(`
            *,
            mahasiswa:mahasiswa_id (nama, nim, email, nomor_telepon)
          `)
          .eq('mahasiswa_id', mahasiswaId)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error("Error fetching student proposals:", error);
          throw error;
        }
        
        return data as PengajuanTA[];
      } catch (error) {
        console.error("Error in fetching by student user_id:", error);
        return [];
      }
    },
    enabled: !!userId
  });
}

// In hooks/usePengajuanTA.ts - Update the useRiwayatPengajuan function

export function useRiwayatPengajuan(pengajuanId: string) {
  return useQuery({
    queryKey: ['riwayat-pengajuan', pengajuanId],
    queryFn: async () => {
      try {
        console.log(`Fetching riwayat for pengajuan ID: ${pengajuanId}`);
        
        // First check if the pengajuan_ta record exists
        const { data: pengajuan, error: pengajuanError } = await supabase
          .from('pengajuan_tas')
          .select('id, status, approve_pembimbing1, approve_pembimbing2')
          .eq('id', pengajuanId)
          .single();
          
        if (pengajuanError) {
          console.error(`Error fetching pengajuan: ${pengajuanError.message}`);
          return [];
        }
        
        // Query for existing history records
        const { data: existingHistory, error: historyError } = await supabase
          .from('riwayat_pengajuans')
          .select(`
            *,
            user:user_id (name)
          `)
          .eq('pengajuan_ta_id', pengajuanId)
          .order('created_at', { ascending: false });
          
        if (historyError) {
          console.error(`Error fetching history: ${historyError.message}`);
          return [];
        }
        
        console.log(`Found ${existingHistory?.length || 0} history records`);
        
        // If no history exists but we have approval status, create dummy records
        // This ensures lecturers see something similar to what students see
        if ((!existingHistory || existingHistory.length === 0) && pengajuan) {
          // Create synthetic history records based on approval status
          const syntheticHistory = [];
          
          if (pengajuan.approve_pembimbing1) {
            syntheticHistory.push({
              id: 'synthetic-p1',
              pengajuan_ta_id: pengajuanId,
              user_id: null,
              user: { name: 'System' },
              riwayat: 'Disetujui Pembimbing 1',
              keterangan: 'Proposal telah disetujui oleh Pembimbing 1',
              status: 'approved',
              created_at: new Date().toISOString()
            });
          }
          
          if (pengajuan.approve_pembimbing2) {
            syntheticHistory.push({
              id: 'synthetic-p2',
              pengajuan_ta_id: pengajuanId,
              user_id: null,
              user: { name: 'System' },
              riwayat: 'Disetujui Pembimbing 2',
              keterangan: 'Proposal telah disetujui oleh Pembimbing 2',
              status: 'approved',
              created_at: new Date().toISOString()
            });
          }
          
          // Add initial submission record
          syntheticHistory.push({
            id: 'synthetic-submit',
            pengajuan_ta_id: pengajuanId,
            user_id: null,
            user: { name: 'Mahasiswa' },
            riwayat: 'Pengajuan baru',
            keterangan: 'Proposal tugas akhir telah diajukan',
            status: 'submitted',
            created_at: new Date(new Date().getTime() - 86400000).toISOString() // 1 day ago
          });
          
          console.log('Created synthetic history records:', syntheticHistory);
          return syntheticHistory;
        }
        
        return existingHistory;
      } catch (error) {
        console.error('Error in useRiwayatPengajuan:', error);
        return [];
      }
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
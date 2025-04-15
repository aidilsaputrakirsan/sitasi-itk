// hooks/useSempro.ts
'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { 
  Sempro, 
  JadwalSempro, 
  PenilaianSempro, 
  PeriodeSempro,
  StatusSempro,
  FileMetadata,
  SemproFormValues,
  JadwalSemproFormValues,
  PenilaianSemproFormValues,
  PeriodeSemproFormValues,
  RiwayatPendaftaranSempro
} from '@/types/sempro';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/auth';
import { useToast } from './use-toast';
import { useFileUpload } from './useFileUpload';

// Google Drive folder ID untuk menyimpan dokumen sempro
const SEMPRO_FOLDER_ID = process.env.NEXT_PUBLIC_SEMPRO_FOLDER_ID || '1y-4qBRLQnkLezBcYYf_N6kMxqaUXa6Lx';

// Fetch all sempros (for admin users)
export function useAllSempros() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['sempros', 'all', user?.id],
    queryFn: async () => {
      try {
        console.log("Fetching all sempros for admin");
        
        // Verify if user has admin access
        if (!user?.roles.includes('tendik') && !user?.roles.includes('koorpro')) {
          console.log("User does not have admin access", user?.roles);
        }
        
        // Perform the query with basic joins
        const { data, error } = await supabase
          .from('sempros')
          .select(`
            *,
            pengajuan_ta:pengajuan_ta_id(judul, bidang_penelitian, pembimbing_1, pembimbing_2)
          `)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error("Error fetching all sempros:", error);
          throw error;
        }
        
        // Enhance data with mahasiswa details
        const enhancedData = await Promise.all(data.map(async (sempro) => {
          try {
            // Get mahasiswa data
            const { data: mahasiswaData, error: mahasiswaError } = await supabase
              .from('mahasiswas')
              .select('nama, nim, email, nomor_telepon')
              .eq('user_id', sempro.user_id)
              .single();
              
            if (mahasiswaError) {
              console.error("Error fetching mahasiswa details:", mahasiswaError);
              return sempro;
            }
            
            return {
              ...sempro,
              mahasiswa: mahasiswaData
            };
          } catch (err) {
            console.error(`Error enhancing sempro ID ${sempro.id}:`, err);
            return sempro;
          }
        }));
        
        console.log(`Found ${enhancedData.length} sempro records`);
        return enhancedData as Sempro[];
      } catch (error) {
        console.error("Unexpected error in useAllSempros:", error);
        return [];
      }
    },
    enabled: !!user && (user.roles.includes('tendik') || user.roles.includes('koorpro')),
  });
}

// Fetch sempros for a specific student
export function useStudentSempros() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['sempros', 'student', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        console.log("Fetching sempros for student with user ID:", user.id);
        
        // Query for the user's sempros
        const { data, error } = await supabase
          .from('sempros')
          .select(`
            *,
            pengajuan_ta:pengajuan_ta_id(judul, bidang_penelitian, pembimbing_1, pembimbing_2)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error("Error fetching student sempros:", error);
          throw error;
        }
        
        console.log(`Found ${data.length} sempros for student`);
        return data as Sempro[];
      } catch (error) {
        console.error("Error in useStudentSempros:", error);
        return [];
      }
    },
    enabled: !!user && user.roles.includes('mahasiswa'),
  });
}

// Fetch sempros for a specific lecturer (as pembimbing or penguji)
export function useDosenSempros() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['sempros', 'dosen', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        console.log("Fetching sempros for dosen with user ID:", user.id);
        
        // First, get jadwal_sempros where the lecturer is penguji_1 or penguji_2
        const { data: jadwalData, error: jadwalError } = await supabase
          .from('jadwal_sempros')
          .select(`
            *,
            pengajuan_ta:pengajuan_ta_id(judul, bidang_penelitian)
          `)
          .or(`penguji_1.eq.${user.id},penguji_2.eq.${user.id}`)
          .order('tanggal_sempro', { ascending: false });
        
        if (jadwalError) {
          console.error("Error fetching jadwal sempros for dosen:", jadwalError);
          throw jadwalError;
        }
        
        // Enhance jadwal data with mahasiswa info
        const enhancedJadwal = await Promise.all(jadwalData.map(async (jadwal) => {
          try {
            // Get mahasiswa data
            const { data: mahasiswaData, error: mahasiswaError } = await supabase
              .from('mahasiswas')
              .select('nama, nim, email, nomor_telepon')
              .eq('user_id', jadwal.user_id)
              .single();
              
            // Get sempro data
            const { data: semproData, error: semproError } = await supabase
              .from('sempros')
              .select('*')
              .eq('pengajuan_ta_id', jadwal.pengajuan_ta_id)
              .eq('user_id', jadwal.user_id)
              .single();
            
            return {
              ...jadwal,
              mahasiswa: mahasiswaError ? null : mahasiswaData,
              sempro: semproError ? null : semproData
            };
          } catch (err) {
            console.error(`Error enhancing jadwal ID ${jadwal.id}:`, err);
            return jadwal;
          }
        }));
        
        console.log(`Found ${enhancedJadwal.length} jadwal sempros for dosen`);
        return enhancedJadwal as JadwalSempro[];
      } catch (error) {
        console.error("Error in useDosenSempros:", error);
        return [];
      }
    },
    enabled: !!user && user.roles.includes('dosen'),
  });
}

// Fetch role-appropriate sempros based on user role
export function useRoleBasedSempros() {
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
  const adminQuery = useAllSempros();
  const studentQuery = useStudentSempros();
  const dosenQuery = useDosenSempros();
  
  // Return the appropriate query based on role
  if (userRole === 'koorpro' || userRole === 'tendik') {
    return adminQuery;
  } else if (userRole === 'dosen') {
    return dosenQuery;
  } else {
    return studentQuery;
  }
}

// Fetch a single sempro by ID
export function useSemproDetail(id: string) {
  return useQuery({
    queryKey: ['sempro', id],
    queryFn: async () => {
      console.log("Fetching sempro with ID:", id);
      
      if (!id) {
        console.log("No ID provided");
        return null;
      }
      
      try {
        // Fetch basic sempro data
        const { data, error } = await supabase
          .from('sempros')
          .select(`
            *,
            pengajuan_ta:pengajuan_ta_id(judul, bidang_penelitian, pembimbing_1, pembimbing_2)
          `)
          .eq('id', id)
          .single();
        
        if (error) {
          console.error("Error fetching sempro details:", error);
          throw error;
        }
        
        // Enhance with mahasiswa data
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
          
          const enhancedData = {
            ...data,
            mahasiswa: mahasiswaError ? null : mahasiswaData
          };
          
          console.log("Complete sempro data:", enhancedData);
          return enhancedData as Sempro;
        } catch (err) {
          console.error("Error enhancing sempro detail:", err);
          return data as Sempro;
        }
      } catch (error) {
        console.error("Error in useSemproDetail:", error);
        throw error;
      }
    },
    enabled: !!id,
  });
}

// Get jadwal for a specific sempro
export function useJadwalSempro(pengajuanTaId: string, userId: string) {
  return useQuery({
    queryKey: ['jadwal-sempro', pengajuanTaId, userId],
    queryFn: async () => {
      if (!pengajuanTaId || !userId) return null;
      
      try {
        const { data, error } = await supabase
          .from('jadwal_sempros')
          .select(`
            *,
            penguji1:penguji_1(nama_dosen, nip, email),
            penguji2:penguji_2(nama_dosen, nip, email)
          `)
          .eq('pengajuan_ta_id', pengajuanTaId)
          .eq('user_id', userId)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') { // Not found error
            return null;
          }
          console.error("Error fetching jadwal sempro:", error);
          throw error;
        }
        
        return data as JadwalSempro;
      } catch (error) {
        console.error("Error in useJadwalSempro:", error);
        return null;
      }
    },
    enabled: !!pengajuanTaId && !!userId,
  });
}

// Get all active periods
export function usePeriodeSempros() {
  return useQuery({
    queryKey: ['periode-sempros'],
    queryFn: async () => {
      try {
        // Gunakan tabel periodes yang sudah ada
        const { data, error } = await supabase
          .from('periodes')
          .select('*')
          .order('tanggal_mulai', { ascending: false });
        
        if (error) {
          console.error("Error fetching periode sempros:", error);
          throw error;
        }
        
        return data.map(periode => ({
          id: periode.id,
          nama_periode: periode.nama_periode,
          tanggal_mulai: periode.mulai_daftar || periode.created_at,
          tanggal_selesai: periode.selesai_daftar || periode.updated_at,
          is_active: periode.is_active
        }));
      } catch (error) {
        console.error("Error in usePeriodeSempros:", error);
        return [];
      }
    },
  });
}

// Get all active periods (only those currently active)
export function useActivePeriodeSempros() {
  return useQuery({
    queryKey: ['periode-sempros-active'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('periodes')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error("Error fetching active periode sempros:", error);
          throw error;
        }
        
        return data.map(periode => ({
          id: periode.id,
          nama_periode: periode.nama_periode,
          tanggal_mulai: periode.mulai_daftar || periode.created_at,
          tanggal_selesai: periode.selesai_daftar || periode.updated_at,
          is_active: periode.is_active
        }));
      } catch (error) {
        console.error("Error in useActivePeriodeSempros:", error);
        return [];
      }
    },
  });
}

// Get penilaian for a sempro
export function usePenilaianSempro(semproId: string) {
  return useQuery({
    queryKey: ['penilaian-sempro', semproId],
    queryFn: async () => {
      if (!semproId) return [];
      
      try {
        const { data, error } = await supabase
          .from('penilaian_sempros')
          .select(`
            *,
            dosen:user_id(nama_dosen, nip, email)
          `)
          .eq('sempro_id', semproId);
        
        if (error) {
          console.error("Error fetching penilaian sempro:", error);
          throw error;
        }
        
        return data as PenilaianSempro[];
      } catch (error) {
        console.error("Error in usePenilaianSempro:", error);
        return [];
      }
    },
    enabled: !!semproId,
  });
}

// Check if a dosen has submitted penilaian
export function useDosenPenilaianStatus(semproId: string, dosenId: string) {
  return useQuery({
    queryKey: ['penilaian-status', semproId, dosenId],
    queryFn: async () => {
      if (!semproId || !dosenId) return null;
      
      try {
        const { data, error } = await supabase
          .from('penilaian_sempros')
          .select('*')
          .eq('sempro_id', semproId)
          .eq('user_id', dosenId)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') { // Not found error
            return false; // No penilaian submitted
          }
          console.error("Error checking penilaian status:", error);
          throw error;
        }
        
        return true; // Penilaian exists
      } catch (error) {
        console.error("Error in useDosenPenilaianStatus:", error);
        return false;
      }
    },
    enabled: !!semproId && !!dosenId,
  });
}

// Get riwayat for a sempro
export function useRiwayatSempro(semproId: string) {
  return useQuery({
    queryKey: ['riwayat-sempro', semproId],
    queryFn: async () => {
      if (!semproId) return [];
      
      try {
        const { data, error } = await supabase
          .from('riwayat_pendaftaran_sempros')
          .select(`
            *,
            user:user_id(name)
          `)
          .eq('sempro_id', semproId)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error("Error fetching riwayat sempro:", error);
          throw error;
        }
        
        return data as RiwayatPendaftaranSempro[];
      } catch (error) {
        console.error("Error in useRiwayatSempro:", error);
        return [];
      }
    },
    enabled: !!semproId,
  });
}

// Get student's thesis proposals for sempro registration
export function useStudentPengajuanTAforSempro() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['pengajuan-ta', 'for-sempro', user?.id],
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
        
        // Get approved thesis proposals that don't have sempro yet
        const { data, error } = await supabase
          .from('pengajuan_tas')
          .select('id, judul, bidang_penelitian, pembimbing_1, pembimbing_2')
          .eq('mahasiswa_id', mahasiswaData.id)
          .eq('status', 'approved');
          
        if (error) {
          console.error("Error fetching approved thesis proposals:", error);
          throw error;
        }
        
        // Filter out proposals that already have sempro
        const filteredData = await Promise.all(
          data.map(async (pengajuan) => {
            const { count, error: countError } = await supabase
              .from('sempros')
              .select('*', { count: 'exact', head: true })
              .eq('pengajuan_ta_id', pengajuan.id)
              .eq('user_id', user.id);
              
            if (countError) {
              console.error("Error checking sempro existence:", countError);
              return null;
            }
            
            return count === 0 ? pengajuan : null;
          })
        );
        
        return filteredData.filter(Boolean) as any[];
      } catch (error) {
        console.error("Error in useStudentPengajuanTAforSempro:", error);
        return [];
      }
    },
    enabled: !!user && user.roles.includes('mahasiswa'),
  });
}

// Create a new sempro registration
export function useCreateSempro() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { uploadFile } = useFileUpload();
  
  return useMutation({
    mutationFn: async (formValues: SemproFormValues) => {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      try {
        console.log("Creating new sempro with data:", formValues);
        
        // Verify required fields
        if (!formValues.pengajuan_ta_id) {
          throw new Error('Pengajuan TA harus dipilih');
        }
        
        // Check if files are provided
        if (!formValues.dokumen_ta012 || !formValues.dokumen_plagiarisme || !formValues.dokumen_draft) {
          throw new Error('Semua dokumen harus diupload');
        }
        
        // Check if user has registered in an active period
        const { data: periodeData, error: periodeError } = await supabase
          .from('periodes')  // Gunakan tabel periodes yang ada
          .select('id')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (periodeError || !periodeData) {
          throw new Error('Tidak ada periode pendaftaran sempro yang aktif saat ini');
        }
        
        // Upload files ke Google Drive
        let form_ta_012_url = "";
        let bukti_plagiasi_url = "";
        let proposal_ta_url = "";
        
        try {
          // Upload file TA-012
          const ta012Metadata = await uploadFile(formValues.dokumen_ta012, { 
            description: 'Form TA-012 untuk pendaftaran seminar proposal' 
          });
          if (ta012Metadata) form_ta_012_url = ta012Metadata.fileUrl;
          
          // Upload file bukti plagiasi
          const plagiarismMetadata = await uploadFile(formValues.dokumen_plagiarisme, { 
            description: 'Hasil cek plagiarisme untuk pendaftaran seminar proposal' 
          });
          if (plagiarismMetadata) bukti_plagiasi_url = plagiarismMetadata.fileUrl;
          
          // Upload file draft proposal
          const draftMetadata = await uploadFile(formValues.dokumen_draft, { 
            description: 'Draft proposal untuk pendaftaran seminar proposal' 
          });
          if (draftMetadata) proposal_ta_url = draftMetadata.fileUrl;
        } catch (error) {
          console.error('Error uploading files:', error);
          throw new Error('Gagal mengupload dokumen: ' + (error instanceof Error ? error.message : String(error)));
        }
        
        // Create the sempro record
        const { data, error } = await supabase
          .from('sempros')
          .insert([
            {
              user_id: user.id,
              pengajuan_ta_id: formValues.pengajuan_ta_id,
              periode_id: periodeData.id,      // Gunakan periode_id dari active periode
              tanggal: new Date().toISOString(), // Gunakan kolom tanggal yang ada
              form_ta_012: form_ta_012_url,    // Sesuaikan dengan nama kolom di tabel
              bukti_plagiasi: bukti_plagiasi_url, // Sesuaikan dengan nama kolom di tabel
              proposal_ta: proposal_ta_url,    // Sesuaikan dengan nama kolom di tabel 
              status: 'registered',            // Status awal
              approve_pembimbing_1: false,     // Default false
              approve_pembimbing_2: false      // Default false
            }
          ])
          .select();
        
        if (error) {
          console.error('Error creating sempro record:', error);
          throw error;
        }
        
        if (!data || data.length === 0) {
          throw new Error('Failed to create sempro record: No data returned');
        }
        
        // Create riwayat record
        await supabase
          .from('riwayat_pendaftaran_sempros')
          .insert([
            {
              sempro_id: data[0].id,
              pengajuan_ta_id: formValues.pengajuan_ta_id,
              user_id: user.id,
              status: 'registered',
              keterangan: 'Pendaftaran seminar proposal'
            }
          ]);
        
        // Create notification for admin
        const adminRoles = ['tendik', 'koorpro'];
        
        // Get admin users
        const { data: adminUsers, error: adminError } = await supabase
          .from('profiles')
          .select('id')
          .contains('roles', adminRoles);
          
        if (!adminError && adminUsers) {
          // Create notifications for each admin
          const notifications = adminUsers.map(admin => ({
            from_user: user.id,
            to_user: admin.id,
            judul: 'Pendaftaran Seminar Proposal Baru',
            pesan: 'Seorang mahasiswa telah mendaftar seminar proposal dan menunggu verifikasi',
            is_read: false
          }));
          
          // Insert notifications
          if (notifications.length > 0) {
            await supabase
              .from('notifikasis')
              .insert(notifications);
          }
        }
        
        return data[0];
      } catch (error) {
        console.error('Error in sempro creation process:', error);
        throw error instanceof Error ? error : new Error(String(error));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sempros'] });
      
      toast({
        title: "Pendaftaran Berhasil",
        description: "Pendaftaran seminar proposal berhasil. Menunggu verifikasi admin.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Gagal Mendaftar",
        description: error.message || "Terjadi kesalahan saat mendaftar seminar proposal.",
      });
    },
  });
}

// Update sempro status (for admin)
export function useUpdateSemproStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      catatan,
      mahasiswaId
    }: { 
      id: string, 
      status: StatusSempro,
      catatan?: string,
      mahasiswaId: string
    }) => {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      try {
        console.log(`Updating sempro status to ${status} for ID: ${id}`);
        
        // Update the sempro status
        const { data, error } = await supabase
          .from('sempros')
          .update({
            status,
            catatan: catatan || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select();
          
        if (error) {
          console.error('Error updating sempro status:', error);
          throw error;
        }
        
        // Add riwayat record
        let keterangan = '';
        switch (status) {
          case 'verified':
            keterangan = 'Dokumen telah diverifikasi oleh admin';
            break;
          case 'scheduled':
            keterangan = 'Seminar telah dijadwalkan';
            break;
          case 'completed':
            keterangan = 'Seminar telah selesai';
            break;
          case 'revision_required':
            keterangan = catatan || 'Perlu revisi pada dokumen';
            break;
          case 'rejected':
            keterangan = catatan || 'Pendaftaran ditolak';
            break;
          default:
            keterangan = `Status berubah menjadi ${status}`;
        }
        
        await supabase
          .from('riwayat_pendaftaran_sempros')
          .insert([
            {
              sempro_id: id,
              user_id: user.id,
              keterangan,
              status
            }
          ]);
        
        // Send notification to student
        await supabase
          .from('notifikasis')
          .insert([
            {
              from_user: user.id,
              to_user: mahasiswaId,
              judul: `Status Sempro: ${status}`,
              pesan: keterangan,
              is_read: false
            }
          ]);
        
        return data?.[0];
      } catch (error) {
        console.error('Error in update sempro status process:', error);
        throw error instanceof Error ? error : new Error(String(error));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sempros'] });
      queryClient.invalidateQueries({ queryKey: ['sempro'] });
      
      toast({
        title: "Status Diperbarui",
        description: "Status seminar proposal berhasil diperbarui.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Gagal Mengubah Status",
        description: error.message || "Terjadi kesalahan saat mengubah status seminar proposal.",
      });
    },
  });
}

// Create jadwal sempro
export function useCreateJadwalSempro() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (formValues: JadwalSemproFormValues) => {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      try {
        console.log("Creating jadwal sempro with data:", formValues);
        
        // Verify required fields
        if (!formValues.periode_id || !formValues.pengajuan_ta_id || !formValues.user_id ||
            !formValues.penguji_1 || !formValues.penguji_2 || !formValues.tanggal_sempro ||
            !formValues.waktu_mulai || !formValues.waktu_selesai || !formValues.ruangan) {
          throw new Error('Semua field jadwal harus diisi');
        }
        
        // Create jadwal sempro record
        const { data, error } = await supabase
          .from('jadwal_sempros')
          .insert([{
            ...formValues,
            is_published: formValues.is_published || false
          }])
          .select();
          
        if (error) {
          console.error('Error creating jadwal sempro:', error);
          throw error;
        }
        
        // Update sempro status to scheduled
        if (data && data.length > 0) {
          // Get sempro id
          const { data: semproData, error: semproError } = await supabase
            .from('sempros')
            .select('id')
            .eq('pengajuan_ta_id', formValues.pengajuan_ta_id)
            .eq('user_id', formValues.user_id)
            .single();
            
          if (!semproError && semproData) {
            // Update status
            await supabase
              .from('sempros')
              .update({ status: 'scheduled' })
              .eq('id', semproData.id);
              
            // Add riwayat record
            await supabase
              .from('riwayat_pendaftaran_sempros')
              .insert([{
                sempro_id: semproData.id,
                user_id: user.id,
                keterangan: 'Seminar telah dijadwalkan',
                status: 'scheduled'
              }]);
              
            // Notify student and penguji
            const notifications = [
              {
                from_user: user.id,
                to_user: formValues.user_id,
                judul: 'Jadwal Seminar Proposal',
                pesan: `Seminar proposal Anda telah dijadwalkan pada tanggal ${formValues.tanggal_sempro}, pukul ${formValues.waktu_mulai} di ruangan ${formValues.ruangan}`,
                is_read: false
              },
              {
                from_user: user.id,
                to_user: formValues.penguji_1,
                judul: 'Jadwal Seminar Proposal',
                pesan: `Anda dijadwalkan sebagai Penguji 1 pada seminar proposal pada tanggal ${formValues.tanggal_sempro}, pukul ${formValues.waktu_mulai} di ruangan ${formValues.ruangan}`,
                is_read: false
              },
              {
                from_user: user.id,
                to_user: formValues.penguji_2,
                judul: 'Jadwal Seminar Proposal',
                pesan: `Anda dijadwalkan sebagai Penguji 2 pada seminar proposal pada tanggal ${formValues.tanggal_sempro}, pukul ${formValues.waktu_mulai} di ruangan ${formValues.ruangan}`,
                is_read: false
              }
            ];
            
            await supabase
              .from('notifikasis')
              .insert(notifications);
          }
        }
        
        return data?.[0];
      } catch (error) {
        console.error('Error in create jadwal sempro process:', error);
        throw error instanceof Error ? error : new Error(String(error));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sempros'] });
      queryClient.invalidateQueries({ queryKey: ['jadwal-sempro'] });
      
      toast({
        title: "Jadwal Dibuat",
        description: "Jadwal seminar proposal berhasil dibuat.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Gagal Membuat Jadwal",
        description: error.message || "Terjadi kesalahan saat membuat jadwal seminar proposal.",
      });
    },
  });
}

// Update jadwal sempro
export function useUpdateJadwalSempro() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: string, 
      data: Partial<JadwalSemproFormValues>
    }) => {
      try {
        console.log("Updating jadwal sempro with data:", data);
        
        // Update jadwal sempro
        const { data: updatedData, error } = await supabase
          .from('jadwal_sempros')
          .update({
            ...data,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select();
          
        if (error) {
          console.error('Error updating jadwal sempro:', error);
          throw error;
        }
        
        // If is_published changed to true, notify participants
        if (data.is_published === true) {
          // Get full jadwal data
          const { data: jadwalData, error: jadwalError } = await supabase
            .from('jadwal_sempros')
            .select('*')
            .eq('id', id)
            .single();
            
          if (!jadwalError && jadwalData) {
            // Notify student and penguji
            const notifications = [
              {
                from_user: jadwalData.user_id, // Use admin user ID in real case
                to_user: jadwalData.user_id,
                judul: 'Jadwal Seminar Proposal Dipublikasikan',
                pesan: `Jadwal seminar proposal Anda pada tanggal ${jadwalData.tanggal_sempro}, pukul ${jadwalData.waktu_mulai} di ruangan ${jadwalData.ruangan} telah dipublikasikan`,
                is_read: false
              },
              {
                from_user: jadwalData.user_id, // Use admin user ID in real case
                to_user: jadwalData.penguji_1,
                judul: 'Jadwal Seminar Proposal Dipublikasikan',
                pesan: `Jadwal seminar proposal pada tanggal ${jadwalData.tanggal_sempro}, pukul ${jadwalData.waktu_mulai} di ruangan ${jadwalData.ruangan} telah dipublikasikan`,
                is_read: false
              },
              {
                from_user: jadwalData.user_id, // Use admin user ID in real case
                to_user: jadwalData.penguji_2,
                judul: 'Jadwal Seminar Proposal Dipublikasikan',
                pesan: `Jadwal seminar proposal pada tanggal ${jadwalData.tanggal_sempro}, pukul ${jadwalData.waktu_mulai} di ruangan ${jadwalData.ruangan} telah dipublikasikan`,
                is_read: false
              }
            ];
            
            await supabase
              .from('notifikasis')
              .insert(notifications);
          }
        }
        
        return updatedData?.[0];
      } catch (error) {
        console.error('Error in update jadwal sempro process:', error);
        throw error instanceof Error ? error : new Error(String(error));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jadwal-sempro'] });
      
      toast({
        title: "Jadwal Diperbarui",
        description: "Jadwal seminar proposal berhasil diperbarui.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Gagal Memperbarui Jadwal",
        description: error.message || "Terjadi kesalahan saat memperbarui jadwal seminar proposal.",
      });
    },
  });
}

function getSemesterFromPeriode(periodeName: string): string {
  // Contoh format: "Semester Genap 2024/2025"
  if (periodeName.toLowerCase().includes('ganjil')) {
    return 'Ganjil';
  } else if (periodeName.toLowerCase().includes('genap')) {
    return 'Genap';
  } else {
    return 'Reguler'; // Default value
  }
}

// Helper function to extract year from periode name
function getYearFromPeriode(periodeName: string): string {
  // Contoh format: "Semester Genap 2024/2025"
  const yearMatch = periodeName.match(/\d{4}\/\d{4}/);
  if (yearMatch) {
    return yearMatch[0];
  } else {
    // Jika format tidak sesuai, gunakan tahun sekarang
    const currentYear = new Date().getFullYear();
    return `${currentYear}/${currentYear + 1}`;
  }
}

// Create periode
export function useCreatePeriodeSempro() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (formValues: PeriodeSemproFormValues) => {
      try {
        console.log("Creating periode sempro with data:", formValues);
        
        // Verify required fields
        if (!formValues.nama_periode || !formValues.tanggal_mulai || !formValues.tanggal_selesai) {
          throw new Error('Semua field periode harus diisi');
        }
        
        // Extract semester and year from periode name
        const semester = getSemesterFromPeriode(formValues.nama_periode);
        const tahun = getYearFromPeriode(formValues.nama_periode);
        
        // Create periodes record
        const { data, error } = await supabase
          .from('periodes')  // Gunakan tabel 'periodes'
          .insert([{
            nama_periode: formValues.nama_periode,
            semester: semester,
            tahun: tahun,
            is_active: formValues.is_active,
            mulai_daftar: formValues.tanggal_mulai,
            selesai_daftar: formValues.tanggal_selesai,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select();
          
        if (error) {
          console.error('Error creating periode sempro:', error);
          throw error;
        }
        
        return data?.[0];
      } catch (error) {
        console.error('Error in create periode sempro process:', error);
        throw error instanceof Error ? error : new Error(String(error));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periode-sempros'] });
      queryClient.invalidateQueries({ queryKey: ['periode-sempros-active'] });
      
      toast({
        title: "Periode Dibuat",
        description: "Periode pendaftaran seminar proposal berhasil dibuat.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Gagal Membuat Periode",
        description: error.message || "Terjadi kesalahan saat membuat periode pendaftaran seminar proposal.",
      });
    },
  });
}

// Update periode sempro
export function useUpdatePeriodeSempro() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: string, 
      data: Partial<PeriodeSemproFormValues>
    }) => {
      try {
        console.log("Updating periode sempro with data:", data);
        
        // Map data ke struktur tabel periodes
        const updateData: any = {};
        if (data.nama_periode) updateData.nama_periode = data.nama_periode;
        if (data.tanggal_mulai) updateData.mulai_daftar = data.tanggal_mulai;
        if (data.tanggal_selesai) updateData.selesai_daftar = data.tanggal_selesai;
        if (data.is_active !== undefined) updateData.is_active = data.is_active;
        
        // Tambahkan semester dan tahun jika nama periode berubah
        if (data.nama_periode) {
          updateData.semester = getSemesterFromPeriode(data.nama_periode);
          updateData.tahun = getYearFromPeriode(data.nama_periode);
        }
        
        updateData.updated_at = new Date().toISOString();
        
        // Update periodes table
        const { data: updatedData, error } = await supabase
          .from('periodes')
          .update(updateData)
          .eq('id', id)
          .select();
          
        if (error) {
          console.error('Error updating periode sempro:', error);
          throw error;
        }
        
        return updatedData?.[0];
      } catch (error) {
        console.error('Error in update periode sempro process:', error);
        throw error instanceof Error ? error : new Error(String(error));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periode-sempros'] });
      queryClient.invalidateQueries({ queryKey: ['periode-sempros-active'] });
      
      toast({
        title: "Periode Diperbarui",
        description: "Periode pendaftaran seminar proposal berhasil diperbarui.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Gagal Memperbarui Periode",
        description: error.message || "Terjadi kesalahan saat memperbarui periode pendaftaran seminar proposal.",
      });
    },
  });
}

// Submit penilaian sempro
export function useSubmitPenilaianSempro() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (formValues: PenilaianSemproFormValues) => {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      try {
        console.log("Submitting penilaian sempro with data:", formValues);
        
        // Verify required fields
        if (!formValues.sempro_id || !formValues.media_presentasi || !formValues.komunikasi ||
            !formValues.penguasaan_materi || !formValues.isi_laporan_ta || !formValues.struktur_penulisan) {
          throw new Error('Semua kriteria penilaian harus diisi');
        }
        
        // Calculate total score
        const total = (
          Number(formValues.media_presentasi) +
          Number(formValues.komunikasi) +
          Number(formValues.penguasaan_materi) +
          Number(formValues.isi_laporan_ta) +
          Number(formValues.struktur_penulisan)
        );
        
        // Create penilaian sempro record
        const { data, error } = await supabase
          .from('penilaian_sempros')
          .insert([{
            sempro_id: formValues.sempro_id,
            user_id: user.id,
            media_presentasi: formValues.media_presentasi,
            komunikasi: formValues.komunikasi,
            penguasaan_materi: formValues.penguasaan_materi,
            isi_laporan_ta: formValues.isi_laporan_ta,
            struktur_penulisan: formValues.struktur_penulisan,
            nilai_total: total,
            catatan: formValues.catatan || null
          }])
          .select();
          
        if (error) {
          console.error('Error submitting penilaian sempro:', error);
          throw error;
        }
        
        // Get sempro data to check if all penguji have submitted penilaian
        const { data: semproData, error: semproError } = await supabase
          .from('sempros')
          .select('id, user_id')
          .eq('id', formValues.sempro_id)
          .single();
          
        if (!semproError && semproData) {
          // Get jadwal to find both penguji
          const { data: jadwalData, error: jadwalError } = await supabase
            .from('jadwal_sempros')
            .select('penguji_1, penguji_2')
            .eq('pengajuan_ta_id', formValues.sempro_id)
            .eq('user_id', semproData.user_id)
            .single();
            
          if (!jadwalError && jadwalData) {
            // Check if both penguji have submitted penilaian
            const { data: penilaianData, error: penilaianError } = await supabase
              .from('penilaian_sempros')
              .select('user_id')
              .eq('sempro_id', formValues.sempro_id);
              
            if (!penilaianError && penilaianData) {
              const pengujiIds = penilaianData.map(p => p.user_id);
              const allPengujiSubmitted = 
                pengujiIds.includes(jadwalData.penguji_1) && 
                pengujiIds.includes(jadwalData.penguji_2);
                
              if (allPengujiSubmitted) {
                // Update sempro status to completed
                await supabase
                  .from('sempros')
                  .update({ status: 'completed' })
                  .eq('id', formValues.sempro_id);
                  
                // Add riwayat record
                await supabase
                  .from('riwayat_pendaftaran_sempros')
                  .insert([{
                    sempro_id: formValues.sempro_id,
                    user_id: user.id,
                    keterangan: 'Semua penilaian telah diberikan dan seminar dinyatakan selesai',
                    status: 'completed'
                  }]);
                  
                // Notify student
                await supabase
                  .from('notifikasis')
                  .insert([{
                    from_user: user.id,
                    to_user: semproData.user_id,
                    judul: 'Seminar Proposal Selesai',
                    pesan: 'Semua penilaian telah diberikan dan seminar proposal Anda dinyatakan selesai',
                    is_read: false
                  }]);
              }
            }
          }
        }
        
        return data?.[0];
      } catch (error) {
        console.error('Error in penilaian sempro submission process:', error);
        throw error instanceof Error ? error : new Error(String(error));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penilaian-sempro'] });
      queryClient.invalidateQueries({ queryKey: ['penilaian-status'] });
      queryClient.invalidateQueries({ queryKey: ['sempro'] });
      
      toast({
        title: "Penilaian Dikirim",
        description: "Penilaian seminar proposal berhasil dikirim.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Gagal Mengirim Penilaian",
        description: error.message || "Terjadi kesalahan saat mengirim penilaian seminar proposal.",
      });
    },
  });
}
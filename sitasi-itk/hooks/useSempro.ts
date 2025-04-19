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
import { useRouter } from 'next/navigation';
import { useGoogleDriveStorage } from '@/hooks/useGoogleDriveStorage';

// Constants
const SEMPRO_FOLDER_ID = process.env.NEXT_PUBLIC_SEMPRO_FOLDER_ID || '1y-4qBRLQnkLezBcYYf_N6kMxqaUXa6Lx';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Helper function to safely access pengajuan_ta properties
 */
function getPengajuanTaValue(pengajuanTa: any, propertyName: string): any {
  if (!pengajuanTa) return null;
  
  // Handle if pengajuan_ta is an array
  if (Array.isArray(pengajuanTa) && pengajuanTa.length > 0) {
    return pengajuanTa[0][propertyName];
  }
  
  // Handle if pengajuan_ta is an object
  if (typeof pengajuanTa === 'object') {
    return pengajuanTa[propertyName];
  }
  
  return null;
}

/**
 * Helper to create file metadata from URL
 */
function createFileMetadataFromUrl(url: string | null | undefined, type: string): FileMetadata | null {
  if (!url) return null;
  
  try {
    // Extract filename from URL (get last part of path)
    const pathParts = url.split('/');
    const fullFileName = pathParts[pathParts.length - 1];
    
    // Try to extract filename from timestamped format
    let fileName = fullFileName;
    const timestampMatch = fullFileName.match(/\d+_(.+)/);
    if (timestampMatch && timestampMatch[1]) {
      fileName = timestampMatch[1];
    }
    
    return {
      fileId: url,
      fileUrl: url,
      fileName: fileName || `Dokumen ${type}`,
      fileType: fileName.split('.').pop()?.toLowerCase() || 'pdf',
      uploadedAt: new Date().toISOString()
    };
  } catch (e) {
    console.error("Error creating file metadata from URL:", e);
    return null;
  }
}

/**
 * Helper to extract semester from periode name
 */
function getSemesterFromPeriode(periodeName: string): string {
  if (periodeName.toLowerCase().includes('ganjil')) {
    return 'Ganjil';
  } else if (periodeName.toLowerCase().includes('genap')) {
    return 'Genap';
  } else {
    return 'Reguler'; // Default value
  }
}

/**
 * Helper to extract year from periode name
 */
function getYearFromPeriode(periodeName: string): string {
  const yearMatch = periodeName.match(/\d{4}\/\d{4}/);
  if (yearMatch) {
    return yearMatch[0];
  } else {
    // If format doesn't match, use current year
    const currentYear = new Date().getFullYear();
    return `${currentYear}/${currentYear + 1}`;
  }
}

/**
 * Helper to enhance sempro with additional details
 */
async function enhanceSemproWithDetails(data: any): Promise<Sempro | null> {
  if (!data) return null;
  
  try {
    // Get mahasiswa data
    const { data: mahasiswaData, error: mahasiswaError } = await supabase
      .from('mahasiswas')
      .select('nama, nim, email, nomor_telepon')
      .eq('user_id', data.user_id)
      .single();
    
    if (mahasiswaError) {
      console.warn("Could not fetch mahasiswa data:", mahasiswaError);
    }
    
    // Check for pengajuan_ta data and load it if not already loaded
    let pengajuanTa = data.pengajuan_ta;
    if (!pengajuanTa && data.pengajuan_ta_id) {
      const { data: pengajuanData, error: pengajuanError } = await supabase
        .from('pengajuan_tas')
        .select('id, judul, bidang_penelitian, pembimbing_1, pembimbing_2, mahasiswa_id')
        .eq('id', data.pengajuan_ta_id)
        .single();
        
      if (!pengajuanError) {
        pengajuanTa = pengajuanData;
      } else {
        console.warn("Could not fetch pengajuan_ta data:", pengajuanError);
      }
    }
    
    // Create metadata objects for files
    const dokumenTA012 = createFileMetadataFromUrl(data.form_ta_012, "TA-012");
    const dokumenPlagiarisme = createFileMetadataFromUrl(data.bukti_plagiasi, "Plagiarisme");
    const dokumenDraft = createFileMetadataFromUrl(data.proposal_ta, "Proposal");
    
    const enhancedData = {
      ...data,
      // Keep the status as is now, since we've standardized the enum in the database
      status: data.status,
      mahasiswa: mahasiswaError ? null : mahasiswaData,
      pengajuan_ta: pengajuanTa || data.pengajuan_ta,
      // Add metadata objects for frontend compatibility
      dokumen_ta012: dokumenTA012,
      dokumen_plagiarisme: dokumenPlagiarisme,
      dokumen_draft: dokumenDraft
    };
    
    return enhancedData as Sempro;
  } catch (err) {
    console.error("Error enhancing sempro detail:", err);
    return data;
  }
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch sempro detail by ID
 */
export function useSemproDetail(id: string) {
  return useQuery({
    queryKey: ['sempro', id],
    queryFn: async () => {
      console.log("Fetching sempro with ID:", id);
      
      if (!id) return null;
      
      try {
        // Try directly from sempros table
        const { data, error } = await supabase
          .from('sempros')
          .select(`
            *,
            pengajuan_ta:pengajuan_ta_id(id, judul, bidang_penelitian, pembimbing_1, pembimbing_2, mahasiswa_id)
          `)
          .eq('id', id)
          .single();
        
        if (error) {
          // If not found in sempros, try from jadwal_sempros
          if (error.code === 'PGRST116') {
            console.log("Sempro not found directly, trying from jadwal_sempros");
            
            const { data: jadwalData, error: jadwalError } = await supabase
              .from('jadwal_sempros')
              .select(`
                *,
                pengajuan_ta:pengajuan_ta_id(id, judul, bidang_penelitian)
              `)
              .eq('id', id)
              .single();
              
            if (jadwalError) {
              console.error("Error fetching jadwal sempro:", jadwalError);
              throw new Error("Data seminar proposal tidak ditemukan");
            }
            
            // If jadwal found, get associated sempro
            if (jadwalData) {
              const { data: semproData, error: semproError } = await supabase
                .from('sempros')
                .select(`
                  *,
                  pengajuan_ta:pengajuan_ta_id(id, judul, bidang_penelitian, pembimbing_1, pembimbing_2, mahasiswa_id)
                `)
                .eq('pengajuan_ta_id', jadwalData.pengajuan_ta_id)
                .eq('user_id', jadwalData.user_id)
                .single();
                
              if (semproError) {
                console.error("Error fetching sempro from jadwal:", semproError);
                throw new Error("Data sempro terkait jadwal tidak ditemukan");
              }
              
              return await enhanceSemproWithDetails(semproData);
            }
            
            throw new Error("Data seminar proposal tidak ditemukan");
          }
          
          console.error("Error fetching sempro details:", error);
          throw error;
        }
        
        return await enhanceSemproWithDetails(data);
      } catch (error) {
        console.error("Error in useSemproDetail:", error);
        throw error;
      }
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch all sempros (admin use)
 */
export function useAllSempros() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['sempros', 'all', user?.id],
    queryFn: async () => {
      try {
        console.log("Fetching all sempros for admin");
        
        // Verify admin access
        if (!user?.roles.includes('tendik') && !user?.roles.includes('koorpro')) {
          console.log("User does not have admin access", user?.roles);
        }
        
        // Perform query with basic joins
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
        
        // Enhance with mahasiswa details
        const enhancedData = await Promise.all(data.map(async (sempro) => {
          try {
            // Get mahasiswa data
            const { data: mahasiswaData, error: mahasiswaError } = await supabase
              .from('mahasiswas')
              .select('nama, nim, email, nomor_telepon')
              .eq('user_id', sempro.user_id)
              .single();
            
            // Create metadata objects for files
            const dokumenTA012 = createFileMetadataFromUrl(sempro.form_ta_012, "TA-012");
            const dokumenPlagiarisme = createFileMetadataFromUrl(sempro.bukti_plagiasi, "Plagiarisme");
            const dokumenDraft = createFileMetadataFromUrl(sempro.proposal_ta, "Proposal");
            
            return {
              ...sempro,
              mahasiswa: mahasiswaError ? null : mahasiswaData,
              dokumen_ta012: dokumenTA012,
              dokumen_plagiarisme: dokumenPlagiarisme,
              dokumen_draft: dokumenDraft
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

/**
 * Hook to fetch sempros for a specific student
 */
export function useStudentSempros() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['sempros', 'student', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        console.log("Fetching sempros for student with user ID:", user.id);
        
        // Query user's sempros
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
        
        // Enhance with metadata objects
        const enhancedData = await Promise.all(data.map(async (sempro) => {
          try {
            // Create metadata objects for files
            const dokumenTA012 = createFileMetadataFromUrl(sempro.form_ta_012, "TA-012");
            const dokumenPlagiarisme = createFileMetadataFromUrl(sempro.bukti_plagiasi, "Plagiarisme");
            const dokumenDraft = createFileMetadataFromUrl(sempro.proposal_ta, "Proposal");
            
            // Check for rejection reasons in riwayat if status is 'rejected'
            let rejectionReason = null;
            if (sempro.status === 'rejected') {
              const { data: riwayatData } = await supabase
                .from('riwayat_pendaftaran_sempros')
                .select('keterangan')
                .eq('sempro_id', sempro.id)
                .ilike('keterangan', 'DITOLAK%')
                .order('created_at', { ascending: false })
                .limit(1);
              
              if (riwayatData && riwayatData.length > 0) {
                rejectionReason = riwayatData[0].keterangan?.replace('DITOLAK: ', '') || null;
              }
            }
            
            return {
              ...sempro,
              dokumen_ta012: dokumenTA012,
              dokumen_plagiarisme: dokumenPlagiarisme,
              dokumen_draft: dokumenDraft,
              rejection_reason: rejectionReason
            };
          } catch (err) {
            console.error(`Error enhancing sempro ID ${sempro.id}:`, err);
            return sempro;
          }
        }));
        
        console.log(`Found ${enhancedData.length} sempros for student`);
        return enhancedData as Sempro[];
      } catch (error) {
        console.error("Error in useStudentSempros:", error);
        return [];
      }
    },
    enabled: !!user && user.roles.includes('mahasiswa'),
  });
}

/**
 * Hook to fetch sempros for a dosen
 */
export function useDosenSempros() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['sempros', 'dosen', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        console.log("Fetching sempros for dosen with user ID:", user.id);
        
        // 1. Get sempros where dosen is pembimbing
        const { data: pembimbingSempros, error: pembimbingError } = await supabase
          .from('pengajuan_tas')
          .select(`
            id, 
            judul,
            bidang_penelitian,
            sempros:sempros(*)
          `)
          .or(`pembimbing_1.eq.${user.id},pembimbing_2.eq.${user.id}`)
          .not('sempros', 'is', null);
        
        if (pembimbingError) {
          console.error("Error fetching sempros as pembimbing:", pembimbingError);
        }
        
        // 2. Get jadwal_sempros where dosen is penguji
        const { data: jadwalData, error: jadwalError } = await supabase
          .from('jadwal_sempros')
          .select(`
            *,
            pengajuan_ta:pengajuan_ta_id(judul, bidang_penelitian)
          `)
          .or(`penguji_1.eq.${user.id},penguji_2.eq.${user.id}`)
          .eq('is_published', true)  // Only get published schedules
          .order('tanggal_sempro', { ascending: false });
        
        if (jadwalError) {
          console.error("Error fetching jadwal sempros for dosen:", jadwalError);
        }
        
        // Combine the results
        const results = [];
        
        // Process jadwal data
        if (jadwalData) {
          const enhancedJadwal = await Promise.all(jadwalData.map(async (jadwal) => {
            try {
              // Get mahasiswa data
              const { data: mahasiswaData } = await supabase
                .from('mahasiswas')
                .select('nama, nim, email, nomor_telepon')
                .eq('user_id', jadwal.user_id)
                .single();
                  
              // Get sempro data
              const { data: semproData } = await supabase
                .from('sempros')
                .select('*')
                .eq('pengajuan_ta_id', jadwal.pengajuan_ta_id)
                .eq('user_id', jadwal.user_id)
                .maybeSingle();
              
              // Check if dosen has already submitted penilaian
              let isPenilaianSubmitted = false;
              
              if (semproData) {
                const { data: penilaianData } = await supabase
                  .from('penilaian_sempros')
                  .select('id')
                  .eq('sempro_id', semproData.id)
                  .eq('user_id', user.id);
                
                isPenilaianSubmitted = !!penilaianData && penilaianData.length > 0;
              }
              
              return {
                ...jadwal,
                mahasiswa: mahasiswaData || null,
                sempro: semproData || null,
                semproId: semproData?.id,
                isPenilaianSubmitted,
                tipe: 'penguji'
              };
            } catch (err) {
              console.error(`Error enhancing jadwal ID ${jadwal.id}:`, err);
              return jadwal;
            }
          }));
          
          results.push(...enhancedJadwal);
        }
        
        // Process pembimbing sempros
        if (pembimbingSempros) {
          for (const pengajuan of pembimbingSempros) {
            if (pengajuan.sempros && pengajuan.sempros.length > 0) {
              for (const sempro of pengajuan.sempros) {
                // Get mahasiswa data
                const { data: mahasiswaData } = await supabase
                  .from('mahasiswas')
                  .select('nama, nim, email, nomor_telepon')
                  .eq('user_id', sempro.user_id)
                  .single();
                
                // Check if dosen has already submitted penilaian
                const { data: penilaianData } = await supabase
                  .from('penilaian_sempros')
                  .select('id')
                  .eq('sempro_id', sempro.id)
                  .eq('user_id', user.id);
                
                const isPenilaianSubmitted = !!penilaianData && penilaianData.length > 0;
                
                results.push({
                  id: sempro.id,
                  pengajuan_ta: {
                    judul: pengajuan.judul,
                    bidang_penelitian: pengajuan.bidang_penelitian
                  },
                  mahasiswa: mahasiswaData || null,
                  sempro: sempro,
                  isPenilaianSubmitted,
                  tipe: 'pembimbing'
                });
              }
            }
          }
        }
        
        console.log(`Found ${results.length} sempros for dosen`);
        return results;
      } catch (error) {
        console.error("Error in useDosenSempros:", error);
        return [];
      }
    },
    enabled: !!user && user.roles.includes('dosen'),
  });
}

/**
 * Hook to fetch all jadwal sempros
 */
export function useAllJadwalSempros() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<UserRole>('mahasiswa');
  
  // Set user role
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
  
  return useQuery({
    queryKey: ['jadwal-sempros', 'all', user?.id, userRole],
    queryFn: async () => {
      try {
        console.log("Fetching all jadwal sempros for role:", userRole);
        
        // Base query for jadwal
        let query = supabase
          .from('jadwal_sempros')
          .select(`
            *,
            pengajuan_ta:pengajuan_ta_id(judul, bidang_penelitian)
          `);
        
        // Filter for mahasiswa: only show published jadwal or their own
        if (userRole === 'mahasiswa' && user) {
          query = query.or(`is_published.eq.true,user_id.eq.${user.id}`);
        }
        
        // Filter for dosen: only show jadwal where they are penguji
        if (userRole === 'dosen' && user) {
          query = query.or(`penguji_1.eq.${user.id},penguji_2.eq.${user.id}`);
        }
        
        // Execute query and sort by date
        const { data, error } = await query.order('tanggal_sempro', { ascending: false });
        
        if (error) {
          console.error("Error fetching jadwal sempros:", error);
          throw error;
        }
        
        // Enhance data with details
        const enhancedData = await Promise.all(data.map(async (jadwal) => {
          try {
            // Get mahasiswa data
            const { data: mahasiswaData, error: mahasiswaError } = await supabase
              .from('mahasiswas')
              .select('nama, nim, email, nomor_telepon')
              .eq('user_id', jadwal.user_id)
              .single();
            
            // Get penguji 1 data
            const { data: penguji1Data, error: penguji1Error } = await supabase
              .from('dosens')
              .select('nama_dosen, nip, email')
              .eq('user_id', jadwal.penguji_1)
              .maybeSingle();
              
            // Get penguji 1 profile as fallback
            const { data: penguji1Profile, error: penguji1ProfileError } = !penguji1Data ? await supabase
              .from('profiles')
              .select('name')
              .eq('id', jadwal.penguji_1)
              .single() : { data: null, error: null };
            
            // Get penguji 2 data
            const { data: penguji2Data, error: penguji2Error } = await supabase
              .from('dosens')
              .select('nama_dosen, nip, email')
              .eq('user_id', jadwal.penguji_2)
              .maybeSingle();
              
            // Get penguji 2 profile as fallback
            const { data: penguji2Profile, error: penguji2ProfileError } = !penguji2Data ? await supabase
              .from('profiles')
              .select('name')
              .eq('id', jadwal.penguji_2)
              .single() : { data: null, error: null };
              
            // Get sempro data
            const { data: semproData, error: semproError } = await supabase
              .from('sempros')
              .select('*')
              .eq('pengajuan_ta_id', jadwal.pengajuan_ta_id)
              .eq('user_id', jadwal.user_id)
              .maybeSingle();
            
            return {
              ...jadwal,
              mahasiswa: mahasiswaError ? null : mahasiswaData,
              penguji1: {
                nama_dosen: penguji1Data?.nama_dosen || penguji1Profile?.name || 'Dosen 1',
                nip: penguji1Data?.nip || '',
                email: penguji1Data?.email || ''
              },
              penguji2: {
                nama_dosen: penguji2Data?.nama_dosen || penguji2Profile?.name || 'Dosen 2',
                nip: penguji2Data?.nip || '',
                email: penguji2Data?.email || ''
              },
              sempro: semproError ? null : semproData
            };
          } catch (err) {
            console.error(`Error enhancing jadwal ID ${jadwal.id}:`, err);
            return jadwal;
          }
        }));
        
        console.log(`Found ${enhancedData.length} jadwal sempro records for role ${userRole}`);
        return enhancedData as JadwalSempro[];
      } catch (error) {
        console.error("Unexpected error in useAllJadwalSempros:", error);
        return [];
      }
    },
    enabled: !!user,
  });
}

/**
 * Hook for dosen jadwal sempros
 */
export function useDosenJadwalSempros() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['jadwal-sempros', 'dosen-all', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        console.log("Fetching jadwal sempros for dosen with user ID:", user.id);
        
        // 1. Get all pengajuan TA where dosen is pembimbing
        const { data: pengajuanData, error: pengajuanError } = await supabase
          .from('pengajuan_tas')
          .select('id')
          .or(`pembimbing_1.eq.${user.id},pembimbing_2.eq.${user.id}`);
          
        if (pengajuanError) {
          console.error("Error fetching pengajuan as pembimbing:", pengajuanError);
        }
        
        // Create array of pengajuan IDs
        const pembimbingPengajuanIds = pengajuanData && pengajuanData.length > 0 
          ? pengajuanData.map(p => p.id) 
          : [];
        
        // 2. Get jadwal based on: dosen as penguji OR pengajuan as pembimbing
        let query = supabase
          .from('jadwal_sempros')
          .select(`
            *,
            pengajuan_ta:pengajuan_ta_id(id, judul, bidang_penelitian)
          `);
        
        // Build combined filter
        let filterConditions = [];
        
        // Add filter as penguji
        filterConditions.push(`penguji_1.eq.${user.id}`);
        filterConditions.push(`penguji_2.eq.${user.id}`);
        
        // Add filter for pengajuan if there are any
        if (pembimbingPengajuanIds.length > 0) {
          const pengajuanFilter = `pengajuan_ta_id.in.(${pembimbingPengajuanIds.join(',')})`;
          filterConditions.push(pengajuanFilter);
        }
        
        // Apply filter
        query = query.or(filterConditions.join(','));
        
        // Only get published and sort by date
        const { data, error } = await query
          .eq('is_published', true)
          .order('tanggal_sempro', { ascending: false });
        
        if (error) {
          console.error("Error fetching jadwal sempros:", error);
          throw error;
        }
        
        // Enhance data with mahasiswa and penguji
        const enhancedData = await Promise.all(data.map(async (jadwal) => {
          try {
            // Get mahasiswa data
            const { data: mahasiswaData, error: mahasiswaError } = await supabase
              .from('mahasiswas')
              .select('nama, nim, email, nomor_telepon')
              .eq('user_id', jadwal.user_id)
              .single();
            
            // Get penguji 1 data
            const { data: penguji1Data, error: penguji1Error } = await supabase
              .from('dosens')
              .select('nama_dosen, nip, email')
              .eq('user_id', jadwal.penguji_1)
              .maybeSingle();
            
            // Get penguji 2 data
            const { data: penguji2Data, error: penguji2Error } = await supabase
              .from('dosens')
              .select('nama_dosen, nip, email')
              .eq('user_id', jadwal.penguji_2)
              .maybeSingle();
              
            // Get sempro data
            const { data: semproData, error: semproError } = await supabase
              .from('sempros')
              .select('*')
              .eq('pengajuan_ta_id', jadwal.pengajuan_ta_id)
              .eq('user_id', jadwal.user_id)
              .maybeSingle();
            
            // Check if this jadwal belongs to pembimbing
            const isPembimbing = pembimbingPengajuanIds.includes(jadwal.pengajuan_ta_id);
            
            return {
              ...jadwal,
              mahasiswa: mahasiswaError ? null : mahasiswaData,
              penguji1: {
                nama_dosen: penguji1Data?.nama_dosen || 'Penguji 1', 
                nip: penguji1Data?.nip || '',
                email: penguji1Data?.email || ''
              },
              penguji2: {
                nama_dosen: penguji2Data?.nama_dosen || 'Penguji 2',
                nip: penguji2Data?.nip || '',
                email: penguji2Data?.email || ''
              },
              sempro: semproError ? null : semproData,
              semproId: semproData?.id,
              isPembimbing: isPembimbing,
              dosenRole: isPembimbing ? (
                jadwal.penguji_1 === user.id || jadwal.penguji_2 === user.id 
                  ? 'Penguji & Pembimbing' 
                  : 'Pembimbing'
              ) : 'Penguji'
            };
          } catch (err) {
            console.error(`Error enhancing jadwal ID ${jadwal.id}:`, err);
            return jadwal;
          }
        }));
        
        return enhancedData;
      } catch (error) {
        console.error("Error in useDosenJadwalSempros:", error);
        return [];
      }
    },
    enabled: !!user && user.roles.includes('dosen'),
  });
}

/**
 * Hook to fetch jadwal for a specific sempro
 */
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

/**
 * Hook to get a single jadwal sempro by ID
 */
export function useJadwalSemproDetail(id: string) {
  return useQuery({
    queryKey: ['jadwal-sempro-detail', id],
    queryFn: async () => {
      if (!id) return null;
      
      try {
        console.log("Fetching jadwal sempro detail with ID:", id);
        
        // Fetch the jadwal data without joining to penguji directly
        const { data, error } = await supabase
          .from('jadwal_sempros')
          .select(`
            *,
            pengajuan_ta:pengajuan_ta_id(judul, bidang_penelitian)
          `)
          .eq('id', id)
          .single();
        
        if (error) {
          console.error("Error fetching jadwal sempro detail:", error);
          throw error;
        }
        
        if (!data) {
          throw new Error('Jadwal seminar proposal tidak ditemukan');
        }
        
        // Get mahasiswa data
        const { data: mahasiswaData, error: mahasiswaError } = await supabase
          .from('mahasiswas')
          .select('nama, nim, email, nomor_telepon')
          .eq('user_id', data.user_id)
          .single();
        
        // Get penguji1 data via profiles first, then dosens
        const { data: penguji1Profile, error: penguji1ProfileError } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', data.penguji_1)
          .single();
        
        // Get penguji2 data via profiles first, then dosens
        const { data: penguji2Profile, error: penguji2ProfileError } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', data.penguji_2)
          .single();
        
        // Get sempro data
        const { data: semproData, error: semproError } = await supabase
          .from('sempros')
          .select('*')
          .eq('pengajuan_ta_id', data.pengajuan_ta_id)
          .eq('user_id', data.user_id)
          .maybeSingle();
        
        // Get dosen data for penguji1
        const { data: penguji1Data, error: penguji1Error } = await supabase
          .from('dosens')
          .select('nama_dosen, nip, email')
          .eq('user_id', data.penguji_1)
          .maybeSingle();
        
        // Get dosen data for penguji2
        const { data: penguji2Data, error: penguji2Error } = await supabase
          .from('dosens')
          .select('nama_dosen, nip, email')
          .eq('user_id', data.penguji_2)
          .maybeSingle();
        
        // Combine all data
        const jadwalDetail = {
          ...data,
          mahasiswa: mahasiswaError ? null : mahasiswaData,
          penguji1: {
            nama_dosen: penguji1Data?.nama_dosen || penguji1Profile?.name || 'Dosen 1',
            nip: penguji1Data?.nip || '',
            email: penguji1Data?.email || ''
          },
          penguji2: {
            nama_dosen: penguji2Data?.nama_dosen || penguji2Profile?.name || 'Dosen 2',
            nip: penguji2Data?.nip || '',
            email: penguji2Data?.email || ''
          },
          sempro: semproError ? null : semproData
        };
        
        console.log("Full jadwal sempro detail:", jadwalDetail);
        return jadwalDetail as JadwalSempro;
      } catch (error) {
        console.error("Error in useJadwalSemproDetail:", error);
        throw error;
      }
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch all periods
 */
export function usePeriodeSempros() {
  return useQuery({
    queryKey: ['periode-sempros'],
    queryFn: async () => {
      try {
        // Use correct ordering column
        const { data, error } = await supabase
          .from('periodes')
          .select('*')
          .order('mulai_daftar', { ascending: false });
        
        if (error) {
          console.error("Error fetching periode sempros:", error);
          throw error;
        }
        
        // Correct mapping from database columns to application fields
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

/**
 * Hook to fetch all active periods
 */
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
        
        // Correct mapping from database columns to application fields
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

/**
 * Hook to fetch penilaian for a sempro
 */
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

/**
 * Hook to get riwayat for a sempro
 */
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

/**
 * Hook to get student's thesis proposals for sempro registration
 */
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

/**
 * Hook for fetching role-appropriate sempros based on user role
 */
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

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook to create a new sempro registration
 */
export function useCreateSempro() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  
  return useMutation({
    mutationFn: async (formValues: SemproFormValues) => {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      try {
        console.log("====== STARTING SEMPRO REGISTRATION PROCESS ======");
        console.log("User:", user.id);
        console.log("FormValues:", {
          pengajuan_ta_id: formValues.pengajuan_ta_id,
          hasTA012Metadata: !!formValues.dokumen_ta012_metadata,
          hasPlagiarismMetadata: !!formValues.dokumen_plagiarisme_metadata,
          hasDraftMetadata: !!formValues.dokumen_draft_metadata
        });
        
        // Verify required fields
        if (!formValues.pengajuan_ta_id) {
          throw new Error('Pengajuan TA harus dipilih');
        }
        
        // Check if metadata is provided
        if (!formValues.dokumen_ta012_metadata || 
            !formValues.dokumen_plagiarisme_metadata || 
            !formValues.dokumen_draft_metadata) {
          console.error("Incomplete metadata:", {
            ta012: !!formValues.dokumen_ta012_metadata,
            plagiarisme: !!formValues.dokumen_plagiarisme_metadata,
            draft: !!formValues.dokumen_draft_metadata
          });
          throw new Error('Metadata file tidak lengkap');
        }
        
        // Log file URLs for debugging
        console.log("File metadata URLs:"); 
        console.log("- TA012:", formValues.dokumen_ta012_metadata.fileUrl);
        console.log("- Plagiarisme:", formValues.dokumen_plagiarisme_metadata.fileUrl);
        console.log("- Draft:", formValues.dokumen_draft_metadata.fileUrl);
        
        // Find active period
        console.log("Finding active period...");
        const { data: periodeData, error: periodeError } = await supabase
          .from('periodes')
          .select('id, nama_periode')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (periodeError) {
          console.error("Error fetching active periode:", periodeError);
          throw new Error('Tidak ada periode pendaftaran sempro yang aktif saat ini');
        }
        
        if (!periodeData) {
          throw new Error('Tidak ada periode pendaftaran sempro yang aktif saat ini');
        }
        
        console.log("Active period found:", periodeData.id, periodeData.nama_periode);
        
        // Ensure file URLs exist
        const ta012Url = formValues.dokumen_ta012_metadata?.fileUrl || "";
        const plagiarismeUrl = formValues.dokumen_plagiarisme_metadata?.fileUrl || "";
        const draftUrl = formValues.dokumen_draft_metadata?.fileUrl || "";
        
        if (!ta012Url || !plagiarismeUrl || !draftUrl) {
          console.error("Incomplete file URLs:", {ta012Url, plagiarismeUrl, draftUrl});
          throw new Error('URL file tidak lengkap');
        }
        
        // Create the sempro record with file metadata
        const insertData = {
          user_id: user.id,
          pengajuan_ta_id: formValues.pengajuan_ta_id,
          periode_id: periodeData.id,
          tanggal: new Date().toISOString(),
          form_ta_012: ta012Url,         // Database column name
          bukti_plagiasi: plagiarismeUrl, // Database column name
          proposal_ta: draftUrl,          // Database column name
          status: 'registered'
        };
        
        console.log("== Data to insert into sempros table:", insertData);
        
        try {
          console.log("Inserting data into sempros table...");
          const { data, error } = await supabase
            .from('sempros')
            .insert([insertData])
            .select();
          
          console.log("Insert sempros result:", { data: data ? "Data available" : "No data", 
                                                error: error ? error : "No error" });
          
          if (error) {
            console.error('Error creating sempro record:', error);
            throw error;
          }
          
          if (!data || data.length === 0) {
            throw new Error('Failed to create sempro record: No data returned');
          }
          
          console.log("Sempro successfully created! ID:", data[0].id);
          
          // Create history record
          try {
            console.log("Creating registration history...");
            const riwayatData = {
              sempro_id: data[0].id,
              pengajuan_ta_id: formValues.pengajuan_ta_id,
              user_id: user.id,
              status: 'registered',
              keterangan: 'Pendaftaran seminar proposal'
            };
            
            console.log("History data:", riwayatData);
            
            const { data: riwayatResult, error: riwayatError } = await supabase
              .from('riwayat_pendaftaran_sempros')
              .insert([riwayatData])
              .select();
            
            if (riwayatError) {
              console.error("Error creating riwayat record:", riwayatError);
            } else {
              console.log("History record created successfully!");
            }
          } catch (riwayatError) {
            console.error("Error creating history record:", riwayatError);
            // Don't throw since history record isn't critical
          }
          
          console.log("====== SEMPRO REGISTRATION PROCESS COMPLETED ======");
          return data[0];
        } catch (insertError) {
          console.error("ERROR DURING SEMPROS INSERT:", insertError);
          throw insertError;
        }
      } catch (error) {
        console.error('Error in sempro creation process:', error);
        throw error instanceof Error ? error : new Error(String(error));
      }
    },
    onSuccess: (data) => {
      console.log("Mutation success! Data:", data);
      queryClient.invalidateQueries({ queryKey: ['sempros'] });
      
      toast({
        title: "Pendaftaran Berhasil",
        description: "Pendaftaran seminar proposal berhasil. Menunggu verifikasi admin.",
      });
      
      // Redirect to sempro list
      setTimeout(() => {
        router.push('/dashboard/sempro');
      }, 1500);
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      toast({
        variant: "destructive",
        title: "Gagal Mendaftar",
        description: error.message || "Terjadi kesalahan saat mendaftar seminar proposal.",
      });
    },
  });
}

/**
 * Hook to update sempro status (for admin)
 */
export function useUpdateSemproStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ id, status, catatan, mahasiswaId }: { 
      id: string; 
      status: StatusSempro; 
      catatan?: string; 
      mahasiswaId: string; 
    }) => {
      if (!user) throw new Error('User not authenticated');
      
      try {
        console.log(`======= SEMPRO STATUS UPDATE PROCESS =======`);
        console.log(`ID: ${id} | Status: ${status} | MahasiswaID: ${mahasiswaId}`);
        
        // 1. Get sempro data first to get pengajuan_ta_id
        const { data: semproData, error: semproError } = await supabase
          .from('sempros')
          .select('id, pengajuan_ta_id, status')
          .eq('id', id)
          .single();
        
        if (semproError) {
          console.error('Error getting sempro data:', semproError);
          throw new Error(`Failed to get sempro data: ${semproError.message}`);
        }
        
        if (!semproData) {
          throw new Error('Sempro data not found');
        }
        
        console.log('Sempro data to update:', semproData);
        
        // 2. Special handling for rejected status
        if (status === 'rejected') {
          catatan = `DITOLAK: ${catatan || 'Dokumen tidak memenuhi syarat'}`;
        }
        
        // 3. Update status in database
        const { data: updateData, error: updateError } = await supabase
          .from('sempros')
          .update({
            status: status,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select('id');
          
        if (updateError) {
          console.error('Error updating sempro status:', updateError);
          throw new Error(`Failed to change status: ${updateError.message}`);
        }
        
        console.log('Sempro status updated successfully');
        
        // 4. Create status description
        let keterangan = '';
        switch (status) {
          case 'verified':
            keterangan = catatan || 'Dokumen telah diverifikasi oleh admin';
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
        
        console.log("Adding history with description:", keterangan);
        
        // 5. Add registration history - ENSURE ALL FIELDS ARE FILLED
        const riwayatData = {
          sempro_id: id,
          pengajuan_ta_id: semproData.pengajuan_ta_id,
          user_id: user.id,
          keterangan: keterangan,
          status: status
        };
        
        console.log("History data to insert:", riwayatData);
        
        const { data: riwayatResult, error: riwayatError } = await supabase
          .from('riwayat_pendaftaran_sempros')
          .insert([riwayatData])
          .select();
          
        if (riwayatError) {
          console.error('ERROR DURING HISTORY INSERT:', riwayatError);
          // Don't throw error since status was already updated
          // But give warning message
          toast({
            variant: "destructive",
            title: "Status updated, but history failed to record",
            description: riwayatError.message,
          });
        } else {
          console.log('History added successfully:', riwayatResult);
        }
        
        // 6. Send notification
        try {
          const { error: notifError } = await supabase
            .from('notifikasis')
            .insert([{
              from_user: user.id,
              to_user: mahasiswaId,
              judul: `Status Sempro: ${status}`,
              pesan: keterangan,
              is_read: false
            }]);
            
          if (notifError) {
            console.error('Error sending notification:', notifError);
          } else {
            console.log('Notification sent successfully');
          }
        } catch (notifError) {
          console.error('Error during notification sending:', notifError);
          // Don't need to throw error here
        }
        
        console.log(`======= SEMPRO STATUS UPDATE PROCESS COMPLETED =======`);
        return { id, status, updated: true };
      } catch (error) {
        console.error('Error in sempro status update process:', error);
        throw error instanceof Error ? error : new Error(String(error));
      }
    },
    onSuccess: () => {
      // Invalidate all sempro-related queries to update UI
      queryClient.invalidateQueries({ queryKey: ['sempros'] });
      queryClient.invalidateQueries({ queryKey: ['sempro'] });
      queryClient.invalidateQueries({ queryKey: ['sempros', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['sempros', 'student'] });
      queryClient.invalidateQueries({ queryKey: ['riwayat-sempro'] });
      
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

/**
 * Consolidated hook for submitting revision
 */
export function useSubmitSemproRevision() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      catatan, 
      dokumen_ta012_metadata, 
      dokumen_plagiarisme_metadata, 
      dokumen_draft_metadata 
    }: { 
      id: string;
      catatan?: string;
      dokumen_ta012_metadata?: FileMetadata | null;
      dokumen_plagiarisme_metadata?: FileMetadata | null;
      dokumen_draft_metadata?: FileMetadata | null;
    }) => {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      try {
        console.log("====== STARTING SEMPRO REVISION SUBMISSION PROCESS ======");
        console.log("User:", user.id);
        console.log("Sempro ID:", id);
        
        // Get the sempro first to check ownership
        const { data: semproData, error: semproError } = await supabase
          .from('sempros')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();
        
        if (semproError) {
          console.error('Error fetching sempro data:', semproError);
          throw new Error('Sempro not found or you do not have access');
        }
        
        // Prepare update data
        const updateData: any = {
          status: 'registered', // Reset status to registered for admin review
          updated_at: new Date().toISOString()
        };
        
        // Add updated files
        if (dokumen_ta012_metadata) {
          updateData.form_ta_012 = dokumen_ta012_metadata.fileUrl;
        }
        
        if (dokumen_plagiarisme_metadata) {
          updateData.bukti_plagiasi = dokumen_plagiarisme_metadata.fileUrl;
        }
        
        if (dokumen_draft_metadata) {
          updateData.proposal_ta = dokumen_draft_metadata.fileUrl;
        }
        
        console.log("Update data:", updateData);
        
        // Update sempro record
        const { data, error } = await supabase
          .from('sempros')
          .update(updateData)
          .eq('id', id)
          .eq('user_id', user.id)
          .select();
          
        if (error) {
          console.error('Error updating sempro for revision:', error);
          throw error;
        }
        
        if (!data || data.length === 0) {
          throw new Error('Failed to update sempro data');
        }
        
        // Add to revision history
        const { error: historyError } = await supabase
          .from('riwayat_pendaftaran_sempros')
          .insert([{
            sempro_id: id,
            pengajuan_ta_id: data[0].pengajuan_ta_id,
            user_id: user.id,
            keterangan: catatan 
              ? `Revisi diupload: ${catatan}` 
              : 'Dokumen revisi telah diupload',
            status: 'registered'
          }]);
          
        if (historyError) {
          console.error('Error adding to revision history:', historyError);
          // Continue even if history fails
        }
        
        // Clear any previous revision notes - they've been addressed
        const clearRevisionData: any = {
          revisi_pembimbing_1: null,
          revisi_pembimbing_2: null,
          revisi_penguji_1: null,
          revisi_penguji_2: null
        };
        
        const { error: clearError } = await supabase
          .from('sempros')
          .update(clearRevisionData)
          .eq('id', id)
          .eq('user_id', user.id);
          
        if (clearError) {
          console.error('Error clearing revision notes:', clearError);
          // Continue even if clearing fails
        }
        
        console.log("====== SEMPRO REVISION SUBMISSION PROCESS COMPLETED ======");
        return data[0];
      } catch (error) {
        console.error('Error in submit sempro revision process:', error);
        throw error instanceof Error ? error : new Error(String(error));
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sempros'] });
      queryClient.invalidateQueries({ queryKey: ['sempro', data.id] });
      
      toast({
        title: "Revisi Berhasil",
        description: "Dokumen revisi berhasil diupload. Menunggu verifikasi admin.",
      });
      
      // Redirect to sempro list
      setTimeout(() => {
        try {
          router.push('/dashboard/sempro');
        } catch (e) {
          console.error('Error redirecting:', e);
          window.location.href = '/dashboard/sempro';
        }
      }, 1500);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Gagal Merevisi",
        description: error.message || "Terjadi kesalahan saat mengupload revisi.",
      });
    },
  });
}

/**
 * Hook for requesting revision (for teachers/examiners)
 */
export function useRequestSemproRevision() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      sempro_id, 
      revision_text, 
      is_major, 
      require_ta012_revision,
      require_plagiarism_revision,
      require_draft_revision,
      revision_type,
      mahasiswa_id
    }: { 
      sempro_id: string;
      revision_text: string;
      is_major: boolean;
      require_ta012_revision: boolean;
      require_plagiarism_revision: boolean;
      require_draft_revision: boolean;
      revision_type: 'pembimbing' | 'penguji';
      mahasiswa_id: string;
    }) => {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      try {
        console.log("Requesting revision for sempro:", sempro_id);
        
        // Get dosen's full name for the revision record
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();
        
        if (profileError) {
          console.error('Error fetching profile data:', profileError);
          throw new Error('Failed to fetch dosen data');
        }
        
        const dosenName = profileData?.name || 'Dosen';
        
        // First get the sempro detail to know which penguji/pembimbing number this is
        const { data: semproData, error: semproError } = await supabase
          .from('sempros')
          .select(`
            id, 
            pengajuan_ta_id, 
            pengajuan_ta:pengajuan_ta_id(pembimbing_1, pembimbing_2)
          `)
          .eq('id', sempro_id)
          .single();
        
        if (semproError) {
          console.error('Error fetching sempro data:', semproError);
          throw new Error('Failed to fetch sempro data');
        }
        
        // Next, get the jadwal to check penguji
        const { data: jadwalData, error: jadwalError } = await supabase
          .from('jadwal_sempros')
          .select('penguji_1, penguji_2')
          .eq('pengajuan_ta_id', semproData.pengajuan_ta_id)
          .single();
        
        if (jadwalError && jadwalError.code !== 'PGRST116') {
          console.error('Error fetching jadwal data:', jadwalError);
          throw new Error('Failed to fetch jadwal data');
        }
        
        // Determine which specific revisi field to update
        let revisionField = '';

        if (revision_type === 'pembimbing') {
          // Check if user is pembimbing 1 or 2
          const pembimbing1 = getPengajuanTaValue(semproData.pengajuan_ta, 'pembimbing_1');
          const pembimbing2 = getPengajuanTaValue(semproData.pengajuan_ta, 'pembimbing_2');
          
          if (pembimbing1 === user.id) {
            revisionField = 'revisi_pembimbing_1';
          } else if (pembimbing2 === user.id) {
            revisionField = 'revisi_pembimbing_2';
          } else {
            throw new Error('You are not a pembimbing for this sempro');
          }
        } else { // penguji
          if (jadwalData) {
            if (jadwalData.penguji_1 === user.id) {
              revisionField = 'revisi_penguji_1';
            } else if (jadwalData.penguji_2 === user.id) {
              revisionField = 'revisi_penguji_2';
            } else {
              throw new Error('You are not a penguji for this sempro');
            }
          } else {
            throw new Error('Jadwal not found for this sempro');
          }
        }
        
        // Prepare the revision text
        let fullRevisionText = `${revision_text}\n\n`;
        
        // Add document revision requirements
        const docRevisions = [];
        if (require_ta012_revision) docRevisions.push('Form TA-012');
        if (require_plagiarism_revision) docRevisions.push('Bukti Plagiasi');
        if (require_draft_revision) docRevisions.push('Draft Proposal');
        
        if (docRevisions.length > 0) {
          fullRevisionText += `\nDokumen yang perlu direvisi:\n- ${docRevisions.join('\n- ')}`;
        }
        
        // Prepare update data
        const updateData: any = {
          [revisionField]: fullRevisionText
        };
        
        // Update status to revision_required if this is a major revision
        if (is_major) {
          updateData.status = 'revision_required';
        }
        
        // Update the sempro record
        const { data, error } = await supabase
          .from('sempros')
          .update(updateData)
          .eq('id', sempro_id)
          .select();
        
        if (error) {
          console.error('Error updating sempro with revision:', error);
          throw error;
        }
        
        // Add to revision history
        await supabase
          .from('riwayat_pendaftaran_sempros')
          .insert([{
            sempro_id: sempro_id,
            pengajuan_ta_id: semproData.pengajuan_ta_id,
            user_id: user.id,
            status: is_major ? 'revision_required' : 'completed',
            keterangan: `Revisi diminta oleh ${dosenName}${is_major ? ' (Revisi Mayor)' : ' (Revisi Minor)'}`
          }]);
        
        // Send notification to student
        await supabase
          .from('notifikasis')
          .insert([{
            from_user: user.id,
            to_user: mahasiswa_id,
            judul: `Revisi ${is_major ? 'Mayor' : 'Minor'} Sempro`,
            pesan: `${dosenName} meminta revisi ${is_major ? 'mayor' : 'minor'} untuk seminar proposal Anda`,
            is_read: false
          }]);
        
        return data?.[0];
      } catch (error) {
        console.error('Error in request sempro revision process:', error);
        throw error instanceof Error ? error : new Error(String(error));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sempro'] });
      queryClient.invalidateQueries({ queryKey: ['sempros'] });
      
      toast({
        title: "Revisi Diminta",
        description: "Permintaan revisi berhasil dikirim ke mahasiswa",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Gagal Meminta Revisi",
        description: error.message || "Terjadi kesalahan saat meminta revisi",
      });
    },
  });
}

/**
 * Hook to approve sempro (for pembimbing)
 */
export function useApproveSempro() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      sempro_id, 
      pembimbing_type, 
      approval, 
      comment 
    }: { 
      sempro_id: string;
      pembimbing_type: 1 | 2; // 1 = pembimbing_1, 2 = pembimbing_2
      approval: boolean;
      comment?: string;
    }) => {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      try {
        console.log(`${approval ? 'Approving' : 'Disapproving'} sempro as pembimbing ${pembimbing_type}:`, sempro_id);
        
        // Get sempro data first to validate the action
        const { data: semproData, error: semproError } = await supabase
          .from('sempros')
          .select(`
            id, 
            user_id,
            pengajuan_ta_id, 
            status,
            approve_pembimbing_1,
            approve_pembimbing_2,
            pengajuan_ta:pengajuan_ta_id(pembimbing_1, pembimbing_2)
          `)
          .eq('id', sempro_id)
          .single();
        
        if (semproError) {
          console.error('Error fetching sempro data:', semproError);
          throw new Error('Failed to fetch sempro data');
        }
        
        // Verify that user is the correct pembimbing
        const pembimbing1 = getPengajuanTaValue(semproData.pengajuan_ta, 'pembimbing_1');
        const pembimbing2 = getPengajuanTaValue(semproData.pengajuan_ta, 'pembimbing_2');

        if (
          (pembimbing_type === 1 && pembimbing1 !== user.id) ||
          (pembimbing_type === 2 && pembimbing2 !== user.id)
        ) {
          throw new Error(`You are not pembimbing ${pembimbing_type} for this sempro`);
        }
        
        // Verify that sempro is in completed status
        if (semproData.status !== 'completed') {
          throw new Error('Sempro must be in completed status before approval');
        }
        
        // Prepare update data
        const updateData: any = {
          [`approve_pembimbing_${pembimbing_type}`]: approval
        };
        
        // Update the sempro record
        const { data, error } = await supabase
          .from('sempros')
          .update(updateData)
          .eq('id', sempro_id)
          .select();
        
        if (error) {
          console.error('Error updating sempro with approval:', error);
          throw error;
        }
        
        // Check if both pembimbings have approved - if yes, update status to 'approved'
        const bothApproved = (
          (pembimbing_type === 1 ? approval : semproData.approve_pembimbing_1) &&
          (pembimbing_type === 2 ? approval : semproData.approve_pembimbing_2)
        );
        
        if (bothApproved) {
          // Update to approved status
          const { error: approveError } = await supabase
            .from('sempros')
            .update({ status: 'approved' })
            .eq('id', sempro_id);
          
          if (approveError) {
            console.error('Error updating sempro to approved status:', approveError);
          } else {
            // Add to revision history
            await supabase
              .from('riwayat_pendaftaran_sempros')
              .insert([{
                sempro_id: sempro_id,
                pengajuan_ta_id: semproData.pengajuan_ta_id,
                user_id: user.id,
                status: 'approved',
                keterangan: 'Seminar proposal telah disetujui oleh kedua pembimbing'
              }]);
            
            // Send notification to student
            await supabase
              .from('notifikasis')
              .insert([{
                from_user: user.id,
                to_user: semproData.user_id,
                judul: 'Seminar Proposal Disetujui',
                pesan: 'Seminar proposal Anda telah disetujui oleh kedua pembimbing',
                is_read: false
              }]);
          }
        } else {
          // Add to revision history for this pembimbing's approval
          await supabase
            .from('riwayat_pendaftaran_sempros')
            .insert([{
              sempro_id: sempro_id,
              pengajuan_ta_id: semproData.pengajuan_ta_id,
              user_id: user.id,
              status: 'completed',
              keterangan: `Disetujui oleh Pembimbing ${pembimbing_type}${comment ? ': ' + comment : ''}`
            }]);
          
          // Send notification to student
          await supabase
            .from('notifikasis')
            .insert([{
              from_user: user.id,
              to_user: semproData.user_id,
              judul: `Persetujuan Pembimbing ${pembimbing_type}`,
              pesan: `Seminar proposal Anda telah disetujui oleh Pembimbing ${pembimbing_type}`,
              is_read: false
            }]);
        }
        
        return data?.[0];
      } catch (error) {
        console.error('Error in approve sempro process:', error);
        throw error instanceof Error ? error : new Error(String(error));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sempro'] });
      queryClient.invalidateQueries({ queryKey: ['sempros'] });
      
      toast({
        title: "Persetujuan Berhasil",
        description: "Persetujuan sempro berhasil disimpan",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Gagal Menyetujui",
        description: error.message || "Terjadi kesalahan saat menyetujui sempro",
      });
    },
  });
}

/**
 * Hook to create jadwal sempro
 */
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
              console.error("Missing required fields:", formValues);
              throw new Error('Semua field jadwal harus diisi');
        }

        // Ensure penguji assignments don't conflict
        if (formValues.penguji_1 === formValues.penguji_2) {
          console.error("Penguji 1 and Penguji 2 cannot be the same");
          throw new Error('Penguji 1 dan Penguji 2 tidak boleh sama');
        }
        
        // Check for schedule conflicts
        const { data: existingJadwal, error: jadwalCheckError } = await supabase
        .from('jadwal_sempros')
        .select('*')
        .eq('tanggal_sempro', formValues.tanggal_sempro)
        .or(`penguji_1.eq.${formValues.penguji_1},penguji_1.eq.${formValues.penguji_2},penguji_2.eq.${formValues.penguji_1},penguji_2.eq.${formValues.penguji_2}`)
        .or(`waktu_mulai.lt.${formValues.waktu_selesai},waktu_selesai.gt.${formValues.waktu_mulai}`);

        if (!jadwalCheckError && existingJadwal && existingJadwal.length > 0) {
          console.error("Schedule conflict detected:", existingJadwal);
          throw new Error('Penguji sudah memiliki jadwal di waktu yang sama');
        }

        // Create jadwal sempro record
        const { data, error } = await supabase
          .from('jadwal_sempros')
          .insert([{
            ...formValues,
            is_published: formValues.is_published || false
          }])
          .select();

        // Log result
        console.log("Insert jadwal result:", { data, error });
          
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
              
            // Add history record
            await supabase
              .from('riwayat_pendaftaran_sempros')
              .insert([{
                sempro_id: semproData.id,
                pengajuan_ta_id: formValues.pengajuan_ta_id,
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

/**
 * Hook to update jadwal sempro
 */
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
      queryClient.invalidateQueries({ queryKey: ['jadwal-sempros'] });
      queryClient.invalidateQueries({ queryKey: ['jadwal-sempro-detail'] });
      
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

/**
 * Hook to create periode
 */
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
          .from('periodes')
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

/**
 * Hook to submit penilaian sempro
 */
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
        const { data: semproData } = await supabase
          .from('sempros')
          .select('id, user_id, pengajuan_ta_id')
          .eq('id', formValues.sempro_id)
          .single();

        if (semproData) {
          // Get pengajuan_ta to get pembimbing
          const { data: pengajuanData } = await supabase
            .from('pengajuan_tas')
            .select('pembimbing_1, pembimbing_2')
            .eq('id', semproData.pengajuan_ta_id)
            .single();

          // Get jadwal to get penguji
          const { data: jadwalData } = await supabase
            .from('jadwal_sempros')
            .select('penguji_1, penguji_2')
            .eq('pengajuan_ta_id', semproData.pengajuan_ta_id)
            .eq('user_id', semproData.user_id)
            .single();

          if (pengajuanData && jadwalData) {
            // List all involved dosen
            const allDosens = [
              pengajuanData.pembimbing_1,
              pengajuanData.pembimbing_2,
              jadwalData.penguji_1,
              jadwalData.penguji_2
            ];
            
            // Check if all dosen have submitted penilaian
            const { data: penilaianData } = await supabase
              .from('penilaian_sempros')
              .select('user_id')
              .eq('sempro_id', formValues.sempro_id);
            
            const penilaiIds = penilaianData ? penilaianData.map(p => p.user_id) : [];
            const allDosensHaveSubmitted = allDosens.every(dosenId => 
              penilaiIds.includes(dosenId)
            );
            
            if (allDosensHaveSubmitted) {
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
                  pengajuan_ta_id: semproData.pengajuan_ta_id,
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
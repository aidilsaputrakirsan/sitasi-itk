// app/dashboard/profile/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Helper function for safe error messages
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null && 'message' in error) 
    return (error as {message: string}).message;
  return 'Unknown error';
};

// Define form schemas
const studentProfileSchema = z.object({
  nama: z.string().min(3, 'Nama lengkap minimal 3 karakter'),
  nim: z.string().min(5, 'NIM minimal 5 karakter'),
  email: z.string().email('Email tidak valid'),
  nomor_telepon: z.string().optional(),
});

const dosenProfileSchema = z.object({
  nama_dosen: z.string().min(3, 'Nama lengkap minimal 3 karakter'),
  nip: z.string().min(5, 'NIP minimal 5 karakter'),
  email: z.string().email('Email tidak valid'),
});

const tendikProfileSchema = z.object({
  nama_tendik: z.string().min(3, 'Nama lengkap minimal 3 karakter'),
  nip: z.string().min(5, 'NIP minimal 5 karakter'),
  email: z.string().email('Email tidak valid'),
  jabatan: z.string().optional(),
});

type StudentProfileFormValues = z.infer<typeof studentProfileSchema>;
type DosenProfileFormValues = z.infer<typeof dosenProfileSchema>;
type TendikProfileFormValues = z.infer<typeof tendikProfileSchema>;

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileExists, setProfileExists] = useState(false);
  const [profileRole, setProfileRole] = useState<'mahasiswa' | 'dosen' | 'tendik' | 'koorpro'>('mahasiswa');
  
  // Form setup
  const {
    register: registerStudent,
    handleSubmit: handleSubmitStudent,
    formState: { errors: studentErrors },
    setValue: setStudentValue,
    reset: resetStudentForm,
  } = useForm<StudentProfileFormValues>({
    resolver: zodResolver(studentProfileSchema),
    defaultValues: {
      nama: '',
      nim: '',
      email: '',
      nomor_telepon: ''
    }
  });
  
  const {
    register: registerDosen,
    handleSubmit: handleSubmitDosen,
    formState: { errors: dosenErrors },
    setValue: setDosenValue,
    reset: resetDosenForm,
  } = useForm<DosenProfileFormValues>({
    resolver: zodResolver(dosenProfileSchema),
    defaultValues: {
      nama_dosen: '',
      nip: '',
      email: ''
    }
  });
  
  const {
    register: registerTendik,
    handleSubmit: handleSubmitTendik,
    formState: { errors: tendikErrors },
    setValue: setTendikValue,
    reset: resetTendikForm,
  } = useForm<TendikProfileFormValues>({
    resolver: zodResolver(tendikProfileSchema),
    defaultValues: {
      nama_tendik: '',
      nip: '',
      email: '',
      jabatan: ''
    }
  });
  
  // Check profile on load
  useEffect(() => {
    const checkProfile = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        
        console.log('Checking profile for user:', user);
        
        if (!user.roles || user.roles.length === 0) {
          console.error('User roles not found', user);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Data pengguna tidak lengkap. Silakan logout dan login kembali.",
          });
          setIsLoading(false);
          return;
        }
        
        // Get the user's primary role
        const userRole = user.roles[0] as 'mahasiswa' | 'dosen' | 'tendik' | 'koorpro';
        setProfileRole(userRole);
        console.log(`User role: ${userRole}`);
        
        // === BAGIAN MAHASISWA ===
        if (userRole === 'mahasiswa') {
          try {
            console.log('Checking student profile for user:', user.id);
            const { data: mahasiswaData, error: mahasiswaError } = await supabase
              .from('mahasiswas')
              .select('id, nama, nim, email, nomor_telepon')
              .eq('user_id', user.id)
              .single(); // Gunakan single() alih-alih limit(1) untuk mendapatkan objek langsung
            
            if (mahasiswaError) {
              // Jika error bukan karena "tidak ada data", maka tampilkan error
              if (mahasiswaError.code !== 'PGRST116') {
                console.error('Error fetching student profile:', mahasiswaError);
                toast({
                  variant: "destructive",
                  title: "Error",
                  description: "Terjadi kesalahan saat memuat profil mahasiswa: " + getErrorMessage(mahasiswaError),
                });
              } else {
                console.log('No student profile found for user');
                setProfileExists(false);
                
                // Pre-fill form with auth user data
                if (user.name) setStudentValue('nama', user.name);
                if (user.email) setStudentValue('email', user.email);
                if (user.username) setStudentValue('nim', user.username);
              }
            } else if (mahasiswaData) {
              // Data mahasiswa ditemukan, isi form dengan data tersebut
              console.log('Found student profile:', mahasiswaData);
              setProfileExists(true);
              
              // Perbarui semua nilai form
              setStudentValue('nama', mahasiswaData.nama || '');
              setStudentValue('nim', mahasiswaData.nim || '');
              setStudentValue('email', mahasiswaData.email || '');
              setStudentValue('nomor_telepon', mahasiswaData.nomor_telepon || '');
              
              // Tampilkan toast sukses jika baru saja menyimpan
              const justSaved = sessionStorage.getItem('profile_just_saved');
              if (justSaved) {
                sessionStorage.removeItem('profile_just_saved');
                toast({
                  title: "Profil Berhasil Disimpan",
                  description: "Data profil mahasiswa berhasil disimpan.",
                });
              }
            } else {
              console.log('No student profile found for user');
              setProfileExists(false);
              
              // Pre-fill form with auth user data
              if (user.name) setStudentValue('nama', user.name);
              if (user.email) setStudentValue('email', user.email);
              if (user.username) setStudentValue('nim', user.username);
            }
          } catch (error) {
            console.error('Error in mahasiswa profile check:', error);
            toast({
              variant: "destructive",
              title: "Error",
              description: "Terjadi kesalahan saat memuat profil mahasiswa: " + getErrorMessage(error),
            });
            setProfileExists(false);
          }
        }
        
        // === BAGIAN DOSEN ===
        else if (userRole === 'dosen') {
          try {
            console.log('Checking lecturer profile for user:', user.id);
            const { data: dosenData, error: dosenError } = await supabase
              .from('dosens')
              .select('id, nama_dosen, nip, email')
              .eq('user_id', user.id)
              .single(); // Gunakan single() untuk mendapatkan objek langsung
            
            if (dosenError) {
              // Jika error bukan karena "tidak ada data", maka tampilkan error
              if (dosenError.code !== 'PGRST116') {
                console.error('Error fetching lecturer profile:', dosenError);
                toast({
                  variant: "destructive",
                  title: "Error",
                  description: "Terjadi kesalahan saat memuat profil dosen: " + getErrorMessage(dosenError),
                });
              } else {
                console.log('No lecturer profile found for user');
                setProfileExists(false);
                
                // Pre-fill form with auth user data
                if (user.name) setDosenValue('nama_dosen', user.name);
                if (user.email) setDosenValue('email', user.email);
                if (user.username) setDosenValue('nip', user.username);
              }
            } else if (dosenData) {
              // Data dosen ditemukan, isi form dengan data tersebut
              console.log('Found lecturer profile:', dosenData);
              setProfileExists(true);
              
              // Perbarui semua nilai form
              setDosenValue('nama_dosen', dosenData.nama_dosen || '');
              setDosenValue('nip', dosenData.nip || '');
              setDosenValue('email', dosenData.email || '');
              
              // Tampilkan toast sukses jika baru saja menyimpan
              const justSaved = sessionStorage.getItem('profile_just_saved');
              if (justSaved) {
                sessionStorage.removeItem('profile_just_saved');
                toast({
                  title: "Profil Berhasil Disimpan",
                  description: "Data profil dosen berhasil disimpan.",
                });
              }
            } else {
              console.log('No lecturer profile found for user');
              setProfileExists(false);
              
              // Pre-fill form with auth user data
              if (user.name) setDosenValue('nama_dosen', user.name);
              if (user.email) setDosenValue('email', user.email);
              if (user.username) setDosenValue('nip', user.username);
            }
          } catch (error) {
            console.error('Error in dosen profile check:', error);
            toast({
              variant: "destructive",
              title: "Error",
              description: "Terjadi kesalahan saat memuat profil dosen: " + getErrorMessage(error),
            });
            setProfileExists(false);
          }
        }
        
        // === BAGIAN TENDIK & KOORPRO ===
        else if (userRole === 'tendik' || userRole === 'koorpro') {
          try {
            console.log('Checking staff profile for user:', user.id);
            const { data: tendikData, error: tendikError } = await supabase
              .from('tendiks')
              .select('id, nama_tendik, nip, email, jabatan')
              .eq('user_id', user.id)
              .single(); // Gunakan single() untuk mendapatkan objek langsung
            
            if (tendikError) {
              // Jika error bukan karena "tidak ada data", maka tampilkan error
              if (tendikError.code !== 'PGRST116') {
                console.error('Error fetching staff profile:', tendikError);
                toast({
                  variant: "destructive",
                  title: "Error",
                  description: "Terjadi kesalahan saat memuat profil: " + getErrorMessage(tendikError),
                });
              } else {
                console.log('No staff profile found for user');
                setProfileExists(false);
                
                // Pre-fill form with auth user data
                if (user.name) setTendikValue('nama_tendik', user.name);
                if (user.email) setTendikValue('email', user.email);
                if (user.username) setTendikValue('nip', user.username);
                if (userRole === 'koorpro') setTendikValue('jabatan', 'Koordinator Program');
              }
            } else if (tendikData) {
              // Data tendik ditemukan, isi form dengan data tersebut
              console.log('Found staff profile:', tendikData);
              setProfileExists(true);
              
              // Perbarui semua nilai form
              setTendikValue('nama_tendik', tendikData.nama_tendik || '');
              setTendikValue('nip', tendikData.nip || '');
              setTendikValue('email', tendikData.email || '');
              setTendikValue('jabatan', tendikData.jabatan || (userRole === 'koorpro' ? 'Koordinator Program' : ''));
              
              // Tampilkan toast sukses jika baru saja menyimpan
              const justSaved = sessionStorage.getItem('profile_just_saved');
              if (justSaved) {
                sessionStorage.removeItem('profile_just_saved');
                toast({
                  title: "Profil Berhasil Disimpan",
                  description: "Data profil staf berhasil disimpan.",
                });
              }
            } else {
              console.log('No staff profile found for user');
              setProfileExists(false);
              
              // Pre-fill form with auth user data
              if (user.name) setTendikValue('nama_tendik', user.name);
              if (user.email) setTendikValue('email', user.email);
              if (user.username) setTendikValue('nip', user.username);
              if (userRole === 'koorpro') setTendikValue('jabatan', 'Koordinator Program');
            }
          } catch (error) {
            console.error('Error in staff profile check:', error);
            toast({
              variant: "destructive",
              title: "Error",
              description: "Terjadi kesalahan saat memuat profil: " + getErrorMessage(error),
            });
            setProfileExists(false);
          }
        }
        
      } catch (error) {
        console.error('Error checking profile:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Terjadi kesalahan saat memuat profil: " + getErrorMessage(error),
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user) {
      checkProfile();
    } else {
      setIsLoading(false);
    }
  }, [user, toast, setStudentValue, setDosenValue, setTendikValue]);
  
  // Submit handlers
  // Perbaikan untuk fungsi onSubmitStudent
  const onSubmitStudent = async (data: StudentProfileFormValues) => {
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      console.log('Submitting student profile for user:', user.id);
      
      // Check if user already has a mahasiswa profile
      const { data: existingData, error: checkError } = await supabase
        .from('mahasiswas')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (checkError) {
        throw new Error(getErrorMessage(checkError));
      }

      console.log('Existing student profile data:', existingData);
      
      let result;
      if (existingData && existingData.length > 0) {
        // Update existing profile
        console.log('Updating existing student profile with ID:', existingData[0].id);
        result = await supabase
          .from('mahasiswas')
          .update({
            nama: data.nama,
            nim: data.nim,
            email: data.email,
            nomor_telepon: data.nomor_telepon || null,
          })
          .eq('id', existingData[0].id);
      } else {
        // Insert new profile
        console.log('Creating new student profile');
        result = await supabase
          .from('mahasiswas')
          .insert([
            {
              user_id: user.id,
              nama: data.nama,
              nim: data.nim,
              email: data.email,
              nomor_telepon: data.nomor_telepon || null,
            }
          ]);
      }

      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      
      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: data.nama,
          username: data.nim,
        })
        .eq('id', user.id);
        
      if (profileError) {
        console.error('Error updating profiles table:', profileError);
      }
      
      // Set a flag to show success message after page reloads
      sessionStorage.setItem('profile_just_saved', 'true');
      
      setProfileExists(true);
      
      toast({
        title: "Profil Berhasil Disimpan",
        description: "Data profil mahasiswa berhasil disimpan.",
      });
      
      // Refresh halaman dengan timeout untuk memberikan waktu toast notification ditampilkan
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error saving student profile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Terjadi kesalahan saat menyimpan profil mahasiswa: " + getErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Fungsi onSubmitDosen yang telah diperbaiki
  // Perbaikan: Fungsi onSubmitDosen dengan tanpa memanggil checkProfile secara langsung
  const onSubmitDosen = async (data: DosenProfileFormValues) => {
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      console.log('Submitting lecturer profile for user:', user.id);
      
      // Check if user already has a dosen profile
      const { data: existingData, error: checkError } = await supabase
        .from('dosens')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (checkError) {
        throw new Error(getErrorMessage(checkError));
      }

      console.log('Existing lecturer profile data:', existingData);
      
      let result;
      if (existingData && existingData.length > 0) {
        // Update existing profile
        console.log('Updating existing lecturer profile with ID:', existingData[0].id);
        result = await supabase
          .from('dosens')
          .update({
            nama_dosen: data.nama_dosen,
            nip: data.nip,
            email: data.email,
          })
          .eq('id', existingData[0].id);
      } else {
        // Insert new profile
        console.log('Creating new lecturer profile');
        result = await supabase
          .from('dosens')
          .insert([
            {
              user_id: user.id,
              nama_dosen: data.nama_dosen,
              nip: data.nip,
              email: data.email,
            }
          ]);
      }

      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      
      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: data.nama_dosen,
          username: data.nip,
        })
        .eq('id', user.id);
        
      if (profileError) {
        console.error('Error updating profiles table:', profileError);
      }
      
      // Set a flag to show success message after page reloads
      sessionStorage.setItem('profile_just_saved', 'true');
      
      setProfileExists(true);
      
      toast({
        title: "Profil Berhasil Disimpan",
        description: "Data profil dosen berhasil disimpan.",
      });
      
      // PERBAIKAN: Daripada memanggil checkProfile(), refresh halaman dengan timeout
      // untuk memberikan waktu toast notification ditampilkan
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error saving lecturer profile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Terjadi kesalahan saat menyimpan profil dosen: " + getErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
 // Fungsi onSubmitTendik yang telah diperbaiki
  const onSubmitTendik = async (data: TendikProfileFormValues) => {
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      console.log('Submitting staff profile for user:', user.id);
      
      // Check if user already has a tendik profile
      const { data: existingData, error: checkError } = await supabase
        .from('tendiks')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (checkError) {
        throw new Error(getErrorMessage(checkError));
      }

      console.log('Existing staff profile data:', existingData);
      
      let result;
      if (existingData && existingData.length > 0) {
        // Update existing profile
        console.log('Updating existing staff profile with ID:', existingData[0].id);
        result = await supabase
          .from('tendiks')
          .update({
            nama_tendik: data.nama_tendik,
            nip: data.nip,
            email: data.email,
            jabatan: data.jabatan,
          })
          .eq('id', existingData[0].id);
      } else {
        // Insert new profile
        console.log('Creating new staff profile');
        result = await supabase
          .from('tendiks')
          .insert([
            {
              user_id: user.id,
              nama_tendik: data.nama_tendik,
              nip: data.nip,
              email: data.email,
              jabatan: data.jabatan,
            }
          ]);
      }

      if (result.error) {
        throw new Error(getErrorMessage(result.error));
      }
      
      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: data.nama_tendik,
          username: data.nip,
        })
        .eq('id', user.id);
        
      if (profileError) {
        console.error('Error updating profiles table:', profileError);
      }
      
      // Set a flag to show success message after page reloads
      sessionStorage.setItem('profile_just_saved', 'true');
      
      setProfileExists(true);
      
      toast({
        title: "Profil Berhasil Disimpan",
        description: "Data profil staf berhasil disimpan.",
      });
      
      // PERBAIKAN: Daripada memanggil checkProfile(), refresh halaman dengan timeout
      // untuk memberikan waktu toast notification ditampilkan
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error saving staff profile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Terjadi kesalahan saat menyimpan profil staf: " + getErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[500px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Profil Pengguna</h1>
        <p className="mt-1 text-sm text-gray-500">
          {profileExists 
            ? 'Kelola informasi profil Anda' 
            : 'Lengkapi informasi profil Anda untuk mengakses fitur-fitur SITASI-ITK'}
        </p>
      </div>
      
      {profileRole === 'mahasiswa' && (
        <Card>
          <CardHeader>
            <CardTitle>Profil Mahasiswa</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmitStudent(onSubmitStudent)}>
            <CardContent className="space-y-4">
              {!profileExists && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        Silakan lengkapi profil Anda terlebih dahulu untuk mengakses fitur pengajuan tugas akhir.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="nama">Nama Lengkap</Label>
                <Input 
                  id="nama" 
                  placeholder="Masukkan nama lengkap" 
                  {...registerStudent('nama')} 
                />
                {studentErrors.nama && (
                  <p className="text-red-500 text-xs mt-1">{studentErrors.nama.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nim">NIM</Label>
                <Input 
                  id="nim" 
                  placeholder="Masukkan NIM" 
                  {...registerStudent('nim')} 
                />
                {studentErrors.nim && (
                  <p className="text-red-500 text-xs mt-1">{studentErrors.nim.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="Masukkan email" 
                  {...registerStudent('email')} 
                />
                {studentErrors.email && (
                  <p className="text-red-500 text-xs mt-1">{studentErrors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nomor_telepon">Nomor Telepon (opsional)</Label>
                <Input 
                  id="nomor_telepon" 
                  placeholder="Masukkan nomor telepon" 
                  {...registerStudent('nomor_telepon')} 
                />
                {studentErrors.nomor_telepon && (
                  <p className="text-red-500 text-xs mt-1">{studentErrors.nomor_telepon.message}</p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Menyimpan...' : 'Simpan Profil'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
      
      {profileRole === 'dosen' && (
        <Card>
          <CardHeader>
            <CardTitle>Profil Dosen</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmitDosen(onSubmitDosen)}>
            <CardContent className="space-y-4">
              {!profileExists && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        Silakan lengkapi profil Anda terlebih dahulu untuk mengakses fitur bimbingan.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="nama_dosen">Nama Lengkap</Label>
                <Input 
                  id="nama_dosen" 
                  placeholder="Masukkan nama lengkap" 
                  {...registerDosen('nama_dosen')} 
                />
                {dosenErrors.nama_dosen && (
                  <p className="text-red-500 text-xs mt-1">{dosenErrors.nama_dosen.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nip">NIP</Label>
                <Input 
                  id="nip" 
                  placeholder="Masukkan NIP" 
                  {...registerDosen('nip')} 
                />
                {dosenErrors.nip && (
                  <p className="text-red-500 text-xs mt-1">{dosenErrors.nip.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="Masukkan email" 
                  {...registerDosen('email')} 
                />
                {dosenErrors.email && (
                  <p className="text-red-500 text-xs mt-1">{dosenErrors.email.message}</p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Menyimpan...' : 'Simpan Profil'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
      
      {profileRole === 'tendik' && (
        <Card>
          <CardHeader>
            <CardTitle>Profil Staf</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmitTendik(onSubmitTendik)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nama_tendik">Nama Lengkap</Label>
                <Input 
                  id="nama_tendik" 
                  placeholder="Masukkan nama lengkap" 
                  {...registerTendik('nama_tendik')} 
                />
                {tendikErrors.nama_tendik && (
                  <p className="text-red-500 text-xs mt-1">{tendikErrors.nama_tendik.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nip">NIP</Label>
                <Input 
                  id="nip" 
                  placeholder="Masukkan NIP" 
                  {...registerTendik('nip')} 
                />
                {tendikErrors.nip && (
                  <p className="text-red-500 text-xs mt-1">{tendikErrors.nip.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="Masukkan email" 
                  {...registerTendik('email')} 
                />
                {tendikErrors.email && (
                  <p className="text-red-500 text-xs mt-1">{tendikErrors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="jabatan">Jabatan (opsional)</Label>
                <Input 
                  id="jabatan" 
                  placeholder="Masukkan jabatan" 
                  {...registerTendik('jabatan')} 
                />
                {tendikErrors.jabatan && (
                  <p className="text-red-500 text-xs mt-1">{tendikErrors.jabatan.message}</p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Menyimpan...' : 'Simpan Profil'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
      
      {profileRole === 'koorpro' && (
      <Card>
        <CardHeader>
          <CardTitle>Profil Koordinator Program</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmitTendik(onSubmitTendik)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nama_tendik">Nama Lengkap</Label>
              <Input 
                id="nama_tendik" 
                placeholder="Masukkan nama lengkap" 
                {...registerTendik('nama_tendik')} 
              />
              {tendikErrors.nama_tendik && (
                <p className="text-red-500 text-xs mt-1">{tendikErrors.nama_tendik.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="nip">NIP</Label>
              <Input 
                id="nip" 
                placeholder="Masukkan NIP" 
                {...registerTendik('nip')} 
              />
              {tendikErrors.nip && (
                <p className="text-red-500 text-xs mt-1">{tendikErrors.nip.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="Masukkan email" 
                {...registerTendik('email')} 
              />
              {tendikErrors.email && (
                <p className="text-red-500 text-xs mt-1">{tendikErrors.email.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="jabatan">Jabatan</Label>
              <Input 
                id="jabatan" 
                placeholder="Koordinator Program" 
                {...registerTendik('jabatan')} 
              />
              {tendikErrors.jabatan && (
                <p className="text-red-500 text-xs mt-1">{tendikErrors.jabatan.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan Profil'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    )}
    </div>
  );
}
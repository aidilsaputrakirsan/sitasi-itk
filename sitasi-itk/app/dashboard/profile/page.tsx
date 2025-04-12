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

// Define the form schema with Zod depending on user role
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

type StudentProfileFormValues = z.infer<typeof studentProfileSchema>;
type DosenProfileFormValues = z.infer<typeof dosenProfileSchema>;

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileExists, setProfileExists] = useState(false);
  const [profileRole, setProfileRole] = useState<'mahasiswa' | 'dosen' | 'tendik' | 'koorpro'>('mahasiswa');
  
  // Set up the form for student profile
  const {
    register: registerStudent,
    handleSubmit: handleSubmitStudent,
    formState: { errors: studentErrors },
    setValue: setStudentValue,
  } = useForm<StudentProfileFormValues>({
    resolver: zodResolver(studentProfileSchema),
    defaultValues: {
      nama: '',
      nim: '',
      email: '',
      nomor_telepon: ''
    }
  });
  
  // Set up the form for lecturer profile
  const {
    register: registerDosen,
    handleSubmit: handleSubmitDosen,
    formState: { errors: dosenErrors },
    setValue: setDosenValue,
  } = useForm<DosenProfileFormValues>({
    resolver: zodResolver(dosenProfileSchema),
    defaultValues: {
      nama_dosen: '',
      nip: '',
      email: ''
    }
  });
  
  // Determine user role and check if profile already exists
  useEffect(() => {
    const checkProfile = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Determine the user role - make sure user.roles exists
        if (!user.roles || user.roles.length === 0) {
          console.error('User roles not found');
          toast({
            variant: "destructive",
            title: "Error",
            description: "Data pengguna tidak lengkap. Silakan logout dan login kembali.",
          });
          setIsLoading(false);
          return;
        }
        
        const userRole = user.roles[0] as 'mahasiswa' | 'dosen' | 'tendik' | 'koorpro';
        setProfileRole(userRole);
        
        if (userRole === 'mahasiswa') {
          // Check if student profile exists
          const { data: mahasiswaData, error: mahasiswaError } = await supabase
            .from('mahasiswas')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          if (mahasiswaError) {
            if (mahasiswaError.code === 'PGRST116') {
              // Profile doesn't exist yet, which is expected for new users
              console.log('Student profile does not exist yet');
            } else {
              // Real error occurred
              console.error('Error fetching student profile:', mahasiswaError);
              toast({
                variant: "destructive",
                title: "Error",
                description: "Terjadi kesalahan saat memuat profil mahasiswa.",
              });
            }
          } else if (mahasiswaData) {
            // Profile exists, pre-fill the form
            setProfileExists(true);
            setStudentValue('nama', mahasiswaData.nama || '');
            setStudentValue('nim', mahasiswaData.nim || '');
            setStudentValue('email', mahasiswaData.email || '');
            setStudentValue('nomor_telepon', mahasiswaData.nomor_telepon || '');
          }
        } else if (userRole === 'dosen') {
          // Check if lecturer profile exists
          const { data: dosenData, error: dosenError } = await supabase
            .from('dosens')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          if (dosenError) {
            if (dosenError.code === 'PGRST116') {
              // Profile doesn't exist yet, which is expected for new users
              console.log('Lecturer profile does not exist yet');
            } else {
              // Real error occurred
              console.error('Error fetching lecturer profile:', dosenError);
              toast({
                variant: "destructive",
                title: "Error",
                description: "Terjadi kesalahan saat memuat profil dosen.",
              });
            }
          } else if (dosenData) {
            // Profile exists, pre-fill the form
            setProfileExists(true);
            setDosenValue('nama_dosen', dosenData.nama_dosen || '');
            setDosenValue('nip', dosenData.nip || '');
            setDosenValue('email', dosenData.email || '');
          }
        }
        
        // If user is tendik or koorpro, no specific profile needed for now
        if (userRole === 'tendik' || userRole === 'koorpro') {
          setProfileExists(true); // Assume profile exists for admin users
        }
      } catch (error) {
        console.error('Error checking profile:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Terjadi kesalahan saat memuat profil.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    checkProfile();
  }, [user, toast, setStudentValue, setDosenValue]);
  
  // Submit handler for student profile
  const onSubmitStudent = async (data: StudentProfileFormValues) => {
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      
      // Check if user already has a mahasiswa profile
      const { data: existingData, error: checkError } = await supabase
        .from('mahasiswas')
        .select('id')
        .eq('user_id', user.id);

      if (checkError) {
        console.error('Error checking existing profile:', checkError);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Terjadi kesalahan saat memeriksa profil mahasiswa.",
        });
        setIsSubmitting(false);
        return;
      }

      let operation;
      if (existingData && existingData.length > 0) {
        // Update existing profile
        operation = supabase
          .from('mahasiswas')
          .update({
            nama: data.nama,
            nim: data.nim,
            email: data.email,
            nomor_telepon: data.nomor_telepon || null,
          })
          .eq('user_id', user.id);
      } else {
        // Insert new profile
        operation = supabase
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

      const { error } = await operation;
      
      if (error) {
        console.error('Error saving student profile:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Terjadi kesalahan saat menyimpan profil mahasiswa: " + error.message,
        });
        return;
      }
      
      toast({
        title: "Profil Berhasil Disimpan",
        description: "Data profil mahasiswa berhasil disimpan.",
      });
      
      setProfileExists(true);
      
      // Refresh the page to show the updated profile
      router.refresh();
    } catch (error) {
      console.error('Error saving student profile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Terjadi kesalahan saat menyimpan profil mahasiswa.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Submit handler for lecturer profile
  const onSubmitDosen = async (data: DosenProfileFormValues) => {
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      
      // Check if user already has a dosen profile
      const { data: existingData, error: checkError } = await supabase
        .from('dosens')
        .select('id')
        .eq('user_id', user.id);

      if (checkError) {
        console.error('Error checking existing profile:', checkError);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Terjadi kesalahan saat memeriksa profil dosen.",
        });
        setIsSubmitting(false);
        return;
      }

      let operation;
      if (existingData && existingData.length > 0) {
        // Update existing profile
        operation = supabase
          .from('dosens')
          .update({
            nama_dosen: data.nama_dosen,
            nip: data.nip,
            email: data.email,
          })
          .eq('user_id', user.id);
      } else {
        // Insert new profile
        operation = supabase
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

      const { error } = await operation;
      
      if (error) {
        console.error('Error saving lecturer profile:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Terjadi kesalahan saat menyimpan profil dosen: " + error.message,
        });
        return;
      }
      
      toast({
        title: "Profil Berhasil Disimpan",
        description: "Data profil dosen berhasil disimpan.",
      });
      
      setProfileExists(true);
      
      // Refresh the page to show the updated profile
      router.refresh();
    } catch (error) {
      console.error('Error saving lecturer profile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Terjadi kesalahan saat menyimpan profil dosen.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Additional user information section
  const userInfoSection = () => {
    if (!user) return null;
    
    return (
      <div className="bg-blue-50 p-4 rounded-md mb-6">
        <h3 className="font-medium text-blue-800">Informasi Akun</h3>
        <div className="mt-2 space-y-1 text-sm">
          <p><span className="font-medium">Nama:</span> {user.name}</p>
          <p><span className="font-medium">Email:</span> {user.email}</p>
          <p><span className="font-medium">Peran:</span> {user.roles.map(role => role.charAt(0).toUpperCase() + role.slice(1)).join(', ')}</p>
        </div>
      </div>
    );
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
      
      {userInfoSection()}
      
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
      
      {(profileRole === 'tendik' || profileRole === 'koorpro') && (
        <Card>
          <CardHeader>
            <CardTitle>Profil Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Tidak ada data profil khusus yang perlu dilengkapi untuk akun admin.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
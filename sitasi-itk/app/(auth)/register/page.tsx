'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';
import { RegisterCredentials, UserRole } from '../../../types/auth';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Updated schema to only include allowed roles for public registration
const registerSchema = z.object({
  name: z.string().min(3, 'Nama minimal 3 karakter'),
  email: z.string().email('Email tidak valid'),
  username: z.string().min(3, 'Username minimal 3 karakter'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role: z.enum(['mahasiswa', 'dosen'] as const), // Removed tendik and koorpro
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const router = useRouter();
  const { register: registerUser } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'mahasiswa',
    },
  });

  // Fungsi onSubmit yang bekerja dengan API route
  const onSubmit = async (data: RegisterFormValues) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const credentials: RegisterCredentials = {
        name: data.name,
        email: data.email,
        username: data.username,
        password: data.password,
        role: data.role as UserRole,
      };

      console.log('Mencoba mendaftar dengan data:', {
        ...credentials, 
        password: '[DISEMBUNYIKAN]'
      });

      // Panggil fungsi register yang sekarang menggunakan API route
      const result = await registerUser(credentials);

      if (result.error) {
        console.error('Error registrasi:', result.error);
        setError('Terjadi kesalahan: ' + result.error.message);
        setIsSubmitting(false);
        return;
      }

      // Jika sukses, tampilkan pesan sukses
      console.log('Pendaftaran berhasil, menampilkan pesan verifikasi');
      setVerificationSent(true);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError('Terjadi kesalahan tak terduga: ' + (err.message || 'Silakan coba lagi nanti.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Daftar SITASI-ITK
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sistem Informasi Tugas Akhir - Institut Teknologi Kalimantan
          </p>
        </div>
        
        {verificationSent ? (
          <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
            <p className="font-bold">Pendaftaran Berhasil!</p>
            <p className="block sm:inline mb-2">
              Silakan periksa email Anda untuk melakukan verifikasi akun. 
              Anda perlu mengkonfirmasi email sebelum dapat login ke sistem.
            </p>
            <div className="mt-4">
              <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
                Kembali ke halaman login
              </Link>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nama Lengkap
                </label>
                <input
                  id="name"
                  type="text"
                  {...register('name')}
                  className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  NIM/NIP
                </label>
                <input
                  id="username"
                  type="text"
                  {...register('username')}
                  className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
                {errors.username && (
                  <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  {...register('password')}
                  className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Peran
                </label>
                <select
                  id="role"
                  {...register('role')}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value="mahasiswa">Mahasiswa</option>
                  <option value="dosen">Dosen</option>
                  {/* Admin roles removed from dropdown */}
                </select>
                {errors.role && (
                  <p className="text-red-500 text-xs mt-1">{errors.role.message}</p>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                {isSubmitting ? 'Loading...' : 'Daftar'}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Sudah punya akun?{' '}
                <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
                  Login disini
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
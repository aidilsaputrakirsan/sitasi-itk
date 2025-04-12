'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Double-check session directly via supabase
        const { data } = await supabase.auth.getSession();
        const hasSession = !!data.session;
        
        console.log("Root page auth check:", { 
          contextUser: !!user, 
          directSession: hasSession,
          isLoading 
        });
        
        // If auth context is ready
        if (!isLoading) {
          if (user || hasSession) {
            console.log("User authenticated, redirecting to dashboard");
            router.replace('/dashboard');
          } else {
            console.log("No authenticated user, redirecting to login");
            router.replace('/login');
          }
        }
      } catch (error) {
        console.error("Error checking auth:", error);
        // On error, default to login page
        router.replace('/login');
      } finally {
        setCheckingAuth(false);
      }
    };
    
    checkAuth();
  }, [user, isLoading, router]);

  // Show a clear loading state
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">SITASI-ITK</h1>
        <p className="text-gray-600 mb-8">Sistem Informasi Tugas Akhir - Institut Teknologi Kalimantan</p>
        
        <div className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-blue-600">
            {checkingAuth ? "Memeriksa status autentikasi..." : "Mengarahkan ke halaman yang sesuai..."}
          </p>
        </div>
      </div>
    </div>
  );
}
// app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { RegisterCredentials } from '@/types/auth';

export async function POST(request: Request) {
  try {
    // Ambil data pendaftaran
    const credentials: RegisterCredentials = await request.json();
    console.log('API Route: Processing registration for:', credentials.email);
    
    // Buat client dengan service role
    const supabaseAdmin = createServerSupabaseClient();
    
    // 1. Daftarkan user baru
    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          name: credentials.name,
          role: credentials.role,
          username: credentials.username
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`
      }
    });

    // Handle error pendaftaran
    if (authError) {
      console.error('API Route: Auth error:', authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // User harus terbentuk
    if (!authData.user) {
      return NextResponse.json({ error: 'User creation failed' }, { status: 500 });
    }

    // 2. Buat profil untuk user baru - ini akan memicu trigger untuk profil spesifik peran
    const userId = authData.user.id;
    const role = credentials.role;
    const roles = [role];
    
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        name: credentials.name,
        username: credentials.username,
        roles: roles
      });

    // Jika ada error saat membuat profil, coba pendekatan lain
    if (profileError) {
      console.error('API Route: Profile creation error:', profileError);
      
      // Coba panggil fungsi RPC untuk membuat profil
      try {
        await supabaseAdmin.rpc('create_profile_manually', {
          p_user_id: userId,
          p_name: credentials.name,
          p_username: credentials.username,
          p_role: role
        });
        
        console.log('API Route: Profile created via RPC function');
      } catch (rpcError) {
        console.error('API Route: RPC error:', rpcError);
        // Pesan khusus untuk client tapi tetap anggap berhasil
        return NextResponse.json({
          success: true,
          user: authData.user,
          warning: "User created but profile may need to be completed later"
        });
      }
    }
    
    // 3. Buat profil spesifik sesuai peran (pendekatan langsung)
    try {
      if (role === 'mahasiswa') {
        await supabaseAdmin
          .from('mahasiswas')
          .insert({
            user_id: userId,
            nama: credentials.name,
            nim: credentials.username,
            email: credentials.email
          });
      } else if (role === 'dosen') {
        await supabaseAdmin
          .from('dosens')
          .insert({
            user_id: userId,
            nama_dosen: credentials.name,
            nip: credentials.username,
            email: credentials.email
          });
      }
      // tendik dan koorpro tidak perlu dihandle di sini karena tidak ada di form pendaftaran
      
    } catch (specificProfileError) {
      console.error(`API Route: Error creating ${role} profile:`, specificProfileError);
      // Tidak mengembalikan error karena profil spesifik dapat dibuat nanti
    }
    
    console.log('API Route: Registration successful');
    return NextResponse.json({
      success: true,
      user: authData.user
    });
  } catch (error: any) {
    console.error('API Route: Unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}
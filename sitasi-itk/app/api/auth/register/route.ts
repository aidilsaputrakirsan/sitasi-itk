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

    const userId = authData.user.id;
    const role = credentials.role;

    // 2. Mencoba membuat profil dengan beberapa pendekatan
    // Pendekatan 1: Gunakan RPC untuk membuat profil dan profil spesifik
    try {
      const rpcResult = await supabaseAdmin.rpc('create_profile_with_role', {
        p_user_id: userId,
        p_name: credentials.name,
        p_username: credentials.username,
        p_role: role,
        p_email: credentials.email
      });
      
      console.log('API Route: RPC result:', rpcResult);
      
      // Jika RPC berhasil, kita sudah selesai
      if (!rpcResult.error) {
        console.log('API Route: Profile created via RPC');
        return NextResponse.json({
          success: true,
          user: authData.user
        });
      }
    } catch (rpcError) {
      console.error('API Route: RPC error:', rpcError);
      // Lanjutkan ke pendekatan berikutnya
    }

    // Pendekatan 2: Coba JSON_BUILD_ARRAY untuk roles
    try {
      // JSON_BUILD_ARRAY menghasilkan JSON array yang kemudian di-cast ke text[]
      const { error: profileError } = await supabaseAdmin.rpc('create_profile_json_array', {
        p_id: userId,
        p_name: credentials.name,
        p_username: credentials.username,
        p_role: role
      });

      if (profileError) {
        console.error('API Route: JSON array approach error:', profileError);
      } else {
        console.log('API Route: Profile created via JSON array approach');
      }
    } catch (jsonError) {
      console.error('API Route: JSON array approach exception:', jsonError);
    }
    
    // Pendekatan 3: Buat profil spesifik peran langsung (backup)
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
        console.log('API Route: Mahasiswa profile created directly');
      } else if (role === 'dosen') {
        await supabaseAdmin
          .from('dosens')
          .insert({
            user_id: userId,
            nama_dosen: credentials.name,
            nip: credentials.username,
            email: credentials.email
          });
        console.log('API Route: Dosen profile created directly');
      }
    } catch (specificProfileError) {
      console.error(`API Route: Error creating ${role} profile directly:`, specificProfileError);
    }
    
    // Pendekatan terakhir: Trigger diharapkan telah membuat profil di background
    
    console.log('API Route: Registration completed. Relying on triggers for profile creation.');
    return NextResponse.json({
      success: true,
      user: authData.user
    });
  } catch (error: any) {
    console.error('API Route: Unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}
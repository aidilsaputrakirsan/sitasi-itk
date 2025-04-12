import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  // Create a response object that we'll modify based on auth state
  const res = NextResponse.next();
  
  // Create a Supabase client configured to use cookies
  const supabase = createMiddlewareClient({ req, res });
  
  // Refresh session if expired - helps with auto-refresh
  await supabase.auth.getSession();
  
  // Skip all redirection logic and just return the response
  // This approach avoids the redirect issues but still allows Supabase
  // to handle session refreshing properly
  return res;
}

// Specify which routes this middleware should run on
export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
  ],
}
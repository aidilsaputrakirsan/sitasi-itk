import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  // Create a response object that we'll modify based on auth state
  const res = NextResponse.next();
  
  // Create a Supabase client configured to use cookies
  const supabase = createMiddlewareClient({ req, res });
  
  // Refresh session if expired - helps with auto-refresh
  await supabase.auth.getSession();
  
  // Check if we have a session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Log URL being accessed (helpful for debugging)
  console.log('Middleware checking URL:', req.nextUrl.pathname);
  
  // Define auth routes and protected routes
  const isAuthRoute = 
    req.nextUrl.pathname === '/login' || 
    req.nextUrl.pathname === '/register' || 
    req.nextUrl.pathname === '/forgot-password' || 
    req.nextUrl.pathname === '/reset-password';
  
  const isProtectedRoute = req.nextUrl.pathname.startsWith('/dashboard');
  
  // Root path handling
  if (req.nextUrl.pathname === '/') {
    if (session) {
      console.log('Root path with session - redirecting to dashboard');
      return NextResponse.redirect(new URL('/dashboard', req.url));
    } else {
      console.log('Root path without session - redirecting to login');
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  // If no session and trying to access protected routes, redirect to login
  if (!session && isProtectedRoute) {
    console.log('No session, but trying to access protected route - redirecting to login');
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // If user is logged in and trying to access auth routes, redirect to dashboard
  if (session && isAuthRoute) {
    console.log('Has session, but trying to access auth route - redirecting to dashboard');
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // For other routes, proceed normally with the response
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
'use client';

import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

type RoleConfig = {
  allowedRoles: UserRole[];
  redirectTo?: string;
};

export function useRBAC({ allowedRoles, redirectTo = '/dashboard' }: RoleConfig) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until auth is loaded
    if (isLoading) return;

    // If no user, they'll be redirected to login by middleware
    if (!user) return;

    // Check if user has any of the allowed roles
    const hasAllowedRole = user.roles.some(role => allowedRoles.includes(role as UserRole));

    // If not, redirect to the specified path
    if (!hasAllowedRole) {
      router.push(redirectTo);
    }
  }, [user, isLoading, allowedRoles, redirectTo, router]);

  // Return whether the user has access
  if (!user || isLoading) return { hasAccess: false, isLoading: true };
  
  return { 
    hasAccess: user.roles.some(role => allowedRoles.includes(role as UserRole)),
    isLoading: false
  };
}

export default useRBAC;
'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';

// Icons can be imported from a library like heroicons or created as components
const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const DocumentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ChatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const BookOpenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Add more detailed debugging
  useEffect(() => {
    console.log("Dashboard layout rendering, auth state:", {
      userExists: !!user,
      isLoading,
      userId: user?.id,
      roles: user?.roles || []
    });
  }, [user, isLoading]);

  useEffect(() => {
    // Check if the user is not authenticated and auth is not loading
    if (!isLoading && !user) {
      console.log("No authenticated user found in dashboard layout, redirecting to login");
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        <p className="ml-3 text-primary-600">Loading authentication...</p>
      </div>
    );
  }

  // If no user is present, show a minimal loading state (middleware should handle redirect)
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        <p className="ml-3 text-primary-600">Checking authentication...</p>
      </div>
    );
  }

  // Update the getNavItems function in app/dashboard/layout.tsx
  const getNavItems = () => {
    const commonItems = [
      { name: 'Dashboard', href: '/dashboard', icon: <HomeIcon /> },
      { name: 'Profile', href: '/dashboard/profile', icon: <UserIcon /> },
    ];

    const mahasiswaItems = [
      { name: 'Pengajuan TA', href: '/dashboard/pengajuan', icon: <DocumentIcon /> },
      { name: 'Bimbingan', href: '/dashboard/bimbingan', icon: <ChatIcon /> },
      { name: 'Seminar Proposal', href: '/dashboard/sempro', icon: <CalendarIcon /> },
      { name: 'Sidang TA', href: '/dashboard/sidang', icon: <CalendarIcon /> },
      { name: 'Katalog TA', href: '/dashboard/katalog', icon: <BookOpenIcon /> },
    ];

    const dosenItems = [
      { name: 'Mahasiswa Bimbingan', href: '/dashboard/bimbingan', icon: <UserIcon /> },
      { name: 'Pengajuan TA', href: '/dashboard/pengajuan', icon: <DocumentIcon /> }, // Added this item
      { name: 'Jadwal Sempro', href: '/dashboard/sempro', icon: <CalendarIcon /> },
      { name: 'Jadwal Sidang', href: '/dashboard/jadwal-sidang', icon: <CalendarIcon /> },
      { name: 'Penilaian', href: '/dashboard/penilaian', icon: <DocumentIcon /> },
      { name: 'Referensi', href: '/dashboard/referensi', icon: <BookOpenIcon /> },
    ];

    const tendikItems = [
      { name: 'Data Mahasiswa', href: '/dashboard/data-mahasiswa', icon: <UserIcon /> },
      { name: 'Data Dosen', href: '/dashboard/data-dosen', icon: <UserIcon /> },
      { name: 'Pengajuan TA', href: '/dashboard/pengajuan', icon: <DocumentIcon /> }, // Changed from '/dashboard/data-pengajuan'
      { name: 'Periode', href: '/dashboard/periode', icon: <CalendarIcon /> },
      { name: 'Jadwal Sempro', href: '/dashboard/sempro', icon: <CalendarIcon /> },
      { name: 'Jadwal Sidang', href: '/dashboard/kelola-sidang', icon: <CalendarIcon /> },
      { name: 'Katalog TA', href: '/dashboard/kelola-katalog', icon: <BookOpenIcon /> },
    ];

    const koorproItems = [
      ...tendikItems,
      { name: 'Laporan', href: '/dashboard/laporan', icon: <DocumentIcon /> },
    ];

    if (user.roles.includes('mahasiswa')) {
      return [...commonItems, ...mahasiswaItems];
    } else if (user.roles.includes('dosen')) {
      return [...commonItems, ...dosenItems];
    } else if (user.roles.includes('tendik')) {
      return [...commonItems, ...tendikItems];
    } else if (user.roles.includes('koorpro')) {
      return [...commonItems, ...koorproItems];
    }

    return commonItems;
  };

  const navItems = getNavItems();

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar for medium and larger screens */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 bg-white border-r border-gray-200">
          <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <span className="text-xl font-semibold text-gray-800">SITASI-ITK</span>
            </div>
            <div className="mt-5 flex-grow flex flex-col">
              <nav className="flex-1 px-2 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`${
                      pathname === item.href
                        ? 'bg-primary-100 text-primary-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                  >
                    <div className="mr-3 h-6 w-6">{item.icon}</div>
                    {item.name}
                  </Link>
                ))}
                <button
                  onClick={() => logout()}
                  className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full"
                >
                  <div className="mr-3 h-6 w-6"><LogoutIcon /></div>
                  Logout
                </button>
              </nav>
            </div>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex-shrink-0 w-full group block">
              <div className="flex items-center">
                <div>
                  {user.photo_url ? (
                    <img
                      className="inline-block h-9 w-9 rounded-full"
                      src={user.photo_url}
                      alt={user.name}
                    />
                  ) : (
                    <div className="inline-block h-9 w-9 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    {user.name}
                  </p>
                  <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
                    {user.roles.map(role => role.charAt(0).toUpperCase() + role.slice(1)).join(', ')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className={`md:hidden fixed inset-0 flex z-40 ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75"
          onClick={() => setSidebarOpen(false)}
        ></div>

        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Close sidebar</span>
              <svg
                className="h-6 w-6 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <span className="text-xl font-semibold text-gray-800">SITASI-ITK</span>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${
                    pathname === item.href
                      ? 'bg-primary-100 text-primary-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  } group flex items-center px-2 py-2 text-base font-medium rounded-md`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className="mr-4 h-6 w-6">{item.icon}</div>
                  {item.name}
                </Link>
              ))}
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  logout();
                }}
                className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex items-center px-2 py-2 text-base font-medium rounded-md w-full"
              >
                <div className="mr-4 h-6 w-6"><LogoutIcon /></div>
                Logout
              </button>
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex-shrink-0 w-full group block">
              <div className="flex items-center">
                <div>
                  {user.photo_url ? (
                    <img
                      className="inline-block h-10 w-10 rounded-full"
                      src={user.photo_url}
                      alt={user.name}
                    />
                  ) : (
                    <div className="inline-block h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-base font-medium text-gray-700 group-hover:text-gray-900">
                    {user.name}
                  </p>
                  <p className="text-sm font-medium text-gray-500 group-hover:text-gray-700">
                    {user.roles.map(role => role.charAt(0).toUpperCase() + role.slice(1)).join(', ')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
          <button
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <svg
              className="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DataCard } from '@/components/DataCard';
import { NotificationCard } from '@/components/NotificationCard';
import { useNotifications, useMarkNotificationAsRead } from '@/hooks/useNotifications';
import { usePeriodeSempros } from '@/hooks/useSempro';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import DashboardStatsCards from '@/components/dashboard/DashboardStatsCards';
import { PeriodeSempro } from '@/types/sempro';
import { DashboardStats } from '@/types/dashboard';

// Komponen Icons
const Icons = {
  Proposal: () => (
    <svg
      className="h-6 w-6 text-blue-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
  Consultation: () => (
    <svg
      className="h-6 w-6 text-blue-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  ),
  Seminar: () => (
    <svg
      className="h-6 w-6 text-blue-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
  Defense: () => (
    <svg
      className="h-6 w-6 text-blue-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
      />
    </svg>
  ),
  Catalog: () => (
    <svg
      className="h-6 w-6 text-blue-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  ),
};

export default function Dashboard() {
  const { user } = useAuth();
  const { data: notifications, isLoading: notificationsLoading } = useNotifications(user?.id || '');
  const { mutate: markAsRead } = useMarkNotificationAsRead();
  const { data: periods, isLoading: periodsLoading } = usePeriodeSempros();
  const [activePeriod, setActivePeriod] = useState<PeriodeSempro | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    pengajuan: 0,
    bimbingan: 0,
    sempro: 0,
    sidang: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set periode aktif dari daftar periode
    if (periods && periods.length > 0) {
      const active = periods.find(p => p.is_active);
      if (active) {
        setActivePeriod(active as PeriodeSempro);
        setSelectedPeriodId(active.id);
      }
    }
  }, [periods]);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Statistik pengajuan TA
        const { count: pengajuanCount, error: pengajuanError } = await supabase
          .from('pengajuan_tas')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Statistik bimbingan
        const { count: bimbinganCount, error: bimbinganError } = await supabase
          .from('bimbingans')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Statistik sempro
        const { count: semproCount, error: semproError } = await supabase
          .from('sempros')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Statistik sidang (jika ada tabel sidang)
        let sidangCount = 0;
        try {
          const { count, error } = await supabase
            .from('sidangs') // Ganti dengan nama tabel yang benar jika ada
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
          
          if (!error && count !== null) {
            sidangCount = count;
          }
        } catch (error) {
          console.error('Error fetching sidang count or table not exist:', error);
          sidangCount = 0;
        }

        setDashboardStats({
          pengajuan: pengajuanCount || 0,
          bimbingan: bimbinganCount || 0,
          sempro: semproCount || 0,
          sidang: sidangCount
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardStats();
  }, [user]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleMarkAsRead = (id: string): void => {
    markAsRead(id);
  };

  const handlePeriodChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    setSelectedPeriodId(e.target.value);
    // Idealnya, ini juga akan memicu refresh data untuk periode yang dipilih
  };

  const handleRefresh = (): void => {
    window.location.reload();
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-2 md:space-y-0 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Selamat datang, {user?.name}!
          </p>
        </div>
        <div className="flex space-x-2">
          <select 
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 text-sm"
            value={selectedPeriodId}
            onChange={handlePeriodChange}
            disabled={periodsLoading}
          >
            <option value="">Pilih Periode</option>
            {periods && periods.map(period => (
              <option key={period.id} value={period.id}>
                {period.nama_periode}
              </option>
            ))}
          </select>
          <button 
            className="bg-blue-600 text-white rounded-md px-3 py-2 text-sm font-medium hover:bg-blue-700"
            onClick={handleRefresh}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <DashboardStatsCards />

      {/* Visualisasi Data & Grafik */}
      <div className="my-8">
        <h2 className="text-lg leading-6 font-medium text-gray-900 mb-4">Visualisasi Data</h2>
        <DashboardCharts />
      </div>

      {/* Data Cards - Optional karna sudah ada stats cards */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <DataCard
          title="Pengajuan TA"
          value={isLoading ? '...' : dashboardStats.pengajuan}
          icon={<Icons.Proposal />}
          bgColor="bg-blue-100"
          linkHref="/dashboard/pengajuan"
          linkText="Lihat detail"
        />
        
        <DataCard
          title="Bimbingan"
          value={isLoading ? '...' : dashboardStats.bimbingan}
          icon={<Icons.Consultation />}
          bgColor="bg-green-100"
          linkHref="/dashboard/bimbingan"
          linkText="Lihat detail"
        />
        
        <DataCard
          title="Seminar Proposal"
          value={isLoading ? '...' : dashboardStats.sempro}
          icon={<Icons.Seminar />}
          bgColor="bg-purple-100"
          linkHref="/dashboard/sempro"
          linkText="Lihat detail"
        />
        
        <DataCard
          title="Sidang Tugas Akhir"
          value={isLoading ? '...' : dashboardStats.sidang}
          icon={<Icons.Defense />}
          bgColor="bg-yellow-100"
          linkHref="/dashboard/sidang"
          linkText="Lihat detail"
        />
      </div>

      {/* Notifikasi */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg leading-6 font-medium text-gray-900">Notifikasi Terbaru</h2>
          {notifications && notifications.length > 0 && (
            <Link
              href="/dashboard/notifications"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              Lihat semua
            </Link>
          )}
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {notificationsLoading ? (
              <li className="px-4 py-4 sm:px-6 flex justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
              </li>
            ) : notifications && notifications.length > 0 ? (
              notifications.slice(0, 5).map((notification) => (
                <NotificationCard
                  key={notification.id}
                  id={notification.id}
                  title={notification.judul}
                  message={notification.pesan}
                  date={formatDate(notification.created_at)}
                  isRead={notification.is_read}
                  onMarkAsRead={handleMarkAsRead}
                />
              ))
            ) : (
              <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
                Tidak ada notifikasi
              </li>
            )}
          </ul>
        </div>
      </div>
      
      {/* Aksi Cepat */}
      <div className="mt-8">
        <h2 className="text-lg leading-6 font-medium text-gray-900 mb-4">Aksi Cepat</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link 
            href="/dashboard/pengajuan/create" 
            className="bg-white overflow-hidden shadow rounded-lg p-6 hover:bg-blue-50 transition-colors"
          >
            <div className="flex justify-center items-center">
              <Icons.Proposal />
            </div>
            <h3 className="mt-4 text-center font-medium">Ajukan Proposal TA</h3>
          </Link>
          
          <Link 
            href="/dashboard/bimbingan/create" 
            className="bg-white overflow-hidden shadow rounded-lg p-6 hover:bg-green-50 transition-colors"
          >
            <div className="flex justify-center items-center">
              <Icons.Consultation />
            </div>
            <h3 className="mt-4 text-center font-medium">Catat Bimbingan</h3>
          </Link>
          
          <Link 
            href="/dashboard/sempro/register" 
            className="bg-white overflow-hidden shadow rounded-lg p-6 hover:bg-purple-50 transition-colors"
          >
            <div className="flex justify-center items-center">
              <Icons.Seminar />
            </div>
            <h3 className="mt-4 text-center font-medium">Daftar Seminar</h3>
          </Link>
          
          <Link 
            href="/dashboard/katalog" 
            className="bg-white overflow-hidden shadow rounded-lg p-6 hover:bg-yellow-50 transition-colors"
          >
            <div className="flex justify-center items-center">
              <Icons.Catalog />
            </div>
            <h3 className="mt-4 text-center font-medium">Katalog TA</h3>
          </Link>
        </div>
      </div>
    </div>
  );
}
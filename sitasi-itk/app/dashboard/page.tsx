'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalPengajuan: 0,
    totalSempro: 0,
    totalSidang: 0,
    totalBimbingan: 0,
  });
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      setLoading(true);
      try {
        // Fetch statistics based on user role
        if (user.roles.includes('mahasiswa')) {
          // For students, get their own data
          const { data: pengajuanData } = await supabase
            .from('pengajuan_tas')
            .select('id')
            .eq('mahasiswa_id', user.id)
            .single();

          const { data: semproData, count: semproCount } = await supabase
            .from('sempros')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id);

          const { data: sidangData, count: sidangCount } = await supabase
            .from('sidang_tas')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id);

          const { data: bimbinganData, count: bimbinganCount } = await supabase
            .from('bimbingans')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id);

          setStats({
            totalPengajuan: pengajuanData ? 1 : 0,
            totalSempro: semproCount || 0,
            totalSidang: sidangCount || 0,
            totalBimbingan: bimbinganCount || 0,
          });
        } else if (user.roles.includes('dosen')) {
          // For lecturers, get data related to them
          const { data: pengajuanData, count: pengajuanCount } = await supabase
            .from('pengajuan_tas')
            .select('id', { count: 'exact' })
            .or(`pembimbing_1.eq.${user.id},pembimbing_2.eq.${user.id}`);

          const { data: bimbinganData, count: bimbinganCount } = await supabase
            .from('bimbingans')
            .select('id', { count: 'exact' })
            .eq('dosen', user.id);

          // For sempro and sidang, we need to get the schedules where the lecturer is an examiner
          const { data: semproData, count: semproCount } = await supabase
            .from('jadwal_sempros')
            .select('id', { count: 'exact' })
            .or(`penguji_1.eq.${user.id},penguji_2.eq.${user.id}`);

          // Similar for sidang, but we'd need a similar structure for jadwal_tas
          // This is a placeholder as the exact schema might differ
          const sidangCount = 0;

          setStats({
            totalPengajuan: pengajuanCount || 0,
            totalSempro: semproCount || 0,
            totalSidang: sidangCount || 0,
            totalBimbingan: bimbinganCount || 0,
          });
        } else if (user.roles.includes('tendik') || user.roles.includes('koorpro')) {
          // For admin roles, get all data counts
          const { count: pengajuanCount } = await supabase
            .from('pengajuan_tas')
            .select('id', { count: 'exact' });

          const { count: semproCount } = await supabase
            .from('sempros')
            .select('id', { count: 'exact' });

          const { count: sidangCount } = await supabase
            .from('sidang_tas')
            .select('id', { count: 'exact' });

          const { count: bimbinganCount } = await supabase
            .from('bimbingans')
            .select('id', { count: 'exact' });

          setStats({
            totalPengajuan: pengajuanCount || 0,
            totalSempro: semproCount || 0,
            totalSidang: sidangCount || 0,
            totalBimbingan: bimbinganCount || 0,
          });
        }

        // Fetch notifications for the user
        const { data: notifData } = await supabase
          .from('notifikasis')
          .select('*')
          .eq('to_user', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        setNotifications(notifData || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500">
        Selamat datang, {user?.name}!
      </p>

      {loading ? (
        <div className="mt-6 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="mt-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Pengajuan TA Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                    <svg
                      className="h-6 w-6 text-primary-600"
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
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Pengajuan TA
                      </dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">
                          {stats.totalPengajuan}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-4 sm:px-6">
                <div className="text-sm">
                  <a
                    href="/dashboard/pengajuan"
                    className="font-medium text-primary-600 hover:text-primary-500"
                  >
                    Lihat detail
                  </a>
                </div>
              </div>
            </div>

            {/* Bimbingan Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                    <svg
                      className="h-6 w-6 text-primary-600"
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
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Bimbingan
                      </dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">
                          {stats.totalBimbingan}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-4 sm:px-6">
                <div className="text-sm">
                  <a
                    href="/dashboard/bimbingan"
                    className="font-medium text-primary-600 hover:text-primary-500"
                  >
                    Lihat detail
                  </a>
                </div>
              </div>
            </div>

            {/* Sempro Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                    <svg
                      className="h-6 w-6 text-primary-600"
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
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Seminar Proposal
                      </dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">
                          {stats.totalSempro}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-4 sm:px-6">
                <div className="text-sm">
                  <a
                    href="/dashboard/sempro"
                    className="font-medium text-primary-600 hover:text-primary-500"
                  >
                    Lihat detail
                  </a>
                </div>
              </div>
            </div>

            {/* Sidang Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                    <svg
                      className="h-6 w-6 text-primary-600"
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
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Sidang Tugas Akhir
                      </dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">
                          {stats.totalSidang}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-4 sm:px-6">
                <div className="text-sm">
                  <a
                    href="/dashboard/sidang"
                    className="font-medium text-primary-600 hover:text-primary-500"
                  >
                    Lihat detail
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="mt-8">
            <h2 className="text-lg leading-6 font-medium text-gray-900">Notifikasi Terbaru</h2>
            <div className="mt-2 bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <li key={notification.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-primary-600 truncate">
                            {notification.judul}
                          </p>
                          <div className="ml-2 flex-shrink-0 flex">
                            <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {notification.is_read ? 'Dibaca' : 'Belum dibaca'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              {notification.pesan}
                            </p>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                            <svg
                              className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                fillRule="evenodd"
                                d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <p>{formatDate(notification.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
                    Tidak ada notifikasi
                  </li>
                )}
              </ul>
              {notifications.length > 0 && (
                <div className="bg-gray-50 px-4 py-3 text-center text-sm">
                  <a
                    href="/dashboard/notifications"
                    className="font-medium text-primary-600 hover:text-primary-500"
                  >
                    Lihat semua notifikasi
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
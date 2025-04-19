import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { StatCardData, PeriodeCountdownData, RoleDashboardStats } from '@/types/dashboard';

const StatCard: React.FC<StatCardData> = ({ title, value, percentChange, isIncreasing, description }) => {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
        <dd className="mt-1 flex justify-between items-baseline md:block lg:flex">
          <div className="flex items-baseline text-2xl font-semibold text-gray-900">
            {value}
            {description && (
              <span className="ml-2 text-sm font-medium text-gray-500">
                {description}
              </span>
            )}
          </div>

          {percentChange && (
            <div className={`flex items-baseline text-sm font-semibold ${isIncreasing ? 'text-green-600' : 'text-red-600'}`}>
              <span>{isIncreasing ? '↑' : '↓'}</span>
              <span className="sr-only">{isIncreasing ? 'Meningkat' : 'Menurun'}</span>
              {percentChange}
            </div>
          )}
        </dd>
      </div>
    </div>
  );
};

const PeriodeCountdown: React.FC<PeriodeCountdownData> = ({ tanggalBerakhir, nama }) => {
  // Format tanggal
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  // Hitung sisa hari
  const calculateDaysRemaining = (endDateString: string) => {
    const endDate = new Date(endDateString);
    const currentDate = new Date();
    const diffTime = endDate.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const daysRemaining = calculateDaysRemaining(tanggalBerakhir);

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <dt className="text-sm font-medium text-gray-500 truncate">Periode Aktif</dt>
        <dd className="mt-1">
          <div className="text-lg font-semibold text-gray-900">{nama}</div>
          <div className="mt-1 flex items-baseline">
            <div className="text-2xl font-semibold text-blue-600">{daysRemaining}</div>
            <div className="ml-2 text-sm text-gray-500">hari tersisa</div>
          </div>
          <div className="mt-1 text-sm text-gray-500">
            Berakhir pada {formatDate(tanggalBerakhir)}
          </div>
        </dd>
      </div>
    </div>
  );
};

const DashboardStatsCards: React.FC = () => {
  const { user } = useAuth();
  const role = user?.roles?.[0] || 'mahasiswa';

  // Data ini seharusnya diambil dari backend/database
  const statsData: RoleDashboardStats = {
    periodeAktif: {
      nama: 'Semester Genap 2024/2025',
      tanggalBerakhir: '2025-06-30', // Format: YYYY-MM-DD
    },
    mahasiswa: {
      pengajuanTA: { total: 1, change: null },
      bimbingan: { total: 5, change: '+20%' },
      sempro: { total: 1, change: null },
      sidang: { total: 0, change: null },
    },
    dosen: {
      mahasiswaBimbingan: { total: 12, change: '+2' },
      pengajuanMenunggu: { total: 3, change: null },
      jadwalSempro: { total: 5, change: '+2' },
      jadwalSidang: { total: 2, change: null },
    },
    admin: {
      totalMahasiswaTA: { total: 87, change: '+5%' },
      pendaftaranSempro: { total: 23, change: '+15%' },
      pendaftaranSidang: { total: 18, change: '+10%' },
      periodeBerjalan: { total: 1, change: null },
    }
  };

  return (
    <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {/* Periode Countdown - untuk semua role */}
      <PeriodeCountdown 
        nama={statsData.periodeAktif.nama} 
        tanggalBerakhir={statsData.periodeAktif.tanggalBerakhir} 
      />
      
      {/* Stats Mahasiswa */}
      {role === 'mahasiswa' && (
        <>
          <StatCard 
            title="Pengajuan TA" 
            value={statsData.mahasiswa.pengajuanTA.total} 
            percentChange={statsData.mahasiswa.pengajuanTA.change} 
            isIncreasing={statsData.mahasiswa.pengajuanTA.change?.includes('+')}
          />
          <StatCard 
            title="Bimbingan" 
            value={statsData.mahasiswa.bimbingan.total} 
            percentChange={statsData.mahasiswa.bimbingan.change}
            isIncreasing={statsData.mahasiswa.bimbingan.change?.includes('+')}
          />
          <StatCard 
            title="Progress TA" 
            value="40%" 
            description="selesai"
          />
        </>
      )}

      {/* Stats Dosen */}
      {role === 'dosen' && (
        <>
          <StatCard 
            title="Mahasiswa Bimbingan" 
            value={statsData.dosen.mahasiswaBimbingan.total} 
            percentChange={statsData.dosen.mahasiswaBimbingan.change}
            isIncreasing={true}
          />
          <StatCard 
            title="Pengajuan Menunggu" 
            value={statsData.dosen.pengajuanMenunggu.total} 
          />
          <StatCard 
            title="Jadwal Seminar" 
            value={statsData.dosen.jadwalSempro.total} 
            percentChange={statsData.dosen.jadwalSempro.change}
            isIncreasing={true}
          />
        </>
      )}

      {/* Stats Admin */}
      {(role === 'tendik' || role === 'koorpro') && (
        <>
          <StatCard 
            title="Total Mahasiswa TA" 
            value={statsData.admin.totalMahasiswaTA.total} 
            percentChange={statsData.admin.totalMahasiswaTA.change}
            isIncreasing={statsData.admin.totalMahasiswaTA.change?.includes('+')}
          />
          <StatCard 
            title="Pendaftaran Sempro" 
            value={statsData.admin.pendaftaranSempro.total} 
            percentChange={statsData.admin.pendaftaranSempro.change}
            isIncreasing={statsData.admin.pendaftaranSempro.change?.includes('+')}
          />
          <StatCard 
            title="Pendaftaran Sidang" 
            value={statsData.admin.pendaftaranSidang.total} 
            percentChange={statsData.admin.pendaftaranSidang.change}
            isIncreasing={statsData.admin.pendaftaranSidang.change?.includes('+')}
          />
        </>
      )}
    </div>
  );
};

export default DashboardStatsCards;
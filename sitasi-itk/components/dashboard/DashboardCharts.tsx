import React, { useState, useEffect } from 'react';
import { LineChart, BarChart, PieChart, Line, Bar, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/auth';
import { ChartDataPoint, BimbinganChartData, PieChartData } from '@/types/dashboard';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

// Data dummy yang perlu diganti dengan data sebenarnya dari Supabase
const dataSemproStats: ChartDataPoint[] = [
  { bulan: 'Jan', pendaftar: 14, terverifikasi: 12, terjadwal: 10, selesai: 8 },
  { bulan: 'Feb', pendaftar: 18, terverifikasi: 15, terjadwal: 13, selesai: 11 },
  { bulan: 'Mar', pendaftar: 24, terverifikasi: 20, terjadwal: 18, selesai: 15 },
  { bulan: 'Apr', pendaftar: 32, terverifikasi: 28, terjadwal: 25, selesai: 22 },
  { bulan: 'Mei', pendaftar: 22, terverifikasi: 18, terjadwal: 16, selesai: 14 },
  { bulan: 'Jun', pendaftar: 15, terverifikasi: 12, terjadwal: 10, selesai: 8 }
];

const dataBimbingan: BimbinganChartData[] = [
  { minggu: 'Minggu 1', frekuensi: 3 },
  { minggu: 'Minggu 2', frekuensi: 5 },
  { minggu: 'Minggu 3', frekuensi: 2 },
  { minggu: 'Minggu 4', frekuensi: 4 },
  { minggu: 'Minggu 5', frekuensi: 6 },
  { minggu: 'Minggu 6', frekuensi: 4 },
  { minggu: 'Minggu 7', frekuensi: 3 },
  { minggu: 'Minggu 8', frekuensi: 7 }
];

const dataBidangPenelitian: PieChartData[] = [
  { name: 'Machine Learning', value: 35 },
  { name: 'IoT', value: 25 },
  { name: 'Software Engineering', value: 20 },
  { name: 'Data Science', value: 15 },
  { name: 'Computer Vision', value: 5 }
];

const dataStatusMahasiswa: PieChartData[] = [
  { name: 'Pengajuan TA', value: 35 },
  { name: 'Bimbingan', value: 25 },
  { name: 'Sempro', value: 20 },
  { name: 'Sidang', value: 15 },
  { name: 'Lulus', value: 5 }
];

interface PieChartLabelProps {
  name: string;
  percent: number;
}

const DashboardCharts: React.FC = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>('mahasiswa');
  
  // Mendapatkan peran dari useAuth() hook
  useEffect(() => {
    if (user && user.roles) {
      if (user.roles.includes('koorpro')) {
        setRole('koorpro');
      } else if (user.roles.includes('tendik')) {
        setRole('tendik');
      } else if (user.roles.includes('dosen')) {
        setRole('dosen');
      } else {
        setRole('mahasiswa');
      }
    }
  }, [user]);

  const renderPieChartLabel = ({ name, percent }: PieChartLabelProps) => {
    return `${name} ${(percent * 100).toFixed(0)}%`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart pertama: Statistik Sempro (untuk semua pengguna) */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Statistik Seminar Proposal</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataSemproStats} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bulan" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="pendaftar" stroke="#8884d8" name="Pendaftar" />
                <Line type="monotone" dataKey="terverifikasi" stroke="#82ca9d" name="Terverifikasi" />
                <Line type="monotone" dataKey="terjadwal" stroke="#ffc658" name="Terjadwal" />
                <Line type="monotone" dataKey="selesai" stroke="#ff7300" name="Selesai" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart kedua: Statistik Bimbingan (untuk Mahasiswa & Dosen) */}
        {(role === 'mahasiswa' || role === 'dosen') && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Frekuensi Bimbingan</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataBimbingan} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="minggu" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="frekuensi" fill="#8884d8" name="Jumlah Bimbingan" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Chart ketiga: Distribusi Bidang Penelitian (untuk Dosen & Admin) */}
        {(role === 'dosen' || role === 'tendik' || role === 'koorpro') && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Distribusi Bidang Penelitian</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataBidangPenelitian}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={renderPieChartLabel}
                  >
                    {dataBidangPenelitian.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Chart keempat: Status Mahasiswa (untuk Admin) */}
        {(role === 'tendik' || role === 'koorpro') && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Distribusi Status Mahasiswa</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataStatusMahasiswa}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={renderPieChartLabel}
                  >
                    {dataStatusMahasiswa.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardCharts;
import './globals.css';
import { Inter } from 'next/font/google';
import { AuthProvider } from '../contexts/AuthContext';
import { ReactQueryProvider } from '../lib/ReactQueryProvider';
import { Toaster } from '../components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'SITASI-ITK | Sistem Informasi Tugas Akhir Institut Teknologi Kalimantan',
  description: 'Sistem Informasi Tugas Akhir Institut Teknologi Kalimantan',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={inter.className}>
        <ReactQueryProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
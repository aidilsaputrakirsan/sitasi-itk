// components/sempro/SemproDetail.tsx - Perbaikan tampilan dokumen
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Sempro, StatusSempro, FileMetadata } from '@/types/sempro';
import { UserRole } from '@/types/auth';
import { Button } from "@/components/ui/button";
import { SemproStatusBadge } from './SemproStatusBadge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, Download, Calendar, CheckCircle, XCircle, Clock, History, User, BookOpen } from 'lucide-react';
import { useRiwayatSempro, useJadwalSempro, useUpdateSemproStatus } from '@/hooks/useSempro';

// Simple Separator component
const Separator = () => <div className="h-[1px] w-full bg-gray-200 my-4"></div>;

// Date/time formatter
const formatDate = (dateString: string) => {
  try {
    return format(new Date(dateString), 'dd MMMM yyyy');
  } catch (e) {
    return dateString || '-';
  }
};

const formatTime = (timeString: string | undefined) => {
  if (!timeString) return '-';
  return timeString.substring(0, 5); // Format: HH:mm
};

// Helper untuk membuat FileMetadata dari URL string
const createFileMetadata = (url: string | null | undefined, type: string): FileMetadata | null => {
  if (!url) return null;
  
  try {
    // Ekstrak nama file dari URL (ambil bagian terakhir dari path)
    const pathParts = url.split('/');
    const fullFileName = pathParts[pathParts.length - 1];
    
    // Coba ekstrak nama file dari format timestamped
    let fileName = fullFileName;
    const timestampMatch = fullFileName.match(/\d+_(.+)/);
    if (timestampMatch && timestampMatch[1]) {
      fileName = timestampMatch[1];
    }
    
    return {
      fileId: url,
      fileUrl: url,
      fileName: fileName || `Dokumen ${type}`,
      fileType: fileName.split('.').pop()?.toLowerCase() || 'pdf',
      uploadedAt: new Date().toISOString()
    };
  } catch (e) {
    console.error("Error creating file metadata from URL:", e);
    return {
      fileId: url,
      fileUrl: url,
      fileName: `Dokumen ${type}`,
      fileType: 'unknown',
      uploadedAt: new Date().toISOString()
    };
  }
};

interface SemproDetailProps {
  sempro: Sempro;
  userRole: UserRole;
}

export function SemproDetail({ 
  sempro, 
  userRole
}: SemproDetailProps) {
  const { data: riwayat } = useRiwayatSempro(sempro.id);
  const { data: jadwal } = useJadwalSempro(sempro.pengajuan_ta_id, sempro.user_id);
  const { mutate: updateStatus, isPending } = useUpdateSemproStatus();
  
  // State for status update modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<StatusSempro>('verified');
  const [statusNote, setStatusNote] = useState('');
  
  // Membuat objek FileMetadata dari URL menggunakan as untuk type casting
  const dokumenTA012 = createFileMetadata(sempro.form_ta_012, 'TA-012');
  const dokumenPlagiarisme = createFileMetadata(sempro.bukti_plagiasi, 'Plagiarisme');
  const dokumenDraft = createFileMetadata(sempro.proposal_ta, 'Proposal');

  // Logging untuk debugging
  useEffect(() => {
    console.log("Dokumen dari database:");
    console.log("form_ta_012:", sempro.form_ta_012);
    console.log("bukti_plagiasi:", sempro.bukti_plagiasi);
    console.log("proposal_ta:", sempro.proposal_ta);
    
    console.log("Metadata hasil konversi:");
    console.log("dokumenTA012:", dokumenTA012);
    console.log("dokumenPlagiarisme:", dokumenPlagiarisme);
    console.log("dokumenDraft:", dokumenDraft);
  }, [sempro]);
  
  // Handle status update
  const handleStatusUpdate = () => {
    updateStatus({
      id: sempro.id,
      status: newStatus,
      catatan: statusNote,
      mahasiswaId: sempro.user_id
    }, {
      onSuccess: () => {
        setShowStatusModal(false);
        setStatusNote('');
      }
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Detail Seminar Proposal</CardTitle>
              <SemproStatusBadge status={sempro.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold">{sempro.pengajuan_ta?.judul || 'Judul Tidak Tersedia'}</h3>
              <div className="flex items-center mt-2">
                <span className="text-sm text-gray-500">
                  Terdaftar pada {formatDate(sempro.created_at)}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500 flex items-center">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Bidang Penelitian
                </p>
                <p>{sempro.pengajuan_ta?.bidang_penelitian || '-'}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Mahasiswa
                </p>
                <p>{sempro.mahasiswa?.nama || '-'} ({sempro.mahasiswa?.nim || '-'})</p>
              </div>
            </div>
            
            <Separator />
            
            {/* Dokumen Section */}
            <div className="space-y-4">
              <h4 className="font-medium">Dokumen</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Form TA-012 */}
                <Card className="bg-gray-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-blue-600" />
                        <h5 className="text-sm font-medium">Form TA-012</h5>
                      </div>
                      {dokumenTA012 && (
                        <a 
                          href={dokumenTA012.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {dokumenTA012?.fileName || 'Tidak tersedia'}
                    </p>
                  </CardContent>
                </Card>
                
                {/* Hasil Cek Plagiarisme */}
                <Card className="bg-gray-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-blue-600" />
                        <h5 className="text-sm font-medium">Hasil Cek Plagiarisme</h5>
                      </div>
                      {dokumenPlagiarisme && (
                        <a 
                          href={dokumenPlagiarisme.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {dokumenPlagiarisme?.fileName || 'Tidak tersedia'}
                    </p>
                  </CardContent>
                </Card>
                
                {/* Draft Proposal */}
                <Card className="bg-gray-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-blue-600" />
                        <h5 className="text-sm font-medium">Draft Proposal</h5>
                      </div>
                      {dokumenDraft && (
                        <a 
                          href={dokumenDraft.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {dokumenDraft?.fileName || 'Tidak tersedia'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* Jadwal section if available */}
            {jadwal && (
              <>
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="font-medium">Jadwal Seminar</h4>
                  
                  <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                    <div className="flex items-center space-x-2 mb-4">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">
                        {formatDate(jadwal.tanggal_sempro)}, {formatTime(jadwal.waktu_mulai)} - {formatTime(jadwal.waktu_selesai)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Ruangan</p>
                        <p className="text-sm">{jadwal.ruangan}</p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Penguji 1</p>
                        <p className="text-sm">{jadwal.penguji1?.nama_dosen || '-'}</p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Penguji 2</p>
                        <p className="text-sm">{jadwal.penguji2?.nama_dosen || '-'}</p>
                      </div>
                    </div>
                    
                    {!jadwal.is_published && (
                      <div className="mt-4 flex items-center text-yellow-600 text-xs">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>Jadwal belum dipublikasikan</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Metadata */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Dibuat: {formatDate(sempro.created_at)}</span>
                {sempro.updated_at && sempro.updated_at !== sempro.created_at && (
                  <span>Diperbarui: {formatDate(sempro.updated_at)}</span>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap justify-between gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/sempro">Kembali</Link>
            </Button>
            
            <div className="flex gap-2">
              {/* Admin actions */}
              {(userRole === 'tendik' || userRole === 'koorpro') && (
                <>
                  {/* Verify button */}
                  {sempro.status === 'registered' && (
                    <Button
                      variant="default"
                      onClick={() => {
                        setNewStatus('verified');
                        setShowStatusModal(true);
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Verifikasi
                    </Button>
                  )}
                  
                  {/* Schedule button */}
                  {sempro.status === 'verified' && (
                    <Button asChild>
                      <Link href={`/dashboard/sempro/schedule/${sempro.id}`}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Jadwalkan
                      </Link>
                    </Button>
                  )}
                  
                  {/* Reject button */}
                  {(sempro.status === 'registered' || sempro.status === 'verified') && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setNewStatus('rejected');
                        setShowStatusModal(true);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Tolak
                    </Button>
                  )}
                  
                  {/* Revision button */}
                  {(sempro.status === 'registered' || sempro.status === 'verified') && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setNewStatus('revision_required');
                        setShowStatusModal(true);
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Minta Revisi
                    </Button>
                  )}
                </>
              )}
            </div>
          </CardFooter>
        </Card>
      </div>
      
      <div>
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <History className="h-5 w-5 mr-2" />
              <CardTitle className="text-base">Riwayat</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[300px] overflow-y-auto pr-4">
              <div className="space-y-4">
                {riwayat && riwayat.length > 0 ? (
                  riwayat.map((item) => (
                    <div key={item.id} className="border-l-2 border-gray-200 pl-4 py-1">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-sm">{item.keterangan}</p>
                        <SemproStatusBadge status={item.status} className="ml-2" />
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-gray-500">
                        <span>{item.user?.name || 'User'}</span>
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div>
                    <p className="text-sm text-gray-500 text-center py-4">
                      Belum ada riwayat
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2">
              {newStatus === 'verified' ? 'Verifikasi' : 
               newStatus === 'rejected' ? 'Tolak' : 'Minta Revisi'} Pendaftaran
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {newStatus === 'verified' ? 
                'Berikan catatan verifikasi jika diperlukan' : 
                'Berikan alasan penolakan atau catatan revisi'}
            </p>
            
            <div className="mb-4">
              <Label htmlFor="status-note">Catatan</Label>
              <Textarea
                id="status-note"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder={
                  newStatus === 'verified' ? 
                  'Catatan verifikasi (opsional)' : 
                  'Jelaskan alasan penolakan atau catatan revisi...'
                }
                className="min-h-[100px] mt-1"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowStatusModal(false)}
              >
                Batal
              </Button>
              <Button 
                variant={newStatus === 'verified' ? "default" : 
                         newStatus === 'rejected' ? "destructive" : "outline"}
                onClick={handleStatusUpdate}
                disabled={isPending || (newStatus !== 'verified' && !statusNote.trim())}
              >
                {isPending ? 'Memproses...' : 
                 newStatus === 'verified' ? 'Verifikasi' : 
                 newStatus === 'rejected' ? 'Tolak' : 'Minta Revisi'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
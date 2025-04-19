// components/sempro/SemproApprovalCard.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Sempro } from '@/types/sempro';
import { supabase } from '@/lib/supabase';

interface SemproApprovalCardProps {
  sempro: Sempro;
  isPembimbing1: boolean;
  isPembimbing2: boolean;
}

export function SemproApprovalCard({ 
  sempro, 
  isPembimbing1, 
  isPembimbing2 
}: SemproApprovalCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [comment, setComment] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  
  // Check if user has already approved
  const isApproved = isPembimbing1 ? sempro.approve_pembimbing_1 : isPembimbing2 ? sempro.approve_pembimbing_2 : false;
  
  // Check if sempro can be approved
  const canApprove = sempro.status === 'completed' && (isPembimbing1 || isPembimbing2);
  
  const handleApprove = async () => {
    if (!user) return;
    
    try {
      setIsApproving(true);
      
      // Determine which approval field to update
      const approvalField = isPembimbing1 ? 'approve_pembimbing_1' : 'approve_pembimbing_2';
      
      // Update the approval in the sempro record
      const { data, error } = await supabase
        .from('sempros')
        .update({ 
          [approvalField]: true 
        })
        .eq('id', sempro.id)
        .select();
      
      if (error) {
        throw error;
      }
      
      // Get pembimbing name
      const { data: profileData } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();
      
      const pembimbingName = profileData?.name || `Pembimbing ${isPembimbing1 ? '1' : '2'}`;
      
      // Add to revision history
      await supabase
        .from('riwayat_pendaftaran_sempros')
        .insert([{
          sempro_id: sempro.id,
          pengajuan_ta_id: sempro.pengajuan_ta_id,
          user_id: user.id,
          status: 'completed',
          keterangan: `Disetujui oleh ${pembimbingName}${comment ? ': ' + comment : ''}`
        }]);
      
      // Send notification to student
      await supabase
        .from('notifikasis')
        .insert([{
          from_user: user.id,
          to_user: sempro.user_id,
          judul: `Persetujuan Pembimbing ${isPembimbing1 ? '1' : '2'}`,
          pesan: `Seminar proposal Anda telah disetujui oleh ${pembimbingName}`,
          is_read: false
        }]);
      
      // Check if both approvals are now complete
      const updatedSempro = data?.[0] || null;
      
      if (updatedSempro && 
          ((isPembimbing1 && updatedSempro.approve_pembimbing_2) || 
           (isPembimbing2 && updatedSempro.approve_pembimbing_1))) {
        
        // Both approvals complete, update status to approved
        await supabase
          .from('sempros')
          .update({ status: 'approved' })
          .eq('id', sempro.id);
        
        // Add final approval to history
        await supabase
          .from('riwayat_pendaftaran_sempros')
          .insert([{
            sempro_id: sempro.id,
            pengajuan_ta_id: sempro.pengajuan_ta_id,
            user_id: user.id,
            status: 'approved',
            keterangan: 'Seminar proposal telah disetujui oleh kedua pembimbing'
          }]);
        
        // Send notification about complete approval
        await supabase
          .from('notifikasis')
          .insert([{
            from_user: user.id,
            to_user: sempro.user_id,
            judul: 'Seminar Proposal Disetujui',
            pesan: 'Seminar proposal Anda telah disetujui oleh kedua pembimbing',
            is_read: false
          }]);
      }
      
      toast({
        title: "Persetujuan Berhasil",
        description: "Anda telah menyetujui seminar proposal ini.",
      });
      
      // Refresh the page to show the updated status
      setTimeout(() => {
        router.refresh();
      }, 1000);
      
    } catch (error) {
      console.error('Error approving sempro:', error);
      toast({
        variant: "destructive",
        title: "Gagal Menyetujui",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat menyetujui sempro.",
      });
    } finally {
      setIsApproving(false);
    }
  };
  
  const handleRequestRevision = () => {
    router.push(`/dashboard/sempro/request-revision/${sempro.id}`);
  };
  
  if (!isPembimbing1 && !isPembimbing2) {
    return null; // Don't render for non-pembimbing
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Persetujuan Pembimbing {isPembimbing1 ? '1' : '2'}</CardTitle>
        <CardDescription>
          {isApproved 
            ? 'Anda telah menyetujui seminar proposal ini' 
            : canApprove 
              ? 'Berikan persetujuan atau minta revisi untuk seminar proposal ini' 
              : 'Seminar proposal harus selesai sebelum dapat disetujui'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isApproved && canApprove && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="comment">Catatan (opsional)</Label>
              <Textarea 
                id="comment" 
                placeholder="Tambahkan catatan persetujuan" 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleRequestRevision}
                variant="outline"
                className="w-full sm:w-auto"
              >
                Minta Revisi
              </Button>
              
              <Button
                onClick={handleApprove}
                className="w-full sm:w-auto"
                disabled={isApproving}
              >
                {isApproving ? 'Sedang menyetujui...' : 'Setujui Sempro'}
              </Button>
            </div>
          </div>
        )}
        
        {isApproved && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-green-800">
              <span className="font-medium">Status:</span> Disetujui
            </p>
          </div>
        )}
        
        {!canApprove && !isApproved && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-yellow-800">
              Seminar proposal harus dalam status "Selesai" sebelum dapat disetujui.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
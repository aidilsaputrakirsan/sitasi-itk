'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

type Notification = {
  id: string;
  from_user: string;
  to_user: string;
  judul: string;
  pesan: string;
  is_read: boolean;
  created_at: string;
};

export function useNotifications(userId: string) {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifikasis')
        .select('*')
        .eq('to_user', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data as Notification[];
    },
    enabled: !!userId,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifikasis')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
      
      return notificationId;
    },
    onSuccess: (_, notificationId) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
// app/dashboard/admin/migrate-profiles/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function MigrateProfilesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isMigrating, setIsMigrating] = useState(false);
  
  // Fetch profiles without role-specific entries
  useEffect(() => {
    const fetchProfiles = async () => {
      if (!user?.roles.includes('tendik') && !user?.roles.includes('koorpro')) {
        return;
      }
      
      setIsLoading(true);
      
      try {
        // Fetch profiles with dosen role but no entry in dosens table
        const { data: dosenProfiles, error: dosenError } = await supabase
          .rpc('get_dosen_profiles_without_entry'); // Custom RPC function
          
        if (dosenError) throw dosenError;
        
        // Similar for other roles...
        
        setProfiles(dosenProfiles || []);
      } catch (error) {
        console.error('Error fetching profiles:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch profiles"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProfiles();
  }, [user, toast]);
  
  // Migration function
  const migrateProfiles = async () => {
    setIsMigrating(true);
    
    try {
      // Migrate each profile
      for (const profile of profiles) {
        if (profile.roles.includes('dosen')) {
          await supabase
            .from('dosens')
            .insert([{
              user_id: profile.id,
              nama_dosen: profile.name,
              nip: profile.username || 'Perlu diisi',
              email: profile.email || 'Perlu diisi'
            }]);
        }
        // Similar for other roles...
      }
      
      toast({
        title: "Migrasi Berhasil",
        description: `${profiles.length} profil berhasil dimigrasi`
      });
      
      // Refresh list
      setProfiles([]);
    } catch (error) {
      console.error('Error migrating profiles:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to migrate profiles"
      });
    } finally {
      setIsMigrating(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Migrasi Profil Pengguna</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Profil yang Perlu Dimigrasi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p>Memuat data...</p>
          ) : profiles.length === 0 ? (
            <p>Tidak ada profil yang perlu dimigrasi</p>
          ) : (
            <>
              <p>Ditemukan {profiles.length} profil yang perlu dimigrasi</p>
              <ul className="list-disc pl-5 space-y-1">
                {profiles.map(profile => (
                  <li key={profile.id}>
                    {profile.name} ({profile.roles.join(', ')})
                  </li>
                ))}
              </ul>
              <Button 
                onClick={migrateProfiles} 
                disabled={isMigrating}
              >
                {isMigrating ? 'Sedang Migrasi...' : 'Migrasi Profil'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
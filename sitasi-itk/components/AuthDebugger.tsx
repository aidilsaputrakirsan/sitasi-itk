'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function AuthDebugger() {
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  
  const checkSession = async () => {
    try {
      // Get session info
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      // Get user if we have a session
      let userData = null;
      let profileData = null;
      
      if (sessionData.session) {
        const { data: user } = await supabase.auth.getUser();
        userData = user;
        
        if (user.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.user.id)
            .single();
          
          profileData = profile;
        }
      }
      
      setSessionInfo({
        hasSession: !!sessionData.session,
        sessionExpiry: sessionData.session?.expires_at 
          ? new Date(sessionData.session.expires_at * 1000).toLocaleString() 
          : null,
        sessionError: sessionError?.message,
        user: userData?.user,
        profile: profileData,
        cookies: document.cookie.split(';').map(c => c.trim())
      });
    } catch (error) {
      console.error("Debug error:", error);
      setSessionInfo({ error: String(error) });
    }
  };
  
  useEffect(() => {
    checkSession();
  }, []);
  
  if (!showDebug) {
    return (
      <button 
        onClick={() => setShowDebug(true)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded-md text-xs"
      >
        Show Auth Debug
      </button>
    );
  }
  
  return (
    <div className="fixed bottom-0 right-0 w-96 max-h-96 overflow-auto bg-gray-800 text-white p-4 rounded-t-md text-xs">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Auth Debugger</h3>
        <div>
          <button 
            onClick={checkSession}
            className="mr-2 bg-blue-600 px-2 py-1 rounded"
          >
            Refresh
          </button>
          <button 
            onClick={() => setShowDebug(false)}
            className="bg-red-600 px-2 py-1 rounded"
          >
            Close
          </button>
        </div>
      </div>
      
      <div className="divide-y divide-gray-700">
        <div className="py-2">
          <p className="font-semibold">Session Status: {sessionInfo?.hasSession ? '✅ Active' : '❌ None'}</p>
          {sessionInfo?.sessionExpiry && (
            <p>Expires: {sessionInfo.sessionExpiry}</p>
          )}
          {sessionInfo?.sessionError && (
            <p className="text-red-400">Error: {sessionInfo.sessionError}</p>
          )}
        </div>
        
        <div className="py-2">
          <p className="font-semibold">User:</p>
          {sessionInfo?.user ? (
            <pre className="whitespace-pre-wrap overflow-auto max-h-20">
              {JSON.stringify({
                id: sessionInfo.user.id,
                email: sessionInfo.user.email,
                role: sessionInfo.user.user_metadata?.role,
              }, null, 2)}
            </pre>
          ) : (
            <p>No user found</p>
          )}
        </div>
        
        <div className="py-2">
          <p className="font-semibold">Profile:</p>
          {sessionInfo?.profile ? (
            <pre className="whitespace-pre-wrap overflow-auto max-h-20">
              {JSON.stringify({
                id: sessionInfo.profile.id,
                name: sessionInfo.profile.name,
                roles: sessionInfo.profile.roles,
              }, null, 2)}
            </pre>
          ) : (
            <p>No profile found</p>
          )}
        </div>
        
        <div className="py-2">
          <p className="font-semibold">Cookies:</p>
          <ul className="list-disc pl-4">
            {sessionInfo?.cookies?.map((cookie: string, i: number) => (
              <li key={i} className="truncate">{cookie}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';

interface PresenceContextType {
  onlineUsers: Set<string>;
  updatePresence: () => void;
}

const PresenceContext = createContext<PresenceContextType | null>(null);

interface PresenceProviderProps {
  children: React.ReactNode;
}

export function PresenceProvider({ children }: PresenceProviderProps) {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    // Update user's last seen when they're active
    const updateLastSeen = async () => {
      await supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', user.id);
    };

    // Initial presence update
    updateLastSeen();

    // Set up periodic presence updates
    const presenceInterval = setInterval(updateLastSeen, 30000); // Update every 30 seconds

    // Update presence on user activity
    const handleActivity = () => {
      updateLastSeen();
    };

    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Subscribe to global presence updates
    const presenceChannel = supabase
      .channel('global-presence')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `last_seen_at=not.is.null`,
        },
        (payload) => {
          updateOnlineUsers();
        }
      )
      .subscribe();

    // Initial load of online users
    updateOnlineUsers();

    // Cleanup
    return () => {
      clearInterval(presenceInterval);
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      presenceChannel.unsubscribe();
      
      // Mark user as offline when leaving
      supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', user.id);
    };
  }, [user]);

  const updateOnlineUsers = async () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .gte('last_seen_at', fiveMinutesAgo);

    if (!error && data) {
      setOnlineUsers(new Set(data.map(profile => profile.id)));
    }
  };

  const updatePresence = async () => {
    if (!user) return;
    
    await supabase
      .from('profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', user.id);
    
    updateOnlineUsers();
  };

  return (
    <PresenceContext.Provider value={{ onlineUsers, updatePresence }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  const context = useContext(PresenceContext);
  if (!context) {
    throw new Error('usePresence must be used within a PresenceProvider');
  }
  return context;
}

// Hook to check if a specific user is online
export function useIsUserOnline(userId: string) {
  const { onlineUsers } = usePresence();
  return onlineUsers.has(userId);
}
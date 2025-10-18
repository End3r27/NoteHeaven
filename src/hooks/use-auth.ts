import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/types/shared";

export function useAuth() {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshProfile = async () => {
    if (!user) return;
    
    console.log('Refreshing profile for user:', user.id);
    
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    
    if (error) {
      console.error('Error refreshing profile:', error);
      return;
    }
    
    if (profile) {
      console.log('Profile refreshed:', profile.profile_pic_url);
      setUser(profile);
      setRefreshKey(prev => prev + 1); // Force component re-renders
    }
  };

  useEffect(() => {
    let mounted = true;

    const fetchUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (mounted) {
          setUser(profile);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading auth state:", error);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT") {
          if (mounted) {
            setUser(null);
          }
        } else if (session?.user) {
          fetchUser();
        }
      }
    );

    fetchUser();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    loading,
    isAuthenticated: !!user,
    refreshProfile,
    refreshKey, // Expose refresh key for forcing re-renders
  };
}
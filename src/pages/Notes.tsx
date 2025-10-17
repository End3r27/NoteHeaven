import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { NotesLayout } from "@/components/notes/NotesLayout";
import { useToast } from "@/hooks/use-toast";

const Notes = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkProfileAndAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate("/auth");
        setLoading(false);
        return;
      }

      setUser(session.user);

      // Check if user has completed profile setup
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_profile_complete')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!profile?.is_profile_complete) {
        navigate("/profile-setup");
        setLoading(false);
        return;
      }

      setLoading(false);
    };

    checkProfileAndAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <NotesLayout user={user} />;
};

export default Notes;

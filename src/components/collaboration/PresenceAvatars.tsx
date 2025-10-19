import { useEffect, useState } from "react";
import type { Profile } from "@/types/profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AnimatePresence, motion } from "framer-motion";
import { Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/components/language/LanguageProvider";

interface PresenceAvatarsProps {
  collaborators: Array<{
    user_id: string;
    permission?: string;
    accepted?: boolean;
  }>;
  type?: "folder" | "note";
  resourceId?: string;
  size?: "xs" | "sm" | "md" | "lg";
  maxVisible?: number;
}

export function PresenceAvatars({ 
  collaborators, 
  type = "note", 
  resourceId,
  size = "md",
  maxVisible = 5
}: PresenceAvatarsProps) {
  const { t, language } = useLanguage();
  const [profiles, setProfiles] = useState<Array<Profile & { isOnline: boolean; lastSeen: string; permission?: string }>>([]);

  // Size configurations
  const sizeClasses = {
    xs: "h-5 w-5",
    sm: "h-6 w-6", 
    md: "h-8 w-8",
    lg: "h-10 w-10"
  };

  const statusDotSizes = {
    xs: "h-1.5 w-1.5",
    sm: "h-2 w-2",
    md: "h-3 w-3", 
    lg: "h-4 w-4"
  };

  useEffect(() => {
    fetchCollaboratorProfiles();
    
    // Subscribe to presence updates if resourceId is provided
    if (resourceId) {
      const subscription = supabase
        .channel(`presence:${resourceId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_presence",
            filter: type === "note" ? `note_id=eq.${resourceId}` : `folder_id=eq.${resourceId}`,
          },
          () => {
            fetchCollaboratorProfiles();
          }
        )
        .subscribe();

      return () => subscription.unsubscribe();
    }
  }, [collaborators, resourceId, type]);

  const fetchCollaboratorProfiles = async () => {
    if (!collaborators.length) return;

    // Update current user's presence first
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      await supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', currentUser.id);
    }

    const userIds = collaborators.map(c => c.user_id);
    
    // Fetch profiles
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .in("id", userIds);

    if (profileError || !profileData) return;

    // Check online status based on last_seen_at and user_presence
    const now = new Date();
    const profilesWithStatus = await Promise.all(
      profileData.map(async (profile) => {
        let isOnline = false;
        let lastSeen = profile.last_seen_at || profile.created_at || "";

        // Get permission for this user from collaborators array
        const collaborator = collaborators.find(c => c.user_id === profile.id);
        const permission = collaborator?.permission;

        // Simplify online detection to use profile.last_seen_at primarily
        if (lastSeen) {
          const lastSeenTime = new Date(lastSeen);
          const diffMinutes = (now.getTime() - lastSeenTime.getTime()) / (1000 * 60);
          isOnline = diffMinutes < 2; // Online if seen within 2 minutes (PresenceProvider updates every 30s)
        }

        return {
          ...profile,
          isOnline,
          lastSeen,
          permission,
        };
      })
    );

    // Sort by online status first, then by last seen
    profilesWithStatus.sort((a, b) => {
      if (a.isOnline !== b.isOnline) {
        return a.isOnline ? -1 : 1; // Online users first
      }
      return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
    });

    setProfiles(profilesWithStatus);
  };

  // Apply maxVisible limit
  const visibleProfiles = profiles.slice(0, maxVisible);
  const remainingCount = profiles.length - maxVisible;

  return (
    <>
      {/* Custom CSS for slow pulse animation */}
      <style>{`
        @keyframes slowPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
      
      <div className="flex -space-x-1">
        <AnimatePresence>
        {visibleProfiles.map((profile) => (
          <motion.div
            key={profile.id}
            initial={{ scale: 0, x: -20 }}
            animate={{ scale: 1, x: 0 }}
            exit={{ scale: 0, x: 20 }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30,
            }}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative inline-block">
                    <Avatar 
                      className={`${sizeClasses[size]} border-2 transition-all duration-300 ${
                        profile.isOnline 
                          ? 'ring-1 ring-green-400 ring-offset-1 shadow-[0_0_4px_rgba(34,197,94,0.5)]' 
                          : 'border-background'
                      }`}
                      style={{
                        borderColor: profile.favorite_color || "#3b82f6",
                        filter: profile.isOnline 
                          ? `drop-shadow(0 0 6px ${profile.favorite_color || "#3b82f6"})`
                          : "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
                        animation: profile.isOnline ? 'slowPulse 3s ease-in-out infinite' : 'none'
                      }}
                    >
                      <AvatarImage
                        src={profile.profile_pic_url || undefined}
                        alt={profile.nickname || ""}
                      />
                      <AvatarFallback
                        style={{
                          backgroundColor: profile.favorite_color || "#3b82f6",
                          color: "#ffffff",
                        }}
                      >
                        {profile.nickname?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Crown icon for owners */}
                    {profile.permission === 'owner' && (
                      <div className="absolute -top-1 -left-1">
                        <Crown 
                          className={`${
                            size === 'xs' ? 'h-3 w-3' : 
                            size === 'sm' ? 'h-3.5 w-3.5' : 
                            size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
                          } text-yellow-500 fill-yellow-400 drop-shadow-sm`} 
                        />
                      </div>
                    )}

                    {/* Online status indicator */}
                    <span 
                      className={`absolute -right-0.5 -top-0.5 block ${statusDotSizes[size]} rounded-full border-2 border-background ${
                        profile.isOnline 
                          ? 'bg-green-500' 
                          : 'bg-gray-400'
                      }`}
                      style={{
                        animation: profile.isOnline ? 'slowPulse 2s ease-in-out infinite' : 'none'
                      }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <div className="text-sm">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{profile.nickname || "Anonymous"}</p>
                      {profile.permission === 'owner' && (
                        <Crown className="h-3 w-3 text-yellow-500 fill-yellow-400" />
                      )}
                      <span 
                        className={`h-2 w-2 rounded-full ${
                          profile.isOnline ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                      />
                    </div>
                    {profile.bio && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {profile.bio}
                      </p>
                    )}
                    {profile.permission && (
                      <p className="mt-1 text-xs text-muted-foreground capitalize">
                        {profile.permission}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {profile.isOnline 
                        ? t("presence.online_now") 
                        : t("presence.last_seen").replace("{time}", new Date(profile.lastSeen).toLocaleString(language === "it" ? "it-IT" : "en-US"))
                      }
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </motion.div>
        ))}
        
        {/* Show remaining count if there are more users */}
        {remainingCount > 0 && (
          <motion.div
            initial={{ scale: 0, x: -20 }}
            animate={{ scale: 1, x: 0 }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30,
            }}
          >
            <div 
              className={`${sizeClasses[size]} border-2 border-muted-foreground bg-muted rounded-full flex items-center justify-center text-xs font-medium text-muted-foreground`}
            >
              +{remainingCount}
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </>
  );
}
import { useEffect, useState } from "react";
import type { Profile } from "@/types/profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

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
  const [profiles, setProfiles] = useState<Array<Profile & { isOnline: boolean; lastSeen: string }>>([]);

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

        // Check if user has active presence
        if (resourceId) {
          const { data: presenceData } = await supabase
            .from("user_presence")
            .select("last_seen, is_active")
            .eq("user_id", profile.id)
            .eq(type === "note" ? "note_id" : "folder_id", resourceId)
            .maybeSingle();

          if (presenceData) {
            lastSeen = presenceData.last_seen || lastSeen;
            const lastSeenTime = new Date(lastSeen);
            const diffMinutes = (now.getTime() - lastSeenTime.getTime()) / (1000 * 60);
            isOnline = presenceData.is_active && diffMinutes < 5; // Online if active and seen within 5 minutes
          }
        } else {
          // Fall back to profile last_seen_at
          if (lastSeen) {
            const lastSeenTime = new Date(lastSeen);
            const diffMinutes = (now.getTime() - lastSeenTime.getTime()) / (1000 * 60);
            isOnline = diffMinutes < 5;
          }
        }

        return {
          ...profile,
          isOnline,
          lastSeen,
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
                          ? 'ring-1 ring-green-400 ring-offset-1 shadow-[0_0_4px_rgba(34,197,94,0.5)] animate-pulse' 
                          : 'border-background'
                      }`}
                      style={{
                        borderColor: profile.favorite_color || "#3b82f6",
                        filter: profile.isOnline 
                          ? `drop-shadow(0 0 6px ${profile.favorite_color || "#3b82f6"})`
                          : "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
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
                    
                    {/* Online status indicator */}
                    <span 
                      className={`absolute -right-0.5 -top-0.5 block ${statusDotSizes[size]} rounded-full border-2 border-background ${
                        profile.isOnline 
                          ? 'bg-green-500 animate-pulse' 
                          : 'bg-gray-400'
                      }`} 
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <div className="text-sm">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{profile.nickname || "Anonymous"}</p>
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
                    <p className="mt-1 text-xs text-muted-foreground">
                      {profile.isOnline 
                        ? "Online now" 
                        : `Last seen ${new Date(profile.lastSeen).toLocaleString()}`
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
  );
}
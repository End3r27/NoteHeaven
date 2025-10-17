import { useEffect, useState } from "react";
import type { Profile } from "@/types/profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AnimatePresence, motion } from "framer-motion";

interface PresenceAvatarsProps {
  users: Array<{
    user: Profile;
    lastSeen: string;
  }>;
}

export function PresenceAvatars({ users }: PresenceAvatarsProps) {
  const [sortedUsers, setSortedUsers] = useState(users);

  // Sort users by last seen and keep array stable
  useEffect(() => {
    setSortedUsers(
      [...users].sort((a, b) => 
        new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
      )
    );
  }, [users]);

  return (
    <div className="flex -space-x-2">
      <AnimatePresence>
        {sortedUsers.map(({ user }) => (
          <motion.div
            key={user.id}
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
                  <div
                    className="relative inline-block"
                    style={{
                      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
                    }}
                  >
                    <Avatar className="h-8 w-8 border-2 border-background">
                      <AvatarImage
                        src={user.profile_pic_url || undefined}
                        alt={user.nickname || ""}
                      />
                      <AvatarFallback
                        style={{
                          backgroundColor: user.favorite_color || undefined,
                          color: "#ffffff",
                        }}
                      >
                        {user.nickname?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute right-0 top-0 block h-2.5 w-2.5 rounded-full border-2 border-background bg-green-500" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <div className="text-sm">
                    <p className="font-medium">{user.nickname}</p>
                    {user.bio && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {user.bio}
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
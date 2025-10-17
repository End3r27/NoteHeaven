import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/language/LanguageProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
type NotificationRow = Tables["notifications"]["Row"];
type NotificationUpdate = Tables["notifications"]["Update"];
type Notification = NotificationRow & {
  actor_profile: {
    nickname: string | null;
  } | null;
};

export function NotificationsMenu() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();
  const { t, language } = useLanguage();

  useEffect(() => {
    fetchNotifications();
    const cleanup = subscribeToNotifications();
    return cleanup;
  }, []);

  const fetchNotifications = async () => {
    try {
      const query = supabase
        .from('notifications')
        .select(`
          id,
          user_id,
          type,
          title,
          content,
          resource_id,
          resource_type,
          actor_id,
          is_read,
          created_at,
          actor_profile:profiles!notifications_actor_id_fkey(nickname)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      const { data, error } = await query;

      if (error) throw error;
      if (!data) return;

      setNotifications(data as Notification[]);
      setUnreadCount(data.filter(n => !n.is_read).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast({
        variant: "destructive",
        title: t("notifications.error.fetch.title") || "Error",
        description: t("notifications.error.fetch.description") || "Could not fetch notifications",
      });
    }
  };

  const subscribeToNotifications = () => {
    const channel = supabase
      .channel("notifications_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.is_read) return;

    try {
      // First update the local state for instant feedback
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Then update in the database
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true } as NotificationUpdate)
        .eq('id', notification.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast({
        variant: "destructive",
        title: t("notifications.error.mark_read.title") || "Error",
        description: t("notifications.error.mark_read.description") || "Could not mark notification as read",
      });

      // Revert the optimistic update
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id ? { ...n, is_read: false } : n
        )
      );
      setUnreadCount(prev => prev + 1);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return `${days}d ago`;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-8 w-8 rounded-full"
          size="icon"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
              {unreadCount}
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel>
          {t("notifications.recent") || "Recent Notifications"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup className="max-h-[400px] overflow-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {t("notifications.empty") || "No notifications"}
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  "flex flex-col items-start gap-1 p-4",
                  !notification.is_read && "bg-muted/50"
                )}
                onClick={() => handleMarkAsRead(notification)}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="font-medium">{notification.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(notification.created_at)}
                  </span>
                </div>
                {notification.content && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {notification.content}
                  </p>
                )}
                {notification.actor_profile?.nickname && (
                  <span className="text-xs text-muted-foreground">
                    {`${t("notifications.by")}: ${notification.actor_profile.nickname}`}
                  </span>
                )}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
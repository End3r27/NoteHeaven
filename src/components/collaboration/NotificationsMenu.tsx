import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import type { Notification } from "@/types/shared";
import { getNotifications, markAsRead, subscribeToNotifications } from "@/lib/notifications";

export function NotificationsMenu() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    const fetchNotificationsData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const notificationsData = await getNotifications(user.id);
        setNotifications(notificationsData);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotificationsData();

    // Subscribe to new notifications
    let subscription: ReturnType<typeof subscribeToNotifications>;
    const setupSubscription = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      subscription = subscribeToNotifications(user.id, fetchNotificationsData);
    };

    setupSubscription();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleMarkAsRead = async (id: string) => {
    const success = await markAsRead(id);

    if (success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          onClick={() => setOpen(true)}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={cn(
                "flex items-start gap-3 p-4",
                !notification.is_read && "bg-muted/50"
              )}
              onClick={() => handleMarkAsRead(notification.id)}
            >
              {notification.actor && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage
                    src={notification.actor.profile_pic_url || undefined}
                    alt={notification.actor.nickname || ""}
                  />
                  <AvatarFallback
                    style={{
                      backgroundColor: notification.actor.favorite_color || undefined,
                    }}
                  >
                    {notification.actor.nickname?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="flex-1 space-y-1">
                <p className="text-sm">{notification.title}</p>
                {notification.content && (
                  <p className="text-xs text-muted-foreground">
                    {notification.content}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client'; 
import { useAuth } from '@/hooks/use-auth';
import { Notification } from '@/types/notifications';
import { Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export const NotificationsMenu = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
      } else {
        setNotifications(data as Notification[]);
      }
    };

    fetchNotifications();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
    } else {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
        console.error('Error marking all notifications as read:', error);
    } else {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 justify-center rounded-full p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
                    <Check className="mr-2 h-4 w-4" />
                    Mark all as read
                </Button>
            )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No new notifications.
          </p>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={`flex flex-col items-start gap-1 p-2 ${
                !notification.is_read ? 'bg-secondary' : ''
              }`}
              onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
            >
              <p className="text-sm font-medium">{notification.message}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(notification.created_at).toLocaleString()}
              </p>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

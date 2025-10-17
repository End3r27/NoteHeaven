import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client'; 
import { useAuth } from '@/hooks/use-auth';
import { Bell, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  user_id: string;
  sender_id: string;
  type: string;
  title: string;
  content?: string;
  resource_id?: string;
  resource_type?: string;
  is_read: boolean;
  created_at: string;
}

export const NotificationsMenu = () => {
  const { user } = useAuth();
  const { toast } = useToast();
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

  const handleAcceptInvite = async (notification: Notification) => {
    if (!notification.resource_id || !notification.resource_type) return;

    if (notification.resource_type === 'note') {
      const { error } = await supabase
        .from('shared_notes')
        .update({ accepted: true })
        .eq('note_id', notification.resource_id)
        .eq('user_id', user?.id);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to accept invitation',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Invitation accepted',
          description: 'You can now access this note'
        });
        handleMarkAsRead(notification.id);
      }
    } else if (notification.resource_type === 'folder') {
      const { error } = await supabase
        .from('shared_folders')
        .update({ accepted: true })
        .eq('folder_id', notification.resource_id)
        .eq('user_id', user?.id);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to accept invitation',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Invitation accepted',
          description: 'You can now access this folder'
        });
        handleMarkAsRead(notification.id);
      }
    }
  };

  const handleDeclineInvite = async (notification: Notification) => {
    if (!notification.resource_id || !notification.resource_type) return;

    if (notification.resource_type === 'note') {
      const { error } = await supabase
        .from('shared_notes')
        .delete()
        .eq('note_id', notification.resource_id)
        .eq('user_id', user?.id);

      if (!error) {
        toast({
          title: 'Invitation declined',
          description: 'The invitation has been removed'
        });
        handleMarkAsRead(notification.id);
      }
    } else if (notification.resource_type === 'folder') {
      const { error } = await supabase
        .from('shared_folders')
        .delete()
        .eq('folder_id', notification.resource_id)
        .eq('user_id', user?.id);

      if (!error) {
        toast({
          title: 'Invitation declined',
          description: 'The invitation has been removed'
        });
        handleMarkAsRead(notification.id);
      }
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
      <DropdownMenuContent align="end" className="w-96">
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
            <div
              key={notification.id}
              className={`p-3 border-b last:border-b-0 ${
                !notification.is_read ? 'bg-secondary/50' : ''
              }`}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{notification.title}</p>
                    {notification.content && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.content}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {notification.type === 'share_invite' && notification.resource_id && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptInvite(notification)}
                      className="flex-1"
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeclineInvite(notification)}
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
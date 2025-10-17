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
  sender?: {
    nickname: string;
  };
}

const getSenderName = (n: any) => {
  // Try sender object first, then fallback to default
  return n?.sender?.nickname || 'Someone';
};

const getResource = (n: any) => {
  // Use the unified schema fields directly
  const id = n?.resource_id || null;
  const type = n?.resource_type || null;
  return { id, type } as { id: string | null; type: 'note' | 'folder' | null };
};

const isInvite = (n: any) => String(n?.type || '').includes('invite');

const getNotificationBody = (n: any) => {
  // First, try the content field from unified schema
  if (n?.content && n.content.trim().length > 0) {
    return n.content as string;
  }
  
  // If no content but it's an invite, construct a message
  if (isInvite(n)) {
    const who = getSenderName(n);
    const { type } = getResource(n);
    const where = type === 'folder' ? 'folder' : type === 'note' ? 'note' : 'resource';
    return `${who} invited you to collaborate on the ${where}.`;
  }
  
  // Default messages based on type
  const t = String(n?.type || '');
  if (t === 'new_comment') return 'You have a new comment.';
  if (t === 'comment_reply') return 'Someone replied to your comment.';
  if (t === 'edit') return 'Your shared content was edited.';
  if (t === 'share_accept') return 'Your invitation was accepted.';
  if (t === 'note_fork') return 'Your note has been forked.';
  
  // Fallback to title if available
  if (n?.title && n.title.trim().length > 0) {
    return n.title;
  }
  
  // Last resort fallback
  return 'You have a new notification';
};

export const NotificationsMenu = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id, user_id, sender_id, type, title, content, resource_id, resource_type, is_read, created_at,
          sender:profiles!notifications_sender_id_fkey(nickname)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
      } else {
        setNotifications(data || []);
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
        async (payload) => {
          try {
            const { data, error } = await supabase
              .from('notifications')
              .select(`
                id, user_id, sender_id, type, title, content, resource_id, resource_type, is_read, created_at,
                sender:profiles!notifications_sender_id_fkey(nickname)
              `)
              .eq('id', (payload.new as any).id)
              .single();

            if (!error && data) {
              setNotifications((prev) => [data as any, ...prev]);
            } else {
              // Fallback to raw payload if refetch fails
              setNotifications((prev) => [payload.new as Notification, ...prev]);
            }
          } catch (e) {
            setNotifications((prev) => [payload.new as Notification, ...prev]);
          }
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

  const handleAcceptInvite = async (notification: any) => {
    const { id, type } = getResource(notification);
    if (!id || !type) return;

    let error = null as any;
    if (type === 'note') {
      ({ error } = await supabase
        .from('shared_notes')
        .update({ accepted: true })
        .eq('note_id', id)
        .eq('user_id', user?.id));
    } else if (type === 'folder') {
      ({ error } = await supabase
        .from('shared_folders')
        .update({ accepted: true })
        .eq('folder_id', id)
        .eq('user_id', user?.id));
    }

    if (error) {
      toast({ title: 'Error', description: 'Failed to accept invitation', variant: 'destructive' });
      return;
    }

    // Delete the notification after successful action
    await supabase.from('notifications').delete().eq('id', notification.id);
    // Optimistically remove it from UI
    setNotifications((prev) => prev.filter((n) => n.id !== notification.id));

    toast({ title: 'Invitation accepted', description: `Access granted to the ${type}.` });
  };

  const handleDeclineInvite = async (notification: any) => {
    const { id, type } = getResource(notification);
    if (!id || !type) return;

    let error = null as any;
    if (type === 'note') {
      ({ error } = await supabase
        .from('shared_notes')
        .delete()
        .eq('note_id', id)
        .eq('user_id', user?.id));
    } else if (type === 'folder') {
      ({ error } = await supabase
        .from('shared_folders')
        .delete()
        .eq('folder_id', id)
        .eq('user_id', user?.id));
    }

    if (error) {
      toast({ title: 'Error', description: 'Failed to decline invitation', variant: 'destructive' });
      return;
    }

    // Delete the notification after successful decline
    await supabase.from('notifications').delete().eq('id', notification.id);
    setNotifications((prev) => prev.filter((n) => n.id !== notification.id));

    toast({ title: 'Invitation declined', description: 'The invitation has been removed' });
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
                    <p className="text-sm font-medium">
                      {notification.title ||
                        (isInvite(notification)
                          ? 'Invitation to collaborate'
                          : String(notification.type || '').replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ||
                            'Notification')}
                    </p>
                    {(() => {
                      const body = getNotificationBody(notification as Notification);
                      return body ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          {body}
                        </p>
                      ) : null;
                    })()}
                    {notification.sender?.nickname && (
                      <p className="text-xs text-muted-foreground mt-1">
                        From: {notification.sender.nickname}
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
                {isInvite(notification) && getResource(notification).id && (
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
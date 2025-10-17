import { useEffect, useState } from 'react';
import { Clock, MessageCircle, Edit, UserPlus, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface ActivityItem {
  id: string;
  type: 'comment' | 'edit' | 'invite' | 'create';
  user: {
    nickname: string;
    favoriteColor: string;
  };
  noteTitle?: string;
  content?: string;
  timestamp: string;
}

interface ActivityFeedProps {
  noteId?: string;
}

export const ActivityFeed = ({ noteId }: ActivityFeedProps) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
    subscribeToActivities();
  }, [noteId]);

  const fetchActivities = async () => {
    setLoading(true);
    const items: ActivityItem[] = [];

    // Fetch recent comments
    const { data: comments } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        created_at,
        note_id,
        user:profiles(nickname, favorite_color),
        note:notes(title)
      `)
      .eq(noteId ? 'note_id' : 'id', noteId || '')
      .order('created_at', { ascending: false })
      .limit(10);

    if (comments) {
      comments.forEach((comment: any) => {
        items.push({
          id: comment.id,
          type: 'comment',
          user: {
            nickname: comment.user?.nickname || 'Unknown',
            favoriteColor: comment.user?.favorite_color || '#3b82f6',
          },
          noteTitle: comment.note?.title,
          content: comment.content,
          timestamp: comment.created_at,
        });
      });
    }

    // Sort by timestamp
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setActivities(items.slice(0, 20));
    setLoading(false);
  };

  const subscribeToActivities = () => {
    const channel = supabase
      .channel('activity-feed')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return <MessageCircle className="h-4 w-4" />;
      case 'edit':
        return <Edit className="h-4 w-4" />;
      case 'invite':
        return <UserPlus className="h-4 w-4" />;
      case 'create':
        return <FileText className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActivityText = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'comment':
        return (
          <>
            <span className="font-medium">{activity.user.nickname}</span>
            {' commented'}
            {activity.noteTitle && (
              <>
                {' on '}
                <span className="font-medium">{activity.noteTitle}</span>
              </>
            )}
          </>
        );
      case 'edit':
        return (
          <>
            <span className="font-medium">{activity.user.nickname}</span>
            {' edited'}
            {activity.noteTitle && (
              <>
                {' '}
                <span className="font-medium">{activity.noteTitle}</span>
              </>
            )}
          </>
        );
      case 'invite':
        return (
          <>
            <span className="font-medium">{activity.user.nickname}</span>
            {' invited you to collaborate'}
          </>
        );
      case 'create':
        return (
          <>
            <span className="font-medium">{activity.user.nickname}</span>
            {' created'}
            {activity.noteTitle && (
              <>
                {' '}
                <span className="font-medium">{activity.noteTitle}</span>
              </>
            )}
          </>
        );
      default:
        return 'Activity';
    }
  };

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="p-4 space-y-3">
            {loading ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                Loading activities...
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                No recent activity
              </div>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <Avatar
                    className="h-8 w-8 flex items-center justify-center text-white text-xs font-medium shrink-0"
                    style={{ backgroundColor: activity.user.favoriteColor }}
                  >
                    {activity.user.nickname[0].toUpperCase()}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      {getActivityText(activity)}
                    </div>
                    {activity.content && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {activity.content}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className="h-5 text-xs"
                        style={{
                          borderColor: activity.user.favoriteColor,
                          color: activity.user.favoriteColor,
                        }}
                      >
                        {getActivityIcon(activity.type)}
                        <span className="ml-1">{activity.type}</span>
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {getRelativeTime(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
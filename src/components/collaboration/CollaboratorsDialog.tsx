import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Search, Trash2, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sendNotification } from '@/lib/notifications';
import { useLanguage } from '@/components/language/LanguageProvider';
import { PresenceAvatars } from './PresenceAvatars';

interface Collaborator {
  id: string;
  userId: string;
  permission: 'viewer' | 'editor';
  accepted: boolean;
  user: {
    nickname: string;
    avatarUrl?: string;
    favoriteColor: string;
  };
}

interface CollaboratorsDialogProps {
  noteId: string;
  noteTitle: string;
}

export const CollaboratorsDialog = ({ noteId, noteTitle }: CollaboratorsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPermission, setSelectedPermission] = useState<'viewer' | 'editor'>('editor');
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    if (open) {
      fetchCollaborators();
    }
  }, [open, noteId]);

  const fetchCollaborators = async () => {
    const { data, error } = await supabase
      .from('shared_notes')
      .select('*')
      .eq('note_id', noteId);

    if (!error && data) {
      const rows = data as any[];
      const resolved = rows.map((c) => ({
        id: c.id,
        userId: c.user_id || c.shared_with,
        permission: c.permission || c.role || 'viewer',
        accepted: Boolean(c.accepted),
      }));

      const userIds = resolved.map((r) => r.userId).filter(Boolean);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nickname, profile_pic_url, favorite_color')
        .in('id', userIds);

      const pMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      setCollaborators(
        resolved.map((r) => ({
          id: r.id,
          userId: r.userId,
          permission: r.permission,
          accepted: r.accepted,
          user: {
            nickname: pMap.get(r.userId)?.nickname || 'Unknown',
            avatarUrl: pMap.get(r.userId)?.profile_pic_url,
            favoriteColor: pMap.get(r.userId)?.favorite_color || '#3b82f6',
          },
        }))
      );
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, nickname, profile_pic_url, favorite_color')
      .ilike('nickname', `%${searchQuery}%`)
      .limit(5);

    if (!error && data) {
      // Filter out users already collaborating
      const existingUserIds = new Set(collaborators.map(c => c.userId));
      setSearchResults(data.filter(u => !existingUserIds.has(u.id)));
    }
  };

const handleInvite = async (userId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  if (userId === user.id) {
    toast({
      title: 'Invalid invite',
      description: 'You cannot invite yourself.',
      variant: 'destructive',
    });
    return;
  }

  try {
    // Try shared_with schema first, then fallback to user_id schema
    let inviteError = null as any;
    let res = await supabase
      .from('shared_notes')
      .upsert(
        {
          note_id: noteId,
          shared_by: user.id,
          shared_with: userId,
          permission: selectedPermission,
          accepted: false,
        } as any,
        { onConflict: 'note_id,shared_with' }
      );
    inviteError = res.error;
    if (inviteError) {
      res = await supabase
        .from('shared_notes')
        .upsert(
          {
            note_id: noteId,
            invited_by: user.id,
            user_id: userId,
            permission: selectedPermission,
            accepted: false,
          } as any,
          { onConflict: 'note_id,user_id' }
        );
      inviteError = res.error;
    }

    if (inviteError) {
      throw new Error('Failed to create share invitation');
    }

    // Get sender's profile information
    const { data: profile } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', user.id)
      .single();

    const senderName = profile?.nickname || 'A user';

    // Create notification with all required fields
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        sender_id: user.id,
        type: 'share_invite',
        title: 'Note invitation',
        content: `${senderName} invited you to collaborate on the note: "${noteTitle}"`,
        resource_id: noteId,
        resource_type: 'note',
        is_read: false
      })
      .select()
      .single();

    if (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Don't fail the whole operation if notification fails
      toast({
        title: "Invitation sent with warning",
        description: "The user was invited but notification failed to deliver",
        variant: "default",
      });
    } else {
      console.log('Notification created successfully:', notification);
      toast({
        title: 'Invitation sent!',
        description: 'The user will be notified',
      });
    }

    setSearchQuery('');
    setSearchResults([]);
    fetchCollaborators();
  } catch (error: any) {
    console.error('Error in handleInvite:', error);
    toast({
      title: 'Error',
      description: error.message || 'Failed to invite user',
      variant: 'destructive',
    });
  }
};

// Add this inside your CollaboratorsDialog component, near the other handlers

const handleRemove = async (collabId: string) => {
  try {
    const { error } = await supabase
      .from('shared_notes')
      .delete()
      .eq('id', collabId);

    if (error) throw error;

    // Optionally: also delete related notifications
    await supabase
      .from('notifications')
      .delete()
      .eq('resource_id', noteId)
      .eq('user_id', collaborators.find(c => c.id === collabId)?.userId);

    toast({
      title: 'Collaborator removed',
      description: 'Access to this note has been revoked.',
    });

    fetchCollaborators(); // Refresh list
  } catch (error: any) {
    console.error('Failed to remove collaborator:', error);
    toast({
      title: 'Error removing collaborator',
      description: error.message || 'Please try again.',
      variant: 'destructive',
    });
  }
};

const handlePermissionChange = async (collabId: string, newPermission: 'viewer' | 'editor') => {
  try {
    const { error } = await supabase
      .from('shared_notes')
      .update({ permission: newPermission })
      .eq('id', collabId);

    if (error) throw error;

    toast({
      title: 'Permission updated',
      description: `Now ${newPermission}.`,
    });

    fetchCollaborators();
  } catch (error: any) {
    console.error('Failed to update permission:', error);
    toast({
      title: 'Error updating permission',
      description: error.message || 'Please try again.',
      variant: 'destructive',
    });
  }
};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          {t('collaboration.manage_collaborators')}
          {collaborators.length > 0 && (
            <PresenceAvatars 
              collaborators={collaborators.map(c => ({ user_id: c.userId, permission: c.permission, accepted: c.accepted }))}
              type="note"
              resourceId={noteId}
              size="xs"
              maxVisible={3}
            />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t('collaboration.manage_collaborators')}</span>
            {collaborators.length > 0 && (
              <PresenceAvatars 
                collaborators={collaborators.map(c => ({ user_id: c.userId, permission: c.permission, accepted: c.accepted }))}
                type="note"
                resourceId={noteId}
              />
            )}
          </DialogTitle>
          <DialogDescription>
            {t('collaboration.invite_people').replace('{title}', noteTitle)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and invite */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder={t('collaboration.search_nickname')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Select
                value={selectedPermission}
                onValueChange={(v) => setSelectedPermission(v as 'viewer' | 'editor')}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">{t('collaboration.viewer')}</SelectItem>
                  <SelectItem value="editor">{t('collaboration.editor')}</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSearch} size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="p-2 flex items-center justify-between hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar
                        className="h-8 w-8 flex items-center justify-center text-white text-xs font-medium"
                        style={{ backgroundColor: user.favorite_color }}
                      >
                        {user.nickname[0].toUpperCase()}
                      </Avatar>
                      <span className="text-sm font-medium">{user.nickname}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleInvite(user.id)}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Current collaborators */}
          {collaborators.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Current Collaborators</p>
              <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                {collaborators.map((collab) => (
                  <div
                    key={collab.id}
                    className="p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        className="h-8 w-8 flex items-center justify-center text-white text-xs font-medium"
                        style={{ backgroundColor: collab.user.favoriteColor }}
                      >
                        {collab.user.nickname[0].toUpperCase()}
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{collab.user.nickname}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Select
                            value={collab.permission}
                            onValueChange={(v) =>
                              handlePermissionChange(collab.id, v as 'viewer' | 'editor')
                            }
                          >
                            <SelectTrigger className="h-6 text-xs w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="viewer">{t('collaboration.viewer')}</SelectItem>
                              <SelectItem value="editor">{t('collaboration.editor')}</SelectItem>
                            </SelectContent>
                          </Select>
                          {!collab.accepted && (
                            <Badge variant="outline" className="text-xs">
                              Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemove(collab.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
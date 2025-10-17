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

  useEffect(() => {
    if (open) {
      fetchCollaborators();
    }
  }, [open, noteId]);

  const fetchCollaborators = async () => {
    const { data, error } = await supabase
      .from('shared_notes')
      .select(`
        id,
        user_id,
        permission,
        accepted,
        user:profiles!shared_notes_user_id_fkey(nickname, profile_pic_url, favorite_color)
      `)
      .eq('note_id', noteId);

    if (!error && data) {
      setCollaborators(
        data.map((c: any) => ({
          id: c.id,
          userId: c.user_id,
          permission: c.permission,
          accepted: c.accepted,
          user: {
            nickname: c.user?.nickname || 'Unknown',
            avatarUrl: c.user?.profile_pic_url,
            favoriteColor: c.user?.favorite_color || '#3b82f6',
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

    const { error } = await supabase.from('shared_notes').insert({
      note_id: noteId,
      invited_by: user.id,
      user_id: userId,
      permission: selectedPermission,
      accepted: false,
    });

    if (error) {
      if (error.code === '23505') {
        toast({
          title: 'Already invited',
          description: 'This user is already a collaborator',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to invite user',
          variant: 'destructive',
        });
      }
      return;
    }

    // Create notification
    try {
      const senderName = user.user_metadata?.full_name || 'A user';
      await sendNotification(supabase, {
        userId: userId,
        senderId: user.id,
        type: 'invite',
        message: `${senderName} invited you to collaborate on the note: "${noteTitle}"`,
        data: {
          noteId: noteId,
          senderName: senderName,
        },
      });
    } catch (notificationError) {
        console.error('Failed to send notification', notificationError);
        toast({
            title: "Notification failed",
            description: "The invitation was sent, but the notification could not be delivered.",
            variant: "destructive",
        });
    }

    toast({
      title: 'Invitation sent!',
      description: 'The user will be notified',
    });

    setSearchQuery('');
    setSearchResults([]);
    fetchCollaborators();
  };

  const handleRemove = async (shareId: string) => {
    const { error } = await supabase.from('shared_notes').delete().eq('id', shareId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove collaborator',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Removed',
      description: 'Collaborator removed from note',
    });

    fetchCollaborators();
  };

  const handlePermissionChange = async (shareId: string, permission: 'viewer' | 'editor') => {
    const { error } = await supabase
      .from('shared_notes')
      .update({ permission })
      .eq('id', shareId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update permission',
        variant: 'destructive',
      });
      return;
    }

    fetchCollaborators();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="h-4 w-4 mr-2" />
          Collaborators
          {collaborators.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {collaborators.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Collaborators</DialogTitle>
          <DialogDescription>
            Invite people to collaborate on "{noteTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and invite */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Search by nickname..."
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
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
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
                              <SelectItem value="viewer">Viewer</SelectItem>
                              <SelectItem value="editor">Editor</SelectItem>
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
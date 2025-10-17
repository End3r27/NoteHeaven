import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Share2, Copy, Check, User, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface ShareNoteDialogProps {
  noteId: string;
  isPublic: boolean;
  publicUuid: string | null;
  onTogglePublic: (isPublic: boolean) => void;
}

interface SharedUser {
  id: string;
  user_id: string;
  permission: string;
  accepted: boolean;
  user_profiles: {
    nickname: string;
    favorite_color: string;
  };
}

export function ShareNoteDialog({ noteId, isPublic, publicUuid, onTogglePublic }: ShareNoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [selectedPermission, setSelectedPermission] = useState<"viewer" | "editor">("viewer");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const loadSharedUsers = async () => {
    const { data, error } = await supabase
      .from('shared_notes')
      .select('id, user_id, permission, accepted')
      .eq('note_id', noteId);

    if (!error && data) {
      // Fetch user profiles separately
      const userIds = data.map(d => d.user_id);
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, nickname, favorite_color')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      const enrichedData = data.map(share => ({
        ...share,
        user_profiles: profileMap.get(share.user_id) || { nickname: 'Unknown', favorite_color: '#gray' }
      }));

      setSharedUsers(enrichedData as SharedUser[]);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, nickname, favorite_color')
      .ilike('nickname', `%${searchQuery}%`)
      .limit(5);

    if (!error && data) {
      setSearchResults(data);
    }
  };

  const handleShareWithUser = async (userId: string) => {
    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser.user) return;

    const { error } = await supabase
      .from('shared_notes')
      .insert({
        note_id: noteId,
        user_id: userId,
        permission: selectedPermission,
        invited_by: currentUser.user.id,
        accepted: false
      });

    if (error) {
      if (error.code === '23505') {
        toast({
          title: "Already shared",
          description: "This note is already shared with this user",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to share note",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Invite sent!",
        description: "The user will be notified"
      });
      setSearchQuery("");
      setSearchResults([]);
      loadSharedUsers();
    }
  };

  const handleRemoveUser = async (shareId: string) => {
    const { error } = await supabase
      .from('shared_notes')
      .delete()
      .eq('id', shareId);

    if (!error) {
      toast({
        title: "Removed",
        description: "User removed from note"
      });
      loadSharedUsers();
    }
  };

  const copyPublicLink = () => {
    if (!publicUuid) return;
    const url = `${window.location.origin}/#/shared/${publicUuid}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Link copied!",
      description: "Share this link with anyone"
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen) loadSharedUsers();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Note</DialogTitle>
          <DialogDescription>
            Collaborate with others or create a public link
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Public Link Toggle */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="space-y-0.5">
              <Label>Public Link</Label>
              <p className="text-xs text-muted-foreground">
                Anyone with the link can view
              </p>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={onTogglePublic}
            />
          </div>

          {isPublic && publicUuid && (
            <div className="p-3 border rounded-lg space-y-2">
              <Label className="text-xs">Share this link</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/#/shared/${publicUuid}`}
                  className="text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyPublicLink}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* Share with specific users */}
          <div className="space-y-2">
            <Label>Share with users</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Search by nickname..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Select value={selectedPermission} onValueChange={(v) => setSelectedPermission(v as "viewer" | "editor")}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSearch} size="sm">
                Search
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                {searchResults.map((user) => (
                  <div key={user.user_id} className="p-2 flex items-center justify-between hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                        style={{ backgroundColor: user.favorite_color }}
                      >
                        {user.nickname[0].toUpperCase()}
                      </div>
                      <span className="text-sm">{user.nickname}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleShareWithUser(user.user_id)}
                    >
                      <User className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Currently shared with */}
          {sharedUsers.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Shared with</Label>
              <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                {sharedUsers.map((share) => (
                  <div key={share.id} className="p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                        style={{ backgroundColor: share.user_profiles.favorite_color }}
                      >
                        {share.user_profiles.nickname[0].toUpperCase()}
                      </div>
                      <span className="text-sm">{share.user_profiles.nickname}</span>
                      <Badge variant={share.accepted ? "default" : "secondary"} className="text-xs">
                        {share.permission}
                      </Badge>
                      {!share.accepted && (
                        <Badge variant="outline" className="text-xs">Pending</Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveUser(share.id)}
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
}

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, User, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface ShareFolderDialogProps {
  folderId: string;
  folderName: string;
}

interface SharedUser {
  id: string;
  user_id: string;
  permission: string;
  accepted: boolean;
  profiles: {
    nickname: string;
    favorite_color: string;
  };
}

export function ShareFolderDialog({ folderId, folderName }: ShareFolderDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [selectedPermission, setSelectedPermission] = useState<"viewer" | "editor" | "owner">("editor");
  const { toast } = useToast();
  const { t } = useLanguage();

  const loadSharedUsers = async () => {
    const { data, error } = await supabase
      .from('shared_folders')
      .select('id, user_id, permission, accepted')
      .eq('folder_id', folderId);

    if (!error && data) {
      const userIds = data.map(d => d.user_id);
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, nickname, favorite_color')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      const enrichedData = data.map(share => ({
        ...share,
        profiles: profileMap.get(share.user_id) || { nickname: 'Unknown', favorite_color: '#gray' }
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
  if (userId === currentUser.user.id) {
    toast({
      title: "Invalid invite",
      description: "You cannot invite yourself.",
      variant: "destructive"
    });
    return;
  }

  const { error } = await supabase
    .from('shared_folders')
    .upsert(
      {
        folder_id: folderId,
        user_id: userId,
        permission: selectedPermission,
        invited_by: currentUser.user.id,
        accepted: false
      },
      { onConflict: 'folder_id,user_id' }
    );

  if (error) {
    toast({
      title: "Error",
      description: "Failed to share folder",
      variant: "destructive"
    });
  } else {
    // Create notification directly using Supabase
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('nickname')
      .eq('user_id', currentUser.user.id)
      .single();

    const senderName = profile?.nickname || 'A user';

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        sender_id: currentUser.user.id,
        type: 'share_invite',
        title: 'Folder invitation',
        content: `${senderName} invited you to collaborate on the folder: "${folderName}"`,
        resource_id: folderId,
        resource_type: 'folder'
      });

    if (notificationError) {
      console.error('Failed to send notification', notificationError);
      toast({
        title: "Notification failed",
        description: `The notification could not be delivered: ${notificationError.message}`,
        variant: "destructive",
      });
    }

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
      .from('shared_folders')
      .delete()
      .eq('id', shareId);

    if (!error) {
      toast({
        title: "Removed",
        description: "User removed from folder"
      });
      loadSharedUsers();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen) loadSharedUsers();
    }}>
      {/* Use a span as the trigger to avoid nested button warning */}
      <DialogTrigger asChild>
        <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
          <Users className="h-4 w-4" />
        </span>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("collab.share_folder").replace("{name}", folderName)}</DialogTitle>
          <DialogDescription>
            {t("collab.collaborate_all_notes")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Share with specific users */}
          <div className="space-y-2">
            <Label>{t("collab.invite_collaborators")}</Label>
            <div className="flex gap-2">
              <Input
                placeholder={t("collab.search_nickname")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Select value={selectedPermission} onValueChange={(v) => setSelectedPermission(v as "viewer" | "editor" | "owner")}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">{t("collab.viewer")}</SelectItem>
                  <SelectItem value="editor">{t("collab.editor")}</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSearch} size="sm">
                {t("collab.search")}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                {searchResults.map((user) => (
                  <div key={user.id} className="p-2 flex items-center justify-between hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                        style={{ backgroundColor: user.favorite_color }}
                      >
                        {user.nickname[0].toUpperCase()}
                      </div>
                      <span className="text-sm">{user.nickname}</span>
                    </div>
                    <div
                      role="button"
                      tabIndex={0}
                      className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
                      onClick={() => handleShareWithUser(user.user_id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleShareWithUser(user.user_id);
                        }
                      }}
                    >
                      <User className="h-4 w-4" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Currently shared with */}
          {sharedUsers.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Members ({sharedUsers.length})</Label>
              <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                {sharedUsers.map((share) => (
                  <div key={share.id} className="p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                        style={{ backgroundColor: share.profiles.favorite_color }}
                      >
                        {share.profiles.nickname[0].toUpperCase()}
                      </div>
                      <span className="text-sm">{share.profiles.nickname}</span>
                      <Badge variant={share.permission === 'owner' ? "default" : "secondary"} className="text-xs">
                        {share.permission}
                      </Badge>
                      {!share.accepted && (
                        <Badge variant="outline" className="text-xs">Pending</Badge>
                      )}
                    </div>
                    {share.permission !== 'owner' && (
                      <div
                        role="button"
                        tabIndex={0}
                        className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
                        onClick={() => handleRemoveUser(share.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            handleRemoveUser(share.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </div>
                    )}
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
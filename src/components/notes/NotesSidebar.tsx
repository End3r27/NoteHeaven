import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Folder, Tag, LogOut, Plus, Trash2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/language/LanguageProvider";
import { ShareFolderDialog } from "./ShareFolderDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Folder {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  email: string;
  used_storage?: number;
}

interface NotesSidebarProps {
  folders: Folder[];
  tags: Tag[];
  selectedFolder: string | null;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
  onMoveNoteToFolder?: (noteId: string, folderId: string | null) => void;
  profile: Profile;
  totalStorage: number;
}

export function NotesSidebar({
  folders,
  tags,
  selectedFolder,
  profile,
  totalStorage,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  onMoveNoteToFolder,
}: NotesSidebarProps) {

  const [usedStorage, setUsedStorage] = useState<number>(0);
  const [newFolderName, setNewFolderName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const MAX_STORAGE = 2.5 * 1024 * 1024 * 1024; // 2.5GB in bytes

  const fetchStorage = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('used_storage')
      .single();
    if (!error && data?.used_storage != null) {
      setUsedStorage(data.used_storage);
    }
  };

  // Fetch storage on mount
  useEffect(() => {
    fetchStorage();
  }, []);

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName);
      setNewFolderName("");
      setDialogOpen(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="font-semibold">NoteHaven</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <div className="flex items-center justify-between px-2">
            <SidebarGroupLabel>{t("sidebar.folders")}</SidebarGroupLabel>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-6 w-6 p-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("sidebar.create_new_folder")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder={t("sidebar.folder_name_placeholder")}
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                  />
                  <Button onClick={handleCreateFolder} className="w-full">
                    {t("sidebar.create_folder")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onSelectFolder(null)}
                  isActive={selectedFolder === null}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const noteId = e.dataTransfer.getData("text/note-id");
                    if (noteId && onMoveNoteToFolder) onMoveNoteToFolder(noteId, null);
                  }}
                >
                  <Folder className="h-4 w-4" />
                  <span>{t("sidebar.all_notes")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {folders.map((folder) => (
                <SidebarMenuItem key={folder.id}>
                  <SidebarMenuButton
                    onClick={() => onSelectFolder(folder.id)}
                    isActive={selectedFolder === folder.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const noteId = e.dataTransfer.getData("text/note-id");
                      if (noteId && onMoveNoteToFolder) onMoveNoteToFolder(noteId, folder.id);
                    }}
                  >
                    <Folder className="h-4 w-4" />
                    <span>{folder.name}</span>
                    <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <ShareFolderDialog folderId={folder.id} folderName={folder.name} />
                      <Button asChild className="h-6 w-6 p-0">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteFolder(folder.id);
                          }}
                          role="button"
                          tabIndex={0}
                          className="flex items-center justify-center h-6 w-6"
                        >
                          <Trash2 className="h-3 w-3" />
                        </div>
                      </Button>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t("sidebar.tags")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tags.map((tag) => (
                <SidebarMenuItem key={tag.id}>
                  <SidebarMenuButton>
                    <Tag className="h-4 w-4" />
                    <span>{tag.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <div className="border-t border-sidebar-border p-4">
        {/* Storage Usage Bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-muted-foreground">Storage Used</span>
            <span className="text-xs font-medium">
              {((usedStorage / (1024 * 1024 * 1024)).toFixed(2))}GB / 2.50GB
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-2 bg-primary"
              style={{ width: `${Math.min(100, (usedStorage / MAX_STORAGE) * 100)}%` }}
            />
          </div>
        </div>
        <Button onClick={handleLogout} className="w-full justify-start">
          <LogOut className="h-4 w-4 mr-2" />
          {t("sidebar.sign_out")}
        </Button>
      </div>
    </Sidebar>
  );
}

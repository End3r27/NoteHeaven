import { useState } from "react";
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

interface NotesSidebarProps {
  folders: Folder[];
  tags: Tag[];
  selectedFolder: string | null;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
  onMoveNoteToFolder?: (noteId: string, folderId: string | null) => void;
}

export function NotesSidebar({
  folders,
  tags,
  selectedFolder,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  onMoveNoteToFolder,
}: NotesSidebarProps) {
  const [newFolderName, setNewFolderName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

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
                    <Button
                      className="ml-auto h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFolder(folder.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
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
        <Button onClick={handleLogout} className="w-full justify-start">
          <LogOut className="h-4 w-4 mr-2" />
          {t("sidebar.sign_out")}
        </Button>
      </div>
    </Sidebar>
  );
}

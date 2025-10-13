import { useState } from "react";
import { User } from "@supabase/supabase-js";
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
  user: User;
}

export function NotesSidebar({
  folders,
  tags,
  selectedFolder,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  user,
}: NotesSidebarProps) {
  const [newFolderName, setNewFolderName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();

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
            <SidebarGroupLabel>Folders</SidebarGroupLabel>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Folder</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                  />
                  <Button onClick={handleCreateFolder} className="w-full">
                    Create Folder
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
                >
                  <Folder className="h-4 w-4" />
                  <span>All Notes</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {folders.map((folder) => (
                <SidebarMenuItem key={folder.id}>
                  <SidebarMenuButton
                    onClick={() => onSelectFolder(folder.id)}
                    isActive={selectedFolder === folder.id}
                  >
                    <Folder className="h-4 w-4" />
                    <span>{folder.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
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
          <SidebarGroupLabel>Tags</SidebarGroupLabel>
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
        <Button variant="ghost" onClick={handleLogout} className="w-full justify-start">
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </Sidebar>
  );
}

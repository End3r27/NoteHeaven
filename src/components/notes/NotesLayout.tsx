import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { NotesSidebar } from "./NotesSidebar";
import { NotesHeader } from "./NotesHeader";
import { NoteEditor } from "./NoteEditor";
import { AIInsights } from "./AIInsights";
import { RelatedNotes } from "./RelatedNotes";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/language/LanguageProvider";
import { supabase as supabaseClient } from "@/integrations/supabase/client";

interface Note {
  id: string;
  title: string;
  body: string;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Folder {
  id: string;
  name: string;
  created_at: string;
}

interface Tag {
  id: string;
  name: string;
}

export function NotesLayout({ user }: { user: { id: string } }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInsights, setShowInsights] = useState(false);
  const [useSemanticSearch, setUseSemanticSearch] = useState(false);
  const [semanticResults, setSemanticResults] = useState<Note[]>([]);
  const [searchingSemantics, setSearchingSemantics] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    fetchFolders();
    fetchTags();
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load notes",
        variant: "destructive",
      });
    } else {
      setNotes(data || []);
    }
  };

  const fetchFolders = async () => {
    const { data, error } = await supabase
      .from("folders")
      .select("*")
      .order("name");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load folders",
        variant: "destructive",
      });
    } else {
      setFolders(data || []);
    }
  };

  const fetchTags = async () => {
    // Only fetch tags that are actually used (have notes associated with them)
    const { data, error } = await supabase
      .from("tags")
      .select(`
        *,
        note_tags!inner(note_id)
      `)
      .order("name");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load tags",
        variant: "destructive",
      });
    } else {
      // Remove duplicates and extract unique tags
      const uniqueTags = Array.from(
        new Map((data || []).map(tag => [tag.id, tag])).values()
      );
      setTags(uniqueTags);
    }
  };

  const createNewNote = async () => {
    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        title: "Untitled",
        body: "",
        folder_id: selectedFolder,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create note",
        variant: "destructive",
      });
    } else {
      setNotes([data, ...notes]);
      setSelectedNote(data);
      toast({
        title: "Success",
        description: "New note created",
      });
    }
  };

  const deleteNote = async (noteId: string) => {
    const { error } = await supabase.from("notes").delete().eq("id", noteId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
    } else {
      setNotes(notes.filter((n) => n.id !== noteId));
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
      // Refresh tags to remove any that are no longer used
      fetchTags();
      toast({
        title: "Success",
        description: "Note deleted",
      });
    }
  };

  const updateNote = async (noteId: string, updates: Partial<Note>) => {
    const { data, error } = await supabase
      .from("notes")
      .update(updates)
      .eq("id", noteId)
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update note",
        variant: "destructive",
      });
    } else {
      setNotes(notes.map((n) => (n.id === noteId ? data : n)));
      if (selectedNote?.id === noteId) {
        setSelectedNote(data);
      }
    }
  };

  const createFolder = async (name: string) => {
    const { data, error } = await supabase
      .from("folders")
      .insert({ user_id: user.id, name })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setFolders([...folders, data]);
      toast({
        title: "Success",
        description: "Folder created",
      });
    }
  };

  const deleteFolder = async (folderId: string) => {
    const { error } = await supabase.from("folders").delete().eq("id", folderId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete folder",
        variant: "destructive",
      });
    } else {
      setFolders(folders.filter((f) => f.id !== folderId));
      if (selectedFolder === folderId) {
        setSelectedFolder(null);
      }
      // Refresh tags in case any became unused
      fetchTags();
      toast({
        title: "Success",
        description: "Folder deleted",
      });
    }
  };

  // Clean up unused tags from the database
  const cleanupUnusedTags = async () => {
    try {
      // Find all tags that have no notes associated with them
      const { data: allTags } = await supabase
        .from("tags")
        .select("id");

      if (!allTags) return;

      const { data: usedTags } = await supabase
        .from("note_tags")
        .select("tag_id");

      const usedTagIds = new Set((usedTags || []).map((t: any) => t.tag_id));
      const unusedTagIds = allTags
        .map((t: any) => t.id)
        .filter((id: string) => !usedTagIds.has(id));

      if (unusedTagIds.length > 0) {
        const { error } = await supabase
          .from("tags")
          .delete()
          .in("id", unusedTagIds);

        if (error) throw error;

        toast({
          title: "Success",
          description: `Cleaned up ${unusedTagIds.length} unused tag(s)`,
        });

        // Refresh the tags list
        fetchTags();
      } else {
        toast({
          title: "Info",
          description: "No unused tags to clean up",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to clean up unused tags",
        variant: "destructive",
      });
    }
  };

  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.body.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = !selectedFolder || note.folder_id === selectedFolder;
    return matchesSearch && matchesFolder;
  });

  const performSemanticSearch = async (query: string) => {
    if (!query.trim()) {
      setSemanticResults([]);
      return;
    }

    setSearchingSemantics(true);
    try {
      const { data, error } = await supabase.functions.invoke('semantic-search', {
        body: { query }
      });

      if (error) throw error;

      setSemanticResults(data.results || []);
    } catch (error: any) {
      console.error('Error performing semantic search:', error);
      toast({
        title: "Error",
        description: "Failed to perform semantic search",
        variant: "destructive",
      });
    } finally {
      setSearchingSemantics(false);
    }
  };

  useEffect(() => {
    if (useSemanticSearch && searchQuery) {
      const debounce = setTimeout(() => {
        performSemanticSearch(searchQuery);
      }, 500);
      return () => clearTimeout(debounce);
    }
  }, [searchQuery, useSemanticSearch]);

  const displayedNotes = useSemanticSearch && searchQuery ? semanticResults : filteredNotes;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <NotesSidebar
          folders={folders}
          tags={tags}
          selectedFolder={selectedFolder}
          onSelectFolder={setSelectedFolder}
          onCreateFolder={createFolder}
          onDeleteFolder={deleteFolder}
          onMoveNoteToFolder={async (noteId, folderId) => {
            try {
              const { error } = await supabaseClient.from('notes').update({ folder_id: folderId }).eq('id', noteId);
              if (error) throw error;
              setNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, folder_id: folderId } : n));
              if (selectedNote?.id === noteId) {
                setSelectedNote({ ...(selectedNote as Note), folder_id: folderId });
              }
            } catch (err: any) {
              toast({ title: "Error", description: err.message || "Failed to move note", variant: "destructive" });
            }
          }}
        />
        <div className="flex-1 flex flex-col">
          <NotesHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onCreateNote={createNewNote}
            onOpenInsights={() => setShowInsights(!showInsights)}
            useSemanticSearch={useSemanticSearch}
            onToggleSemanticSearch={setUseSemanticSearch}
            searchingSemantics={searchingSemantics}
          />
          <div className="flex-1 flex">
            {!showInsights ? (
              <>
                <div className="w-64 border-r border-border overflow-y-auto">
                  <div className="p-4 space-y-2">
                    {displayedNotes.map((note) => (
                      <button
                        key={note.id}
                        onClick={() => setSelectedNote(note)}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/note-id", note.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedNote?.id === note.id
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted"
                        }`}
                      >
                        <div className="font-medium truncate">{note.title}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {note.body.substring(0, 50)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 flex">
                  <div className="flex-1">
                    {selectedNote ? (
                      <NoteEditor
                        note={selectedNote}
                        onUpdate={updateNote}
                        onDelete={deleteNote}
                        tags={tags}
                        onTagsChange={fetchTags}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        {t("notes.select_or_create")}
                      </div>
                    )}
                  </div>
                  {selectedNote && (
                    <div className="w-80 border-l border-border overflow-y-auto p-4">
                      <RelatedNotes 
                        currentNoteId={selectedNote.id}
                        onNoteClick={(noteId) => {
                          const note = notes.find(n => n.id === noteId);
                          if (note) setSelectedNote(note);
                        }}
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <AIInsights folders={folders} tags={tags} />
              </div>
            )}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}

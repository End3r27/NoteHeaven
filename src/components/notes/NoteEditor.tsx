import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Note {
  id: string;
  title: string;
  body: string;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Tag {
  id: string;
  name: string;
}

interface NoteEditorProps {
  note: Note;
  onUpdate: (noteId: string, updates: Partial<Note>) => void;
  onDelete: (noteId: string) => void;
  tags: Tag[];
}

export function NoteEditor({ note, onUpdate, onDelete, tags }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setTitle(note.title);
    setBody(note.body);
    setHasChanges(false);
  }, [note]);

  useEffect(() => {
    const changed = title !== note.title || body !== note.body;
    setHasChanges(changed);
  }, [title, body, note]);

  const handleSave = () => {
    onUpdate(note.id, { title, body });
    setHasChanges(false);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this note?")) {
      onDelete(note.id);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges}
        >
          <Save className="h-4 w-4 mr-2" />
          {hasChanges ? "Save" : "Saved"}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDelete}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
        <div className="text-xs text-muted-foreground ml-auto">
          Last edited: {new Date(note.updated_at).toLocaleDateString()}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-3xl font-bold border-none p-0 focus-visible:ring-0"
            placeholder="Untitled"
          />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-[500px] border-none p-0 focus-visible:ring-0 resize-none text-base"
            placeholder="Start writing..."
          />
        </div>
      </div>
    </div>
  );
}

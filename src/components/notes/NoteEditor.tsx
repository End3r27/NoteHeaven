import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2, Save, Sparkles, Tag as TagIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const [recap, setRecap] = useState("");
  const [loadingRecap, setLoadingRecap] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setTitle(note.title);
    setBody(note.body);
    setHasChanges(false);
    setRecap("");
    setSuggestedTags([]);
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

  const generateRecap = async () => {
    setLoadingRecap(true);
    try {
      const { data, error } = await supabase.functions.invoke('recap-note', {
        body: { noteId: note.id }
      });

      if (error) throw error;

      setRecap(data.recap);
      toast({
        title: "Recap generated",
        description: "AI has summarized your note",
      });
    } catch (error: any) {
      console.error('Error generating recap:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate recap",
        variant: "destructive",
      });
    } finally {
      setLoadingRecap(false);
    }
  };

  const generateTagSuggestions = async () => {
    if (!title && !body) {
      toast({
        title: "Empty note",
        description: "Add some content first to get tag suggestions",
        variant: "destructive",
      });
      return;
    }

    setLoadingTags(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-tags', {
        body: { title, body }
      });

      if (error) throw error;

      setSuggestedTags(data.suggestions);
      toast({
        title: "Tags suggested",
        description: `AI suggested ${data.suggestions.length} tags`,
      });
    } catch (error: any) {
      console.error('Error generating tag suggestions:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate tag suggestions",
        variant: "destructive",
      });
    } finally {
      setLoadingTags(false);
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
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={generateRecap}
          disabled={loadingRecap}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {loadingRecap ? "Generating..." : "Recap"}
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={generateTagSuggestions}
          disabled={loadingTags}
        >
          <TagIcon className="h-4 w-4 mr-2" />
          {loadingTags ? "Suggesting..." : "Suggest Tags"}
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
          {recap && (
            <Card className="bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-2">AI Recap</h3>
                    <p className="text-sm text-muted-foreground">{recap}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {suggestedTags.length > 0 && (
            <Card className="bg-accent/50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-2">
                  <TagIcon className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Suggested Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {suggestedTags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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

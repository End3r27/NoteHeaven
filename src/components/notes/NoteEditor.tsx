import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2, Save, Sparkles, Tag as TagIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/language/LanguageProvider";

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
  onTagsChange?: () => void;
}

export function NoteEditor({ note, onUpdate, onDelete, tags, onTagsChange }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [hasChanges, setHasChanges] = useState(false);
  const [recap, setRecap] = useState("");
  const [loadingRecap, setLoadingRecap] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [savingTags, setSavingTags] = useState(false);
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    setTitle(note.title);
    setBody(note.body);
    setHasChanges(false);
    setRecap("");
    setSuggestedTags([]);
    // Load note tags and all tags
    (async () => {
      const { data: existingLinks } = await supabase
        .from('note_tags')
        .select('tags(name)')
        .eq('note_id', note.id);
      setNoteTags((existingLinks || []).map((r: any) => r.tags?.name).filter(Boolean));

      const { data: existing } = await supabase
        .from('tags')
        .select('name')
        .eq('user_id', note.user_id);
      setAllTags((existing || []).map((t: any) => t.name));
    })();
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

  const saveSuggestedTags = async () => {
    if (suggestedTags.length === 0) {
      return;
    }
    setSavingTags(true);
    try {
      // Fetch existing tags for user
      const { data: existingTags } = await supabase
        .from('tags')
        .select('id, name')
        .eq('user_id', note.user_id);

      const existingNameToId = new Map<string, string>((existingTags || []).map((t: any) => [t.name.toLowerCase(), t.id]));

      const tagIds: string[] = [];
      for (const tagName of suggestedTags) {
        const key = tagName.toLowerCase();
        if (existingNameToId.has(key)) {
          tagIds.push(existingNameToId.get(key)!);
          continue;
        }
        const { data: inserted, error: insertErr } = await supabase
          .from('tags')
          .insert({ name: tagName, user_id: note.user_id })
          .select('id')
          .single();
        if (insertErr) throw insertErr;
        tagIds.push(inserted.id);
        existingNameToId.set(key, inserted.id);
      }

      // Link tags to note; avoid duplicates
      const { data: existingLinks } = await supabase
        .from('note_tags')
        .select('tag_id')
        .eq('note_id', note.id);
      const linked = new Set<string>((existingLinks || []).map((r: any) => r.tag_id));

      const newLinks = tagIds
        .filter((id) => !linked.has(id))
        .map((id) => ({ note_id: note.id, tag_id: id }));

      if (newLinks.length > 0) {
        const { error: linkErr } = await supabase.from('note_tags').insert(newLinks);
        if (linkErr) throw linkErr;
      }

      toast({ title: t('insights.toast.summary_generated.title'), description: t('insights.toast.summary_generated.desc').replace('{count}', String(suggestedTags.length)) });
      // Refresh local tags
      const { data: refreshed } = await supabase
        .from('note_tags')
        .select('tags(name)')
        .eq('note_id', note.id);
      setNoteTags((refreshed || []).map((r: any) => r.tags?.name).filter(Boolean));
    } catch (error: any) {
      toast({ title: t('insights.toast.error.title'), description: error.message || 'Failed to save tags', variant: 'destructive' });
    } finally {
      setSavingTags(false);
    }
  };

  const addTagToNote = async (tagName: string) => {
    try {
      // ensure tag exists
      const { data: tagRow } = await supabase
        .from('tags')
        .select('id')
        .eq('user_id', note.user_id)
        .eq('name', tagName)
        .single();
      let tagId = tagRow?.id as string | undefined;
      if (!tagId) {
        const { data: inserted, error } = await supabase
          .from('tags')
          .insert({ name: tagName, user_id: note.user_id })
          .select('id')
          .single();
        if (error) throw error;
        tagId = inserted.id;
      }
      const { error: linkErr } = await supabase.from('note_tags').insert({ note_id: note.id, tag_id: tagId });
      if (linkErr) throw linkErr;
      setNoteTags((prev) => Array.from(new Set([...prev, tagName])));
      if (!allTags.includes(tagName)) setAllTags((prev) => [...prev, tagName]);
    } catch (e: any) {
      toast({ title: t('insights.toast.error.title'), description: e.message || 'Failed to add tag', variant: 'destructive' });
    }
  };

  const removeTagFromNote = async (tagName: string) => {
    try {
      const { data: tagRow } = await supabase
        .from('tags')
        .select('id')
        .eq('user_id', note.user_id)
        .eq('name', tagName)
        .single();
      if (!tagRow?.id) return;
      const { error } = await supabase
        .from('note_tags')
        .delete()
        .eq('note_id', note.id)
        .eq('tag_id', tagRow.id);
      if (error) throw error;
      setNoteTags((prev) => prev.filter((t) => t !== tagName));
      // Notify parent to refresh tags list
      if (onTagsChange) onTagsChange();
    } catch (e: any) {
      toast({ title: t('insights.toast.error.title'), description: e.message || 'Failed to remove tag', variant: 'destructive' });
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
          {hasChanges ? t("editor.save") : t("editor.saved")}
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={generateRecap}
          disabled={loadingRecap}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {loadingRecap ? t("editor.generating") : t("editor.recap")}
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={generateTagSuggestions}
          disabled={loadingTags}
        >
          <TagIcon className="h-4 w-4 mr-2" />
          {loadingTags ? t("editor.suggesting") : t("editor.suggest_tags")}
        </Button>
        {suggestedTags.length > 0 && (
          <Button variant="ghost" size="sm" onClick={saveSuggestedTags} disabled={savingTags}>
            <TagIcon className="h-4 w-4 mr-2" />
            {savingTags ? t('insights.generating') : t('editor.save_tags')}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={handleDelete}>
          <Trash2 className="h-4 w-4 mr-2" />
          {t("editor.delete")}
        </Button>
        <div className="text-xs text-muted-foreground ml-auto">
          {t("editor.last_edited")} {new Date(note.updated_at).toLocaleDateString()}
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
            placeholder={t("editor.start_writing")}
          />

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">{t('editor.tags')}</h4>
              <div className="flex items-center gap-2">
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder={t('editor.add_tag_placeholder')}
                  className="h-8"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTagName.trim()) {
                      addTagToNote(newTagName.trim());
                      setNewTagName('');
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (newTagName.trim()) {
                      addTagToNote(newTagName.trim());
                      setNewTagName('');
                    }
                  }}
                >
                  {t('editor.add_tag')}
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {noteTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <button
                    className="ml-1 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => removeTagFromNote(tag)}
                    aria-label={t('editor.remove_tag')}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

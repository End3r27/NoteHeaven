import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2, Save, Sparkles, Tag as TagIcon, Upload, File as FileIcon, Download, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Attachment } from "@/types/attachment";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/language/LanguageProvider";
import { ShareNoteDialog } from "./ShareNoteDialog";
import { ExportDialog } from "./ExportDialog";
import { CollaborationProvider } from "@/components/collaboration/CollaborationProvider";
import { PresenceAvatars, CollaborativeEditor } from "@/components/collaboration/PresenceCursors";
import { Comments } from "@/components/collaboration/Comments";
import { CollaboratorsDialog } from "@/components/collaboration/CollaboratorsDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Note {
  id: string;
  title: string;
  body: string;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
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
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [publicUuid, setPublicUuid] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(note.title);
    setBody(note.body);
    setHasChanges(false);
    setRecap("");
    setSuggestedTags([]);
    fetchAttachments();
    
    // Load sharing status
    (async () => {
      const { data } = await supabase
        .from('notes')
        .select('is_public, public_uuid')
        .eq('id', note.id)
        .single();
      
      if (data) {
        setIsPublic(data.is_public || false);
        setPublicUuid(data.public_uuid);
      }
    })();

    // Load note tags
    (async () => {
      const { data: existingLinks } = await supabase
        .from('note_tags')
        .select('tags(name)')
        .eq('note_id', note.id);
      setNoteTags((existingLinks || []).map((r: any) => r.tags?.name).filter(Boolean));
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

  const handleDelete = () => onDelete(note.id);

  const handleTogglePublic = async (newPublicState: boolean) => {
    const { error } = await supabase
      .from('notes')
      .update({ is_public: newPublicState })
      .eq('id', note.id);

    if (!error) {
      setIsPublic(newPublicState);
      toast({
        title: newPublicState ? "Note is now public" : "Note is now private",
        description: newPublicState ? "Anyone with the link can view" : "Only you and shared users can view"
      });
    }
  };

  const generateRecap = async () => {
    setLoadingRecap(true);
    try {
      const { data, error } = await supabase.functions.invoke('recap-note', {
        body: { noteId: note.id, language }
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
        body: { title, body, language }
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
    if (suggestedTags.length === 0) return;
    setSavingTags(true);
    try {
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

      toast({ title: 'Tags saved', description: `Added ${suggestedTags.length} tags` });
      const { data: refreshed } = await supabase
        .from('note_tags')
        .select('tags(name)')
        .eq('note_id', note.id);
      setNoteTags((refreshed || []).map((r: any) => r.tags?.name).filter(Boolean));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to save tags', variant: 'destructive' });
    } finally {
      setSavingTags(false);
    }
  };

  const addTagToNote = async (tagName: string) => {
    try {
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
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to add tag', variant: 'destructive' });
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
      if (onTagsChange) onTagsChange();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to remove tag', variant: 'destructive' });
    }
  };

  const fetchAttachments = async () => {
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('note_id', note.id)
      .order('uploaded_at', { ascending: true });

    if (error) {
      toast({ title: "Error", description: "Failed to load attachments", variant: "destructive" });
    } else {
      setAttachments(data || []);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "Error", description: "File is too large (max 50MB)", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('noteId', note.id);

    try {
      const { data, error } = await supabase.functions.invoke('upload-attachment', {
        body: formData,
      });

      if (error) throw new Error(error.message);

      setAttachments([...attachments, data]);
      toast({ title: "Success", description: "File uploaded successfully" });
      if (onTagsChange) onTagsChange();
    } catch (error: any) {
      toast({ title: "Upload Error", description: error.message || "Failed to upload file", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    const attachment = attachments.find(a => a.id === attachmentId);
    if (!attachment) return;

    try {
      const filePath = attachment.file_url.split('/attachments/')[1];
      const { error: storageError } = await supabase.storage.from('attachments').remove([filePath]);
      if (storageError) throw storageError;

      // Verify the attachment belongs to a note owned by the current user
      const { data: attachmentCheck } = await supabase
        .from('attachments')
        .select('notes!inner(user_id)')
        .eq('id', attachmentId)
        .eq('notes.user_id', note.user_id)
        .single();
      
      if (!attachmentCheck) {
        throw new Error('Unauthorized: Attachment not found or access denied');
      }

      const { error: dbError } = await supabase.from('attachments').delete().eq('id', attachmentId);
      if (dbError) throw dbError;

      setAttachments(attachments.filter(a => a.id !== attachmentId));
      toast({ title: "Success", description: "Attachment deleted" });
      if (onTagsChange) onTagsChange();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete attachment", variant: "destructive" });
    }
  };

  const handleDownloadAttachment = async (att: Attachment) => {
    try {
      if (!att.file_url) throw new Error('No file URL');
      const filePath = att.file_url.split('/attachments/')[1];
      if (!filePath) throw new Error('Invalid file path');

      const { data, error } = await supabase.storage.from('attachments').download(filePath);
      if (error || !data) throw error || new Error('Failed to download file');

      const blob = data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.filename || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || 'Failed to download file', variant: 'destructive' });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <CollaborationProvider noteId={note.id}>
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
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t("editor.delete")}
          </Button>
          <PresenceAvatars />
          <CollaboratorsDialog noteId={note.id} noteTitle={title} />
          <ShareNoteDialog 
            noteId={note.id}
            isPublic={isPublic}
            publicUuid={publicUuid}
            onTogglePublic={handleTogglePublic}
          />
          <ExportDialog 
            noteTitle={title}
            noteBody={body}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Comments
          </Button>
          <div className="text-xs text-muted-foreground ml-auto">
            {t("editor.last_edited")} {new Date(note.updated_at).toLocaleDateString()}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto flex">
          <div className="flex-1" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
            <div className="max-w-3xl mx-auto p-6 space-y-4">
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

              {isDragging && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 pointer-events-none">
                  <div className="bg-background p-8 rounded-lg border-2 border-dashed border-primary">
                    <p className="text-lg font-semibold">Drop file to upload</p>
                  </div>
                </div>
              )}

              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-3xl font-bold border-none p-0 focus-visible:ring-0"
                placeholder="Untitled"
              />
              
              <CollaborativeEditor noteId={note.id}>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-[500px] border-none p-0 focus-visible:ring-0 resize-none text-base"
                  placeholder={t("editor.start_writing")}
                />
              </CollaborativeEditor>

              <div className="pt-4 border-t space-y-4">
                {suggestedTags.length > 0 && (
                  <Card className="bg-accent/50 mb-4">
                    <CardContent className="pt-4">
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
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={generateTagSuggestions}
                      disabled={loadingTags}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {loadingTags ? t("editor.suggesting") : t("editor.suggest_tags")}
                    </Button>
                    {suggestedTags.length > 0 && (
                      <Button variant="default" size="sm" onClick={saveSuggestedTags} disabled={savingTags}>
                        <TagIcon className="h-4 w-4 mr-2" />
                        {savingTags ? t('insights.generating') : t('editor.save_tags')}
                      </Button>
                    )}
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

                {/* Attachments Section */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium">{t('editor.attachments')}</h4>
                    <div className="flex flex-col items-end gap-1">
                      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                        <Upload className="h-4 w-4 mr-2" />
                        {isUploading ? t('editor.uploading') : t('editor.upload_file')}
                      </Button>
                      {isUploading && (
                        <div className="w-full mt-1">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-2 bg-primary animate-pulse w-full" style={{ width: '100%' }} />
                          </div>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                      className="hidden"
                    />
                  </div>
                  <div className="space-y-2">
                    {attachments.map(att => (
                      <Card key={att.id} className="p-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileIcon className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="text-sm font-medium truncate">{att.filename}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatBytes(att.filesize)} - {new Date(att.uploaded_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleDownloadAttachment(att)}>
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteAttachment(att.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Comments Sidebar */}
          {showComments && (
            <div className="w-80 border-l border-border overflow-y-auto p-4">
              <Comments noteId={note.id} />
            </div>
          )}
        </div>
      </div>
    </CollaborationProvider>
  );
}
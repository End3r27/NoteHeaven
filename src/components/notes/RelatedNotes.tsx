import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/language/LanguageProvider";

interface Note {
  id: string;
  title: string;
  body: string;
}

interface RelatedNotesProps {
  currentNoteId: string;
  onNoteClick: (noteId: string) => void;
}

export function RelatedNotes({ currentNoteId, onNoteClick }: RelatedNotesProps) {
  const [relatedNotes, setRelatedNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { t, language } = useLanguage();

  useEffect(() => {
    findRelatedNotes();
  }, [currentNoteId]);

  const findRelatedNotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('find-related-notes', {
        body: { noteId: currentNoteId, language }
      });

      if (error) throw error;

      setRelatedNotes(data.relatedNotes || []);
    } catch (error: any) {
      console.error('Error finding related notes:', error);
      toast({
        title: "Error",
        description: "Failed to find related notes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            {t("related.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (relatedNotes.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          {t("related.title")}
        </CardTitle>
        <CardDescription className="text-xs">
          {t("related.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {relatedNotes.map((note) => (
            <div
              key={note.id}
              className="p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
              onClick={() => onNoteClick(note.id)}
            >
              <h4 className="font-medium text-sm mb-1">{note.title}</h4>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {note.body || "No content"}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

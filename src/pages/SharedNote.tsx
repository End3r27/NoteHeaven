import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Copy, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface Note {
  id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
}

const SharedNote = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorNickname, setAuthorNickname] = useState<string>("");

  useEffect(() => {
    const fetchNote = async () => {
      if (!uuid) return;

      const { data, error } = await supabase
        .from('notes')
        .select('id, title, body, created_at, updated_at, user_id')
        .eq('public_uuid', uuid)
        .eq('is_public', true)
        .single();

      if (error || !data) {
        toast({
          title: "Note not found",
          description: "This note doesn't exist or is no longer public",
          variant: "destructive"
        });
        navigate("/");
        return;
      }

      setNote(data);

      // Fetch author profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', data.user_id)
        .single();

      if (profile) {
        setAuthorNickname(profile.nickname);
      }

      setLoading(false);
    };

    fetchNote();
  }, [uuid, navigate, toast]);

  const handleForkNote = async () => {
    if (!note) return;

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Create an account to fork this note",
      });
      navigate("/auth");
      return;
    }

    const { error } = await supabase
      .from('notes')
      .insert({
        title: `${note.title} (Copy)`,
        body: note.body,
        user_id: user.id
      });

    if (!error) {
      toast({
        title: "Note forked!",
        description: "The note has been added to your workspace"
      });
      navigate("/notes");
    } else {
      toast({
        title: "Error",
        description: "Failed to fork note",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!note) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6" />
            <div>
              <h1 className="text-lg font-semibold">Shared Note</h1>
              {authorNickname && (
                <p className="text-xs text-muted-foreground">
                  by {authorNickname}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleForkNote} size="sm">
              <Copy className="h-4 w-4 mr-2" />
              Fork to My Notes
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader className="space-y-2">
            <h1 className="text-3xl font-bold">{note.title}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">Read-only</Badge>
              <span>•</span>
              <span>Last updated {new Date(note.updated_at).toLocaleDateString()}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed">
                {note.body}
              </pre>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SharedNote;

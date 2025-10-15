import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Sparkles, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Note {
  id: string;
  title: string;
  body: string;
  updated_at: string;
}

const DailyRecap = () => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteCount, setNoteCount] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    generateDailyRecap();
  }, []);

  const generateDailyRecap = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('daily-recap');

      if (error) throw error;

      setSummary(data.summary);
      setNotes(data.notes || []);
      setNoteCount(data.noteCount || 0);
    } catch (error: any) {
      console.error('Error generating daily recap:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate daily recap",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/notes')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Notes
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Daily Recap</h1>
          </div>
          <p className="text-muted-foreground">
            A summary of your notes from the last 24 hours
          </p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4">
                <Sparkles className="h-8 w-8 animate-pulse text-primary" />
                <p className="text-muted-foreground">Generating your daily recap...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Summary
                </CardTitle>
                <CardDescription>
                  {noteCount} {noteCount === 1 ? 'note' : 'notes'} analyzed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {summary.split('\n').map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                </div>
              </CardContent>
            </Card>

            {notes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Today's Notes</CardTitle>
                  <CardDescription>
                    All notes created or updated in the last 24 hours
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => navigate('/notes', { state: { selectedNoteId: note.id } })}
                      >
                        <h3 className="font-semibold mb-1">{note.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {note.body || "No content"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Updated: {new Date(note.updated_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DailyRecap;

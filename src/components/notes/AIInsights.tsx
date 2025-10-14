import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, FolderOpen, Tag } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Folder {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
}

interface AIInsightsProps {
  folders: Folder[];
  tags: Tag[];
}

export function AIInsights({ folders, tags }: AIInsightsProps) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const [noteCount, setNoteCount] = useState<number>(0);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const { toast } = useToast();

  const generateSummary = async (type: 'recent' | 'folder' | 'tag', identifier?: string) => {
    setLoading(true);
    setSummary("");
    setNoteCount(0);

    try {
      const body: any = { type };
      
      if (type === 'folder' && identifier) {
        body.folderId = identifier;
      } else if (type === 'tag' && identifier) {
        body.tagName = identifier;
      }

      const { data, error } = await supabase.functions.invoke('summarize-notes', {
        body
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setSummary(data.summary);
      setNoteCount(data.noteCount || 0);
      
      toast({
        title: "Summary Generated",
        description: `Analyzed ${data.noteCount || 0} notes`,
      });
    } catch (error) {
      console.error('Error generating summary:', error);
      toast({
        title: "Error",
        description: "Failed to generate summary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">AI Insights</h2>
      </div>

      <Tabs defaultValue="recent" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
          <TabsTrigger value="folder">By Folder</TabsTrigger>
          <TabsTrigger value="tag">By Tag</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity Recap</CardTitle>
              <CardDescription>
                Get an AI-generated summary of your recent notes and activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => generateSummary('recent')}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Recap
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="folder" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Folder Summary</CardTitle>
              <CardDescription>
                Summarize all notes within a specific folder
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a folder" />
                </SelectTrigger>
                <SelectContent>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        {folder.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                onClick={() => generateSummary('folder', selectedFolder)}
                disabled={loading || !selectedFolder}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Summary
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tag" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tag Summary</CardTitle>
              <CardDescription>
                Summarize all notes with a specific tag
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a tag" />
                </SelectTrigger>
                <SelectContent>
                  {tags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.name}>
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        {tag.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                onClick={() => generateSummary('tag', selectedTag)}
                disabled={loading || !selectedTag}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Summary
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Summary
              {noteCount > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  {noteCount} {noteCount === 1 ? 'note' : 'notes'} analyzed
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {summary}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

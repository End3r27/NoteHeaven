import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, FolderOpen, Tag } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/components/language/LanguageProvider";

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
  const { t, language } = useLanguage();

  const generateSummary = async (type: 'recent' | 'folder' | 'tag', identifier?: string) => {
    setLoading(true);
    setSummary("");
    setNoteCount(0);

    try {
      const body: any = { type, language };
      
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
          title: t("insights.toast.error.title"),
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      // Handle empty results with localized messages
      const count = data.noteCount || 0;
      if (count === 0) {
        let emptyMsg = "";
        if (type === 'recent') {
          emptyMsg = t("insights.empty.recent");
        } else if (type === 'folder') {
          const folderName = folders.find((f) => f.id === identifier)?.name || "";
          emptyMsg = t("insights.empty.folder").replace("{name}", folderName);
        } else if (type === 'tag') {
          emptyMsg = t("insights.empty.tag").replace("{name}", identifier || "");
        }
        setSummary(emptyMsg);
        setNoteCount(0);
        return;
      }

      setSummary(data.summary);
      setNoteCount(count);
      
      toast({
        title: t("insights.toast.summary_generated.title"),
        description: t("insights.toast.summary_generated.desc").replace("{count}", String(count)),
      });
    } catch (error) {
      console.error('Error generating summary:', error);
      toast({
        title: t("insights.toast.error.title"),
        description: t("insights.toast.error.desc"),
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
        <h2 className="text-2xl font-bold">{t("insights.title")}</h2>
      </div>

      <Tabs defaultValue="recent" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recent">{t("insights.tab.recent")}</TabsTrigger>
          <TabsTrigger value="folder">{t("insights.tab.folder")}</TabsTrigger>
          <TabsTrigger value="tag">{t("insights.tab.tag")}</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("insights.recent.title")}</CardTitle>
              <CardDescription>
                {t("insights.recent.desc")}
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
                    {t("insights.generating")}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t("insights.generate_recap")}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="folder" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("insights.folder.title")}</CardTitle>
              <CardDescription>
                {t("insights.folder.desc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                <SelectTrigger>
                  <SelectValue placeholder={t("insights.folder.select_placeholder")} />
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
                    {t("insights.generating")}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t("insights.generate_summary")}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tag" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("insights.tag.title")}</CardTitle>
              <CardDescription>
                {t("insights.tag.desc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger>
                  <SelectValue placeholder={t("insights.tag.select_placeholder")} />
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
                    {t("insights.generating")}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t("insights.generate_summary")}
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
              {t("insights.summary.header")}
              {noteCount > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  {noteCount === 1
                    ? t("insights.summary.analyzed_one").replace("{count}", String(noteCount))
                    : t("insights.summary.analyzed_many").replace("{count}", String(noteCount))}
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

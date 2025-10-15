import { Search, Plus, Moon, Sun, Sparkles, Calendar, Brain } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useNavigate } from "react-router-dom";

interface NotesHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCreateNote: () => void;
  onOpenInsights: () => void;
  useSemanticSearch?: boolean;
  onToggleSemanticSearch?: (value: boolean) => void;
  searchingSemantics?: boolean;
}

export function NotesHeader({
  searchQuery,
  onSearchChange,
  onCreateNote,
  onOpenInsights,
  useSemanticSearch = false,
  onToggleSemanticSearch,
  searchingSemantics = false,
}: NotesHeaderProps) {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <header className="border-b border-border h-14 flex items-center px-4 gap-4">
      <SidebarTrigger />
      <div className="flex-1 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${searchingSemantics ? 'animate-pulse' : ''} text-muted-foreground`} />
          <Input
            placeholder={useSemanticSearch ? "Semantic search (e.g., 'notes about project ideas')..." : "Search notes..."}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        {onToggleSemanticSearch && (
          <div className="flex items-center gap-2">
            <Switch
              id="semantic-search"
              checked={useSemanticSearch}
              onCheckedChange={onToggleSemanticSearch}
            />
            <Label htmlFor="semantic-search" className="text-sm flex items-center gap-1 cursor-pointer">
              <Brain className="h-3 w-3" />
              AI Search
            </Label>
          </div>
        )}
      </div>
      <Button onClick={onOpenInsights} size="sm" variant="outline">
        <Sparkles className="h-4 w-4 mr-2" />
        AI Insights
      </Button>
      <Button onClick={() => navigate('/daily')} size="sm" variant="outline">
        <Calendar className="h-4 w-4 mr-2" />
        Daily Recap
      </Button>
      <Button onClick={onCreateNote} size="sm">
        <Plus className="h-4 w-4 mr-2" />
        New Note
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </Button>
    </header>
  );
}

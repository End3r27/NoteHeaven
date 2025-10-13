import { Search, Plus, Moon, Sun } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useTheme } from "@/components/theme/ThemeProvider";

interface NotesHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCreateNote: () => void;
}

export function NotesHeader({
  searchQuery,
  onSearchChange,
  onCreateNote,
}: NotesHeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="border-b border-border h-14 flex items-center px-4 gap-4">
      <SidebarTrigger />
      <div className="flex-1 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
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

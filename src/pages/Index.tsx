import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, FolderOpen, Tag, Search } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="max-w-4xl mx-auto text-center px-4 py-12">
        <div className="mb-8 flex justify-center">
          <div className="p-4 bg-primary/10 rounded-2xl">
            <BookOpen className="h-16 w-16 text-primary" />
          </div>
        </div>
        <h1 className="mb-4 text-5xl font-bold tracking-tight">
          Welcome to NoteHaven
        </h1>
        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
          Your personal note manager with powerful organization features. 
          Create, organize, and find your thoughts effortlessly.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 rounded-lg border border-border bg-card">
            <FolderOpen className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Organize with Folders</h3>
            <p className="text-sm text-muted-foreground">
              Keep your notes organized in custom folders
            </p>
          </div>
          <div className="p-6 rounded-lg border border-border bg-card">
            <Tag className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Tag Everything</h3>
            <p className="text-sm text-muted-foreground">
              Add multiple tags to categorize your notes
            </p>
          </div>
          <div className="p-6 rounded-lg border border-border bg-card">
            <Search className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Find Instantly</h3>
            <p className="text-sm text-muted-foreground">
              Powerful search to find any note in seconds
            </p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={() => navigate("/auth")}>
            Get Started
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
            Sign In
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;

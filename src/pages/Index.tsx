import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, FolderOpen, Tag, Search, Moon, Sun, Languages } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useLanguage } from "@/components/language/LanguageProvider";

const Index = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      {/* Header with toggles */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLanguage(language === "en" ? "it" : "en")}
          className="h-10 w-10 p-0"
        >
          <Languages className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-10 w-10 p-0"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {/* Main content */}
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-4xl mx-auto text-center px-4 py-12">
        <div className="mb-8 flex justify-center">
          <div className="p-4 bg-primary/10 rounded-2xl">
            <BookOpen className="h-16 w-16 text-primary" />
          </div>
        </div>
        <h1 className="mb-4 text-5xl font-bold tracking-tight">
          {t("landing.welcome_title")}
        </h1>
        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
          {t("landing.welcome_subtitle")}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 rounded-lg border border-border bg-card">
            <FolderOpen className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">{t("landing.organize_title")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("landing.organize_desc")}
            </p>
          </div>
          <div className="p-6 rounded-lg border border-border bg-card">
            <Tag className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">{t("landing.tag_title")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("landing.tag_desc")}
            </p>
          </div>
          <div className="p-6 rounded-lg border border-border bg-card">
            <Search className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">{t("landing.search_title")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("landing.search_desc")}
            </p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={() => navigate("/auth")}>
            {t("landing.get_started")}
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
            {t("landing.sign_in")}
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

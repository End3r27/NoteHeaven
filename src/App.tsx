import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { LanguageProvider } from "@/components/language/LanguageProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Notes from "./pages/Notes";
import DailyRecap from "./pages/DailyRecap";
import GraphView from "./pages/GraphView";
import ProfileSetup from "./pages/ProfileSetup";
import SharedNote from "./pages/SharedNote";
import NotFound from "./pages/NotFound";
import { CollaborationProvider } from '@/components/collaboration/CollaborationProvider';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <HashRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/notes" element={<Notes />} />
              <Route path="/daily" element={<DailyRecap />} />
              <Route path="/graph" element={<GraphView />} />
              <Route path="/profile-setup" element={<ProfileSetup />} />
              <Route path="/shared/:uuid" element={<SharedNote />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

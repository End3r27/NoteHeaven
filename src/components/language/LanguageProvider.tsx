import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "it";

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Auth page
    "auth.welcome_back": "Welcome back",
    "auth.create_account": "Create an account",
    "auth.enter_credentials": "Enter your credentials to access your notes",
    "auth.start_organizing": "Start organizing your thoughts with NoteHaven",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.sign_in": "Sign in",
    "auth.sign_up": "Sign up",
    "auth.loading": "Loading...",
    "auth.no_account": "Don't have an account? Sign up",
    "auth.have_account": "Already have an account? Sign in",
    "auth.welcome_toast": "Welcome back!",
    "auth.logged_in": "You've successfully logged in.",
    "auth.account_created": "Account created!",
    "auth.signed_up": "You've successfully signed up. Welcome to NoteHaven!",
    "auth.error": "Error",
    
    // Notes Header
    "notes.search": "Search notes...",
    "notes.semantic_search": "Semantic search (e.g., 'notes about project ideas')...",
    "notes.ai_search": "AI Search",
    "notes.ai_insights": "AI Insights",
    "notes.daily_recap": "Daily Recap",
    "notes.new_note": "New Note",
    "notes.graph": "Graph",
    "notes.select_or_create": "Select a note or create a new one",
    
    // Editor
    "editor.start_writing": "Start writing...",
    "editor.save": "Save",
    "editor.saved": "Saved",
    "editor.recap": "Recap",
    "editor.generating": "Generating...",
    "editor.suggest_tags": "Suggest Tags",
    "editor.suggesting": "Suggesting...",
    "editor.save_tags": "Save Tags",
    "editor.tags": "Tags",
    "editor.add_tag": "Add Tag",
    "editor.add_tag_placeholder": "New tag name",
    "editor.remove_tag": "Remove",
    "editor.delete": "Delete",
    "editor.last_edited": "Last edited:",
    
    // Sidebar
    "sidebar.folders": "Folders",
    "sidebar.create_new_folder": "Create New Folder",
    "sidebar.folder_name_placeholder": "Folder name",
    "sidebar.create_folder": "Create Folder",
    "sidebar.all_notes": "All Notes",
    "sidebar.tags": "Tags",
    "sidebar.sign_out": "Sign out",

    // Graph page
    "graph.back_to_notes": "Back to Notes",
    "graph.title": "Notes Graph",
    "graph.legend.notes": "Notes",
    "graph.legend.folders": "Folders",
    "graph.legend.tags": "Tags",
    "graph.legend.related": "Related",
    "graph.empty": "No notes to display. Create some notes to see the graph.",
    "graph.error_loading": "Error loading graph",
    "graph.tags": "Tags",

    // AI Insights
    "insights.title": "AI Insights",
    "insights.tab.recent": "Recent Activity",
    "insights.tab.folder": "By Folder",
    "insights.tab.tag": "By Tag",
    "insights.recent.title": "Recent Activity Recap",
    "insights.recent.desc": "Get an AI-generated summary of your recent notes and activity",
    "insights.generating": "Generating...",
    "insights.generate_recap": "Generate Recap",
    "insights.folder.title": "Folder Summary",
    "insights.folder.desc": "Summarize all notes within a specific folder",
    "insights.folder.select_placeholder": "Select a folder",
    "insights.generate_summary": "Generate Summary",
    "insights.tag.title": "Tag Summary",
    "insights.tag.desc": "Summarize all notes with a specific tag",
    "insights.tag.select_placeholder": "Select a tag",
    "insights.toast.summary_generated.title": "Summary Generated",
    "insights.toast.summary_generated.desc": "Analyzed {count} notes",
    "insights.toast.error.title": "Error",
    "insights.toast.error.desc": "Failed to generate summary. Please try again.",
    "insights.summary.header": "Summary",
    "insights.summary.analyzed_one": "{count} note analyzed",
    "insights.summary.analyzed_many": "{count} notes analyzed",
    // Daily Recap
    "daily.back_to_notes": "Back to Notes",
    "daily.title": "Daily Recap",
    "daily.subtitle": "A summary of your notes from the last 24 hours",
    "daily.generating": "Generating your daily recap...",
    "daily.ai_summary": "AI Summary",
    "daily.analyzed_one": "{count} note analyzed",
    "daily.analyzed_many": "{count} notes analyzed",
    "daily.todays_notes": "Today's Notes",
    "daily.todays_notes_desc": "All notes created or updated in the last 24 hours",
    "daily.no_content": "No content",
    "daily.updated": "Updated:",
    "daily.error.title": "Error",
    "daily.error.desc": "Failed to generate daily recap",
    "insights.empty.recent": "No notes found for recent activity and notes. Create some notes to get started!",
    "insights.empty.folder": "No notes found for notes in the \"{name}\" folder. Create some notes to get started!",
    "insights.empty.tag": "No notes found for notes tagged with \"{name}\". Create some notes to get started!",
  },
  it: {
    // Auth page
    "auth.welcome_back": "Bentornato",
    "auth.create_account": "Crea un account",
    "auth.enter_credentials": "Inserisci le tue credenziali per accedere alle note",
    "auth.start_organizing": "Inizia a organizzare i tuoi pensieri con NoteHaven",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.sign_in": "Accedi",
    "auth.sign_up": "Registrati",
    "auth.loading": "Caricamento...",
    "auth.no_account": "Non hai un account? Registrati",
    "auth.have_account": "Hai già un account? Accedi",
    "auth.welcome_toast": "Bentornato!",
    "auth.logged_in": "Hai effettuato l'accesso con successo.",
    "auth.account_created": "Account creato!",
    "auth.signed_up": "Ti sei registrato con successo. Benvenuto in NoteHaven!",
    "auth.error": "Errore",
    
    // Notes Header
    "notes.search": "Cerca note...",
    "notes.semantic_search": "Ricerca semantica (es. 'note su idee di progetto')...",
    "notes.ai_search": "Ricerca AI",
    "notes.ai_insights": "Insights AI",
    "notes.daily_recap": "Riepilogo Giornaliero",
    "notes.new_note": "Nuova Nota",
    "notes.graph": "Grafico",
    "notes.select_or_create": "Seleziona una nota o creane una nuova",
    
    // Editor
    "editor.start_writing": "Inizia a scrivere...",
    "editor.save": "Salva",
    "editor.saved": "Salvato",
    "editor.recap": "Riepilogo",
    "editor.generating": "Generazione...",
    "editor.suggest_tags": "Suggerisci tag",
    "editor.suggesting": "Suggerimento...",
    "editor.save_tags": "Salva tag",
    "editor.tags": "Tag",
    "editor.add_tag": "Aggiungi tag",
    "editor.add_tag_placeholder": "Nome nuovo tag",
    "editor.remove_tag": "Rimuovi",
    "editor.delete": "Elimina",
    "editor.last_edited": "Ultima modifica:",
    
    // Sidebar
    "sidebar.folders": "Cartelle",
    "sidebar.create_new_folder": "Crea nuova cartella",
    "sidebar.folder_name_placeholder": "Nome cartella",
    "sidebar.create_folder": "Crea cartella",
    "sidebar.all_notes": "Tutte le note",
    "sidebar.tags": "Tag",
    "sidebar.sign_out": "Esci",

    // Graph page
    "graph.back_to_notes": "Torna alle note",
    "graph.title": "Grafico delle note",
    "graph.legend.notes": "Note",
    "graph.legend.folders": "Cartelle",
    "graph.legend.tags": "Tag",
    "graph.legend.related": "Correlazioni",
    "graph.empty": "Nessuna nota da mostrare. Crea alcune note per vedere il grafico.",
    "graph.error_loading": "Errore nel caricamento del grafico",
    "graph.tags": "Tag",

    // AI Insights
    "insights.title": "Approfondimenti AI",
    "insights.tab.recent": "Attività recente",
    "insights.tab.folder": "Per cartella",
    "insights.tab.tag": "Per tag",
    "insights.recent.title": "Riepilogo attività recente",
    "insights.recent.desc": "Ottieni un riepilogo generato dall'AI delle note e attività recenti",
    "insights.generating": "Generazione...",
    "insights.generate_recap": "Genera riepilogo",
    "insights.folder.title": "Riepilogo cartella",
    "insights.folder.desc": "Riassumi tutte le note in una cartella specifica",
    "insights.folder.select_placeholder": "Seleziona una cartella",
    "insights.generate_summary": "Genera riepilogo",
    "insights.tag.title": "Riepilogo tag",
    "insights.tag.desc": "Riassumi tutte le note con un tag specifico",
    "insights.tag.select_placeholder": "Seleziona un tag",
    "insights.toast.summary_generated.title": "Riepilogo generato",
    "insights.toast.summary_generated.desc": "Analizzate {count} note",
    "insights.toast.error.title": "Errore",
    "insights.toast.error.desc": "Impossibile generare il riepilogo. Riprova.",
    "insights.summary.header": "Riepilogo",
    "insights.summary.analyzed_one": "{count} nota analizzata",
    "insights.summary.analyzed_many": "{count} note analizzate",
    // Daily Recap
    "daily.back_to_notes": "Torna alle note",
    "daily.title": "Riepilogo giornaliero",
    "daily.subtitle": "Un riepilogo delle tue note nelle ultime 24 ore",
    "daily.generating": "Generazione del riepilogo giornaliero...",
    "daily.ai_summary": "Riepilogo AI",
    "daily.analyzed_one": "{count} nota analizzata",
    "daily.analyzed_many": "{count} note analizzate",
    "daily.todays_notes": "Note di oggi",
    "daily.todays_notes_desc": "Tutte le note create o aggiornate nelle ultime 24 ore",
    "daily.no_content": "Nessun contenuto",
    "daily.updated": "Aggiornato:",
    "daily.error.title": "Errore",
    "daily.error.desc": "Impossibile generare il riepilogo giornaliero",
    "insights.empty.recent": "Nessuna nota trovata per attività recente e note. Crea alcune note per iniziare!",
    "insights.empty.folder": "Nessuna nota trovata per le note nella cartella \"{name}\". Crea alcune note per iniziare!",
    "insights.empty.tag": "Nessuna nota trovata per le note con tag \"{name}\". Crea alcune note per iniziare!",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("language");
    return (saved as Language) || "en";
  });

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.en] || key;
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

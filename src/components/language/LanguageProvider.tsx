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

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
  "editor.attachments": "Attachments",
  "editor.upload_file": "Upload File",
  "editor.uploading": "Uploading...",
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
    
    // Related Notes
    "related.title": "Related Notes",
    "related.description": "AI-suggested notes with similar content",
    
    // Collaboration
    "collaboration.share_folder": "Share Folder: {name}",
    "collaboration.collaborate_folder": "Collaborate on all notes in this folder",
    "collaboration.invite_collaborators": "Invite collaborators",
    "collaboration.search_nickname": "Search by nickname...",
    "collaboration.editor": "Editor",
    "collaboration.viewer": "Viewer", 
    "collaboration.owner": "Owner",
    "collaboration.search": "Search",
    "collaboration.manage_collaborators": "Manage Collaborators",
    "collaboration.invite_people": "Invite people to collaborate on \"{title}\"",
    
    // Comments
    "comments.loading": "Loading comments...",
    "comments.write_placeholder": "Write a comment...",
    "comments.comment_button": "Comment",
    "comments.login_required": "You must be logged in to comment",
    "comments.add_error": "Failed to add comment",
    "comments.react_login_required": "You must be logged in to react",
    "comments.reaction_error": "Failed to update reaction",
    
    // Share and Export
    "notes.share": "Share",
    "notes.export": "Export",
    "notes.comments": "Comments",
    
    // Storage
    "storage.used": "Storage Used",
    
    // Notifications
    "notifications.title": "Notifications",
    "notifications.no_notifications": "No notifications",
    "notifications.mark_read": "Mark as read",
    "notifications.accept": "Accept",
    "notifications.decline": "Decline",
    
    // Presence Status
    "presence.online_now": "Online now",
    "presence.last_seen": "Last seen {time}",
    
    // Profile Setup
    "profile_setup.welcome_title": "Welcome to NoteHaven!",
    "profile_setup.welcome_subtitle": "Let's set up your profile to get started",
    "profile_setup.step_progress": "Step {current} of {total}",
    "profile_setup.previous": "Previous",
    "profile_setup.next": "Next",
    "profile_setup.complete_setup": "Complete Setup",
    "profile_setup.creating": "Creating...",
    "profile_setup.footer_text": "Ready to organize your thoughts? ✨",
    
    // Step 1 - Basics
    "profile_setup.step1_title": "Let's start with the basics",
    "profile_setup.step1_subtitle": "Tell us who you are",
    "profile_setup.profile_picture": "Profile Picture",
    "profile_setup.upload_photo_hint": "Click the camera icon to upload a photo",
    "profile_setup.display_name": "Display Name",
    "profile_setup.display_name_placeholder": "What should we call you?",
    "profile_setup.display_name_hint": "This is how others will see you",
    "profile_setup.display_name_required": "*",
    
    // Step 2 - Style
    "profile_setup.step2_title": "Choose your style",
    "profile_setup.step2_subtitle": "Pick colors and tell us about yourself",
    "profile_setup.favorite_color": "Favorite Color",
    "profile_setup.favorite_color_required": "*",
    "profile_setup.color_hint": "This color will represent you in collaborative editing",
    "profile_setup.custom_color_hint": "Or pick a custom color",
    "profile_setup.about_you": "About You",
    "profile_setup.bio_placeholder": "Share something interesting about yourself...",
    "profile_setup.bio_hint": "Optional - Let others know more about you",
    
    // Step 3 - Personality
    "profile_setup.step3_title": "Almost done!",
    "profile_setup.step3_subtitle": "Add some personality tags (optional)",
    "profile_setup.personality_question": "What describes you best?",
    "profile_setup.personality_hint": "Choose up to 5 tags that represent your personality",
    "profile_setup.tags_selected": "{count}/5 selected",
    "profile_setup.profile_preview": "Profile Preview",
    "profile_setup.no_bio": "No bio provided",
    
    // Upload Messages
    "profile_setup.file_too_large": "File too large",
    "profile_setup.file_size_limit": "Please choose an image smaller than 5MB",
    "profile_setup.invalid_file_type": "Invalid file type",
    "profile_setup.choose_image": "Please choose an image file",
    "profile_setup.image_uploaded": "Image uploaded!",
    "profile_setup.image_updated": "Your profile picture has been updated",
    "profile_setup.upload_failed": "Upload failed",
    "profile_setup.upload_retry": "Failed to upload image. Please try again.",
    "profile_setup.invalid_nickname": "Invalid nickname",
    "profile_setup.nickname_length": "Nickname must be between 2 and 50 characters",
    "profile_setup.profile_created": "Profile created!",
    "profile_setup.welcome_message": "Welcome to NoteHaven! 🎉",
    "profile_setup.error": "Error",
    "profile_setup.creation_failed": "Failed to create profile. Please try again.",
    "profile_setup.loading": "Loading...",
    
    // Profile Page
    "profile.edit_profile": "Edit Profile",
    "profile.follow": "Follow",
    "profile.following": "Following",
    "profile.unfollow": "Unfollow",
    "profile.followers": "Followers",
    "profile.following_count": "Following",
    "profile.notes_count": "Notes",
    "profile.online": "Online",
    "profile.offline": "Offline",
    "profile.save_changes": "Save Changes",
    "profile.cancel": "Cancel",
    "profile.upload_new_photo": "Upload New Photo",
    "profile.nickname": "Nickname",
    "profile.bio": "Bio",
    "profile.favorite_color": "Favorite Color",
    "profile.profile_updated": "Profile updated!",
    "profile.changes_saved": "Your changes have been saved successfully",
    "profile.update_failed": "Failed to update profile",
    "profile.try_again": "Please try again",
    "profile.follow_success": "Now following {name}",
    "profile.unfollow_success": "Unfollowed {name}",
    "profile.follow_error": "Failed to follow user",
    "profile.unfollow_error": "Failed to unfollow user",
    "profile.followers_list": "Followers",
    "profile.following_list": "Following",
    "profile.no_followers": "No followers yet",
    "profile.no_following": "Not following anyone yet",
    "profile.close": "Close",
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
  "editor.attachments": "Allegati",
  "editor.upload_file": "Carica file",
  "editor.uploading": "Caricamento...",
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
    
    // Related Notes
    "related.title": "Note correlate",
    "related.description": "Note suggerite dall'AI con contenuto simile",
    
    // Collaboration
    "collaboration.share_folder": "Condividi cartella: {name}",
    "collaboration.collaborate_folder": "Collabora su tutte le note in questa cartella",
    "collaboration.invite_collaborators": "Invita collaboratori",
    "collaboration.search_nickname": "Cerca per nickname...",
    "collaboration.editor": "Editor",
    "collaboration.viewer": "Visualizzatore",
    "collaboration.owner": "Proprietario",
    "collaboration.search": "Cerca",
    "collaboration.manage_collaborators": "Gestisci collaboratori",
    "collaboration.invite_people": "Invita persone a collaborare su \"{title}\"",
    
    // Comments
    "comments.loading": "Caricamento commenti...",
    "comments.write_placeholder": "Scrivi un commento...",
    "comments.comment_button": "Commenta",
    "comments.login_required": "Devi essere connesso per commentare",
    "comments.add_error": "Impossibile aggiungere il commento",
    "comments.react_login_required": "Devi essere connesso per reagire",
    "comments.reaction_error": "Impossibile aggiornare la reazione",
    
    // Share and Export
    "notes.share": "Condividi",
    "notes.export": "Esporta",
    "notes.comments": "Commenti",
    
    // Storage
    "storage.used": "Spazio utilizzato",
    
    // Notifications
    "notifications.title": "Notifiche",
    "notifications.no_notifications": "Nessuna notifica",
    "notifications.mark_read": "Segna come letta",
    "notifications.accept": "Accetta",
    "notifications.decline": "Rifiuta",
    
    // Presence Status
    "presence.online_now": "Online ora",
    "presence.last_seen": "Visto l'ultima volta {time}",
    
    // Profile Setup
    "profile_setup.welcome_title": "Benvenuto su NoteHaven!",
    "profile_setup.welcome_subtitle": "Impostiamo il tuo profilo per iniziare",
    "profile_setup.step_progress": "Passo {current} di {total}",
    "profile_setup.previous": "Precedente",
    "profile_setup.next": "Avanti",
    "profile_setup.complete_setup": "Completa configurazione",
    "profile_setup.creating": "Creazione...",
    "profile_setup.footer_text": "Pronto a organizzare i tuoi pensieri? ✨",
    
    // Step 1 - Basics
    "profile_setup.step1_title": "Iniziamo con le basi",
    "profile_setup.step1_subtitle": "Raccontaci chi sei",
    "profile_setup.profile_picture": "Foto profilo",
    "profile_setup.upload_photo_hint": "Clicca l'icona della fotocamera per caricare una foto",
    "profile_setup.display_name": "Nome visualizzato",
    "profile_setup.display_name_placeholder": "Come dovremmo chiamarti?",
    "profile_setup.display_name_hint": "Così ti vedranno gli altri",
    "profile_setup.display_name_required": "*",
    
    // Step 2 - Style
    "profile_setup.step2_title": "Scegli il tuo stile",
    "profile_setup.step2_subtitle": "Scegli i colori e raccontaci di te",
    "profile_setup.favorite_color": "Colore preferito",
    "profile_setup.favorite_color_required": "*",
    "profile_setup.color_hint": "Questo colore ti rappresenterà nell'editing collaborativo",
    "profile_setup.custom_color_hint": "Oppure scegli un colore personalizzato",
    "profile_setup.about_you": "Su di te",
    "profile_setup.bio_placeholder": "Condividi qualcosa di interessante su di te...",
    "profile_setup.bio_hint": "Opzionale - Fai sapere agli altri di più su di te",
    
    // Step 3 - Personality
    "profile_setup.step3_title": "Quasi finito!",
    "profile_setup.step3_subtitle": "Aggiungi dei tag sulla personalità (opzionale)",
    "profile_setup.personality_question": "Cosa ti descrive meglio?",
    "profile_setup.personality_hint": "Scegli fino a 5 tag che rappresentano la tua personalità",
    "profile_setup.tags_selected": "{count}/5 selezionati",
    "profile_setup.profile_preview": "Anteprima profilo",
    "profile_setup.no_bio": "Nessuna biografia fornita",
    
    // Upload Messages
    "profile_setup.file_too_large": "File troppo grande",
    "profile_setup.file_size_limit": "Scegli un'immagine più piccola di 5MB",
    "profile_setup.invalid_file_type": "Tipo di file non valido",
    "profile_setup.choose_image": "Scegli un file immagine",
    "profile_setup.image_uploaded": "Immagine caricata!",
    "profile_setup.image_updated": "La tua foto profilo è stata aggiornata",
    "profile_setup.upload_failed": "Caricamento fallito",
    "profile_setup.upload_retry": "Impossibile caricare l'immagine. Riprova.",
    "profile_setup.invalid_nickname": "Nickname non valido",
    "profile_setup.nickname_length": "Il nickname deve essere tra 2 e 50 caratteri",
    "profile_setup.profile_created": "Profilo creato!",
    "profile_setup.welcome_message": "Benvenuto su NoteHaven! 🎉",
    "profile_setup.error": "Errore",
    "profile_setup.creation_failed": "Impossibile creare il profilo. Riprova.",
    "profile_setup.loading": "Caricamento...",
    
    // Profile Page
    "profile.edit_profile": "Modifica profilo",
    "profile.follow": "Segui",
    "profile.following": "Seguito",
    "profile.unfollow": "Non seguire",
    "profile.followers": "Follower",
    "profile.following_count": "Seguiti",
    "profile.notes_count": "Note",
    "profile.online": "Online",
    "profile.offline": "Offline",
    "profile.save_changes": "Salva modifiche",
    "profile.cancel": "Annulla",
    "profile.upload_new_photo": "Carica nuova foto",
    "profile.nickname": "Nickname",
    "profile.bio": "Biografia",
    "profile.favorite_color": "Colore preferito",
    "profile.profile_updated": "Profilo aggiornato!",
    "profile.changes_saved": "Le tue modifiche sono state salvate con successo",
    "profile.update_failed": "Impossibile aggiornare il profilo",
    "profile.try_again": "Riprova",
    "profile.follow_success": "Ora segui {name}",
    "profile.unfollow_success": "Hai smesso di seguire {name}",
    "profile.follow_error": "Impossibile seguire l'utente",
    "profile.unfollow_error": "Impossibile smettere di seguire l'utente",
    "profile.followers_list": "Follower",
    "profile.following_list": "Seguiti",
    "profile.no_followers": "Nessun follower ancora",
    "profile.no_following": "Non segue ancora nessuno",
    "profile.close": "Chiudi",
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

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type {
  UserPresence,
  Profile,
  CursorUpdate,
  SelectionUpdate,
  CollaborationState,
} from "@/types/shared";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/hooks/use-auth";

interface CollaborationContextType extends CollaborationState {
  updateCursor: (position: { x: number; y: number }) => void;
  updateSelection: (range: { start: number; end: number }) => void;
  setIsEditing: (isEditing: boolean) => void;
}

const CollaborationContext = createContext<CollaborationContextType | null>(null);

export function CollaborationProvider({ children }: { children: ReactNode }) {
  const { noteId } = useParams<{ noteId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<CollaborationState>({
    activeUsers: [],
    cursors: {},
    selections: {},
  });

  // Track editing state
  const [isEditing, setIsEditing] = useState(false);
  const lastActive = useRef<Date>(new Date());

  // Debounce cursor updates to avoid flooding the channel
  const debouncedCursorUpdate = useDebounce((position: { x: number; y: number }) => {
    if (!user || !noteId) return;

    supabase
      .from("user_presence")
      .upsert({
        user_id: user.id,
        note_id: noteId,
        cursor_x: position.x,
        cursor_y: position.y,
        is_active: true,
        last_seen: new Date().toISOString(),
      })
      .select()
      .single();
  }, 50);

  // Debounce selection updates
  const debouncedSelectionUpdate = useDebounce(
    (range: { start: number; end: number }) => {
      if (!user || !noteId) return;

      supabase
        .from("user_presence")
        .upsert({
          user_id: user.id,
          note_id: noteId,
          selection_start: range.start,
          selection_end: range.end,
          is_active: true,
          last_seen: new Date().toISOString(),
        })
        .select()
        .single();
    },
    50
  );

  // Update cursor position
  const updateCursor = useCallback(
    (position: { x: number; y: number }) => {
      if (!user) return;
      debouncedCursorUpdate(position);
    },
    [user, debouncedCursorUpdate]
  );

  // Update selection range
  const updateSelection = useCallback(
    (range: { start: number; end: number }) => {
      if (!user) return;
      debouncedSelectionUpdate(range);
    },
    [user, debouncedSelectionUpdate]
  );

  // Handle presence updates
  useEffect(() => {
    if (!user || !noteId) return;

    // Initialize presence
    const initializePresence = async () => {
      const { error } = await supabase.from("user_presence").upsert({
        user_id: user.id,
        note_id: noteId,
        is_active: true,
        last_seen: new Date().toISOString(),
      });

      if (error) {
        console.error("Error initializing presence:", error);
        toast({
          title: "Connection Error",
          description: "Failed to connect to collaboration service",
          variant: "destructive",
        });
      }
    };

    initializePresence();

    // Subscribe to presence changes
    const presenceSubscription = supabase
      .channel(`presence:${noteId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence",
          filter: `note_id=eq.${noteId}`,
        },
        async (payload) => {
          const presence = payload.new as any;
          const { user_id } = presence;

          // Skip updates from current user
          if (user_id === user?.id) return;

          // Fetch user profile for nickname and color
          const { data: profile } = await supabase
            .from("profiles")
            .select("nickname, favorite_color")
            .eq("id", user_id)
            .single();

          setState((prev) => {
            const newState = { ...prev };

            // Update user list
            if (payload.eventType === "DELETE") {
              newState.activeUsers = prev.activeUsers.filter((u) => u.user_id !== user_id);
              delete newState.cursors[user_id];
              delete newState.selections[user_id];
            } else {
              const userIndex = prev.activeUsers.findIndex((u) => u.user_id === user_id);
              const enhancedPresence = {
                ...presence,
                user: profile || { nickname: "Anonymous", favorite_color: "#3b82f6" }
              };

              if (userIndex === -1) {
                newState.activeUsers = [...prev.activeUsers, enhancedPresence];
              } else {
                newState.activeUsers = [...prev.activeUsers];
                newState.activeUsers[userIndex] = enhancedPresence;
              }

              // Update cursor position
              if (presence.cursor_x !== null && presence.cursor_y !== null) {
                newState.cursors = {
                  ...prev.cursors,
                  [user_id]: {
                    userId: user_id,
                    position: { x: presence.cursor_x, y: presence.cursor_y },
                    nickname: profile?.nickname || "Anonymous",
                    color: profile?.favorite_color || "#3b82f6",
                  },
                };
              }

              // Update selection
              if (presence.selection_start !== null && presence.selection_end !== null) {
                newState.selections = {
                  ...prev.selections,
                  [user_id]: {
                    userId: user_id,
                    range: { start: presence.selection_start, end: presence.selection_end },
                  },
                };
              }
            }

            return newState;
          });

          // Show toast for user joining/leaving
          if (payload.eventType === "INSERT" && profile) {
            toast({
              title: "User joined",
              description: `${profile.nickname || "Someone"} joined the note`,
            });
          } else if (payload.eventType === "DELETE" && profile) {
            toast({
              title: "User left",
              description: `${profile.nickname || "Someone"} left the note`,
            });
          }
        }
      )
      .subscribe();

    // Heartbeat interval to update last_seen
    const heartbeatInterval = setInterval(async () => {
      const now = new Date();
      if (now.getTime() - lastActive.current.getTime() > 1000) {
        const { error } = await supabase
          .from("user_presence")
          .upsert({
            user_id: user.id,
            note_id: noteId,
            is_active: isEditing,
            last_seen: now.toISOString(),
          })
          .select()
          .single();

        if (error) console.error("Error updating presence:", error);
        lastActive.current = now;
      }
    }, 5000);

    // Cleanup
    return () => {
      presenceSubscription.unsubscribe();
      clearInterval(heartbeatInterval);

      // Remove presence on unmount
      supabase
        .from("user_presence")
        .delete()
        .match({ user_id: user.id, note_id: noteId });
    };
  }, [user, noteId, isEditing, toast]);

  const value = {
    ...state,
    updateCursor,
    updateSelection,
    setIsEditing,
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error(
      "useCollaboration must be used within a CollaborationProvider"
    );
  }
  return context;
}
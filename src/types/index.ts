import type { Database } from "@/integrations/supabase/types";

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Profile Types
export interface Profile extends Tables<"profiles"> {
  nickname?: string | null;
  bio: string | null;
  favorite_color?: string | null;
  is_profile_complete: boolean | null;
  profile_pic_url?: string | null;
  used_storage: number | null;
}

// Collaboration Types
export interface UserPresence extends Tables<"user_presence"> {
  user?: Profile;
}

export interface Comment extends Tables<"comments"> {
  user?: Profile;
  reactions?: CommentReaction[];
}

export interface CommentReaction extends Tables<"comment_reactions"> {}

export interface Notification extends Tables<"notifications"> {
  actor?: Profile;
}

export interface Activity extends Tables<"activities"> {
  actor?: Profile;
}
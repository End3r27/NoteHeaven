// src/types/notifications.ts
// Updated to match the actual database schema

export type NotificationType =
  | "new_comment"
  | "comment_reply"
  | "share_invite"
  | "share_accept"
  | "note_fork"
  | "system";

export interface Notification {
  id: string;
  user_id: string;
  sender_id: string | null;
  type: NotificationType;
  title: string;
  content?: string | null;
  resource_id?: string | null;
  resource_type?: "note" | "folder" | null;
  is_read: boolean;
  created_at: string;
  // Joined data from relations
  sender?: {
    nickname: string;
  };
}
// Profile Types
export interface Profile {
  id: string;
  email: string;
  nickname?: string | null;
  bio: string | null;
  favorite_color?: string | null;
  is_profile_complete: boolean | null;
  profile_pic_url?: string | null;
  used_storage: number | null;
  created_at?: string;
  updated_at?: string;
}

// Collaboration Types
export interface UserPresence {
  id: string;
  user_id: string;
  note_id?: string;
  folder_id?: string;
  last_seen: string;
  cursor_position?: { x: number; y: number };
  is_active: boolean;
  user?: Profile;
}

export interface Comment {
  id: string;
  note_id: string;
  user_id: string;
  parent_id?: string;
  content: string;
  selection_start?: number;
  selection_end?: number;
  created_at: string;
  updated_at: string;
  user?: Profile;
  reactions?: CommentReaction[];
}

export interface CommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: "new_comment" | "comment_reply" | "share_invite" | "share_accept" | "note_fork";
  title: string;
  content?: string;
  resource_id?: string;
  resource_type?: string;
  actor_id?: string;
  actor?: Profile;
  is_read: boolean;
  created_at: string;
}

export interface Activity {
  id: string;
  user_id: string;
  action_type: "edit" | "comment" | "share" | "fork";
  resource_type: "note" | "folder";
  resource_id: string;
  metadata?: Record<string, any>;
  created_at: string;
  actor?: Profile;
}

// Real-time collaboration types
export interface CursorUpdate {
  userId: string;
  position: { x: number; y: number };
}

export interface SelectionUpdate {
  userId: string;
  range: { start: number; end: number };
}

export interface CollaborationState {
  activeUsers: UserPresence[];
  cursors: Record<string, CursorUpdate>;
  selections: Record<string, SelectionUpdate>;
}
export interface UserPresence {
  id: string;
  user_id: string;
  note_id?: string;
  folder_id?: string;
  last_seen: string;
  cursor_position?: { x: number; y: number };
  is_active: boolean;
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
  type: 'new_comment' | 'comment_reply' | 'share_invite' | 'share_accept' | 'note_fork';
  title: string;
  content?: string;
  resource_id?: string;
  resource_type?: string;
  actor_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface Activity {
  id: string;
  user_id: string;
  action_type: 'edit' | 'comment' | 'share' | 'fork';
  resource_type: 'note' | 'folder';
  resource_id: string;
  metadata?: Record<string, any>;
  created_at: string;
}
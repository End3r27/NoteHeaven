import { type Database as GeneratedDatabase } from './generated-types';

// Extend the existing Database type with our new tables
export interface Database extends GeneratedDatabase {
  public: {
    Tables: {
      user_presence: {
        Row: {
          id: string;
          user_id: string;
          note_id?: string;
          folder_id?: string;
          last_seen: string;
          cursor_position?: { x: number; y: number };
          is_active: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          note_id?: string;
          folder_id?: string;
          last_seen?: string;
          cursor_position?: { x: number; y: number };
          is_active?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          note_id?: string;
          folder_id?: string;
          last_seen?: string;
          cursor_position?: { x: number; y: number };
          is_active?: boolean;
        };
      };
      comments: {
        Row: {
          id: string;
          note_id: string;
          user_id: string;
          parent_id?: string;
          content: string;
          selection_start?: number;
          selection_end?: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          note_id: string;
          user_id: string;
          parent_id?: string;
          content: string;
          selection_start?: number;
          selection_end?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          note_id?: string;
          user_id?: string;
          parent_id?: string;
          content?: string;
          selection_start?: number;
          selection_end?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      comment_reactions: {
        Row: {
          id: string;
          comment_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          comment_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          comment_id?: string;
          user_id?: string;
          emoji?: string;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          content?: string;
          resource_id?: string;
          resource_type?: string;
          actor_id?: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          content?: string;
          resource_id?: string;
          resource_type?: string;
          actor_id?: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          content?: string;
          resource_id?: string;
          resource_type?: string;
          actor_id?: string;
          is_read?: boolean;
          created_at?: string;
        };
      };
      activities: {
        Row: {
          id: string;
          user_id: string;
          action_type: string;
          resource_type: string;
          resource_id: string;
          metadata?: Record<string, any>;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action_type: string;
          resource_type: string;
          resource_id: string;
          metadata?: Record<string, any>;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action_type?: string;
          resource_type?: string;
          resource_id?: string;
          metadata?: Record<string, any>;
          created_at?: string;
        };
      };
    } & GeneratedDatabase['public']['Tables'];
    Views: GeneratedDatabase['public']['Views'];
    Functions: GeneratedDatabase['public']['Functions'];
    Enums: GeneratedDatabase['public']['Enums'];
    CompositeTypes: GeneratedDatabase['public']['CompositeTypes'];
  };
}
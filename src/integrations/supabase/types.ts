export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      notifications: {
        Row: {
          id: string
          user_id: string
          type: "new_comment" | "comment_reply" | "share_invite" | "share_accept" | "note_fork"
          title: string
          content?: string
          resource_id?: string
          resource_type?: "note" | "folder"
          actor_id?: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: "new_comment" | "comment_reply" | "share_invite" | "share_accept" | "note_fork"
          title: string
          content?: string
          resource_id?: string
          resource_type?: "note" | "folder"
          actor_id?: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: "new_comment" | "comment_reply" | "share_invite" | "share_accept" | "note_fork"
          title?: string
          content?: string
          resource_id?: string
          resource_type?: "note" | "folder"
          actor_id?: string
          is_read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      },
      attachments: {
        Row: {
          created_at: string | null
          file_url: string
          filename: string
          filesize: number
          id: string
          mime_type: string | null
          note_id: string
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_url: string
          filename: string
          filesize: number
          id?: string
          mime_type?: string | null
          note_id: string
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_url?: string
          filename?: string
          filesize?: number
          id?: string
          mime_type?: string | null
          note_id?: string
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      note_tags: {
        Row: {
          created_at: string | null
          id: string
          note_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          note_id: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          note_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_tags_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          body: string | null
          created_at: string | null
          folder_id: string | null
          id: string
          is_public: boolean | null
          public_uuid: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          folder_id?: string | null
          id?: string
          is_public?: boolean | null
          public_uuid?: string | null
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          folder_id?: string | null
          id?: string
          is_public?: boolean | null
          public_uuid?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          updated_at: string | null
          used_storage: number | null
          bio: string | null
          favorite_color: string | null
          is_profile_complete: boolean | null
          nickname: string | null
          profile_pic_url: string | null
          avatar_url: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          updated_at?: string | null
          used_storage?: number | null
          bio?: string | null
          favorite_color?: string | null
          is_profile_complete?: boolean | null
          nickname?: string | null
          profile_pic_url?: string | null
          avatar_url?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          updated_at?: string | null
          used_storage?: number | null
          bio?: string | null
          favorite_color?: string | null
          is_profile_complete?: boolean | null
          nickname?: string | null
          profile_pic_url?: string | null
          avatar_url?: string | null
        }
        Relationships: []
      }
      shared_folders: {
        Row: {
          accepted: boolean | null
          created_at: string | null
          folder_id: string
          id: string
          invited_by: string
          permission: "viewer" | "editor" | "owner"
          user_id: string
        }
        Insert: {
          accepted?: boolean | null
          created_at?: string | null
          folder_id: string
          id?: string
          invited_by: string
          permission: "viewer" | "editor" | "owner"
          user_id: string
        }
        Update: {
          accepted?: boolean | null
          created_at?: string | null
          folder_id?: string
          id?: string
          invited_by?: string
          permission?: "viewer" | "editor" | "owner"
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_folders_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_folders_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_folders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      shared_notes: {
        Row: {
          accepted: boolean | null
          created_at: string | null
          id: string
          invited_by: string
          note_id: string
          permission: "viewer" | "editor"
          user_id: string
        }
        Insert: {
          accepted?: boolean | null
          created_at?: string | null
          id?: string
          invited_by: string
          note_id: string
          permission: "viewer" | "editor"
          user_id: string
        }
        Update: {
          accepted?: boolean | null
          created_at?: string | null
          id?: string
          invited_by?: string
          note_id?: string
          permission?: "viewer" | "editor"
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_notes_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_notes_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      },
      comments: {
        Row: {
          id: string
          note_id: string
          user_id: string
          parent_id?: string
          content: string
          selection_start?: number
          selection_end?: number
          resolved: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          note_id: string
          user_id: string
          parent_id?: string
          content: string
          selection_start?: number
          selection_end?: number
          resolved?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          note_id?: string
          user_id?: string
          parent_id?: string
          content?: string
          selection_start?: number
          selection_end?: number
          resolved?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          }
        ]
      },
      comment_reactions: {
        Row: {
          id: string
          comment_id: string
          user_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          comment_id: string
          user_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          id?: string
          comment_id?: string
          user_id?: string
          emoji?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      tags: {
        Row: {
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      },
      notifications: {
        Row: {
          id: string
          user_id: string
          type: "new_comment" | "comment_reply" | "share_invite" | "share_accept" | "note_fork"
          title: string
          content?: string
          resource_id?: string
          resource_type?: "note" | "folder"
          actor_id?: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: "new_comment" | "comment_reply" | "share_invite" | "share_accept" | "note_fork"
          title: string
          content?: string
          resource_id?: string
          resource_type?: "note" | "folder"
          actor_id?: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: "new_comment" | "comment_reply" | "share_invite" | "share_accept" | "note_fork"
          title?: string
          content?: string
          resource_id?: string
          resource_type?: "note" | "folder"
          actor_id?: string
          is_read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      },
      activities: {
          Row: {
            id: string
            user_id: string
            action_type: "edit" | "comment" | "share" | "fork"
            resource_type: "note" | "folder"
            resource_id: string
            metadata?: Record<string, any>
            created_at: string
          }
          Insert: {
            id?: string
            user_id: string
            action_type: "edit" | "comment" | "share" | "fork"
            resource_type: "note" | "folder"
            resource_id: string
            metadata?: Record<string, any>
            created_at?: string
          }
          Update: {
            id?: string
            user_id?: string
            action_type?: "edit" | "comment" | "share" | "fork"
            resource_type?: "note" | "folder"
            resource_id?: string
            metadata?: Record<string, any>
            created_at?: string
          }
          Relationships: [
            {
              foreignKeyName: "activities_user_id_fkey"
              columns: ["user_id"]
              isOneToOne: false
              referencedRelation: "profiles"
              referencedColumns: ["id"]
            }
          ]
        }
    Views: {
      [_ in never]: never
    }
    Functions: {
      insert_notification: {
        Args: {
          p_user_id: string;
          p_type: "new_comment" | "comment_reply" | "share_invite" | "share_accept" | "note_fork";
          p_title: string;
          p_content?: string;
          p_resource_id?: string;
          p_resource_type?: "note" | "folder";
          p_actor_id?: string;
        };
        Returns: {
          id: string;
        };
      };
      mark_notification_as_read: {
        Args: {
          p_notification_id: string;
        };
        Returns: {
          success: boolean;
        };
      };
      cleanup_inactive_presence: {
        Args: Record<string, never>;
        Returns: void;
      };
      handle_new_comment: {
        Args: Record<string, never>;
        Returns: void;
      };
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

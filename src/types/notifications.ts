export type NotificationType =
  | "invite"
  | "comment"
  | "mention"
  | "edit"
  | "system";

export interface Notification {
  id: string;
  user_id: string;
  sender_id: string;
  type: NotificationType;
  message: string;
  data?: {
    noteId?: string;
    folderId?: string;
    senderName?: string;
  };
  is_read: boolean;
  created_at: string;
}

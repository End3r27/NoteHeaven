export interface Attachment {
  id: string;
  note_id: string;
  user_id: string;
  filename: string;
  file_url: string;
  filesize: number;
  mime_type?: string;
  uploaded_at?: string;
  created_at?: string;
}

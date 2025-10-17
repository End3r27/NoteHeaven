export interface Profile {
  id: string;
  email: string;
  nickname: string | null;
  bio: string | null;
  favorite_color: string | null;
  is_profile_complete: boolean | null;
  profile_pic_url: string | null;
  used_storage: number | null;
  created_at?: string;
  updated_at?: string;
}


export interface Profile {
  id: string;
  email: string;
  created_at?: string;
  updated_at?: string;
  used_storage?: number;
}

export interface UserProfile {
  id: string;
  user_id: string;
  nickname: string;
  profile_pic_url?: string;
  favorite_color: string;
  bio?: string;
  is_profile_complete: boolean;
  created_at?: string;
  updated_at?: string;
}

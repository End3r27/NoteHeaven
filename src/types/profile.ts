export interface Profile {
  id: string;
  email: string;
  nickname: string | null;
  bio: string | null;
  favorite_color: string | null;
  is_profile_complete: boolean | null;
  profile_pic_url: string | null;
  used_storage: number | null;
  last_seen_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FollowRelationship {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface ProfileStats {
  follower_count: number;
  following_count: number;
  is_following?: boolean;
}


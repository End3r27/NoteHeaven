import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/components/language/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Edit, Users, UserPlus, UserMinus, Camera, Heart, MessageCircle } from "lucide-react";
import type { Profile, ProfileStats } from "@/types/profile";

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const { user, refreshProfile, refreshKey } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ProfileStats>({ follower_count: 0, following_count: 0 });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<Profile[]>([]);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  
  const [editForm, setEditForm] = useState({
    nickname: "",
    bio: "",
    favorite_color: "#3b82f6"
  });

  const isOwnProfile = user?.id === id;

  useEffect(() => {
    if (id) {
      fetchProfile();
      fetchStats();
    }
  }, [id]);

  const fetchProfile = async () => {
    if (!id) return;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
      navigate("/notes");
      return;
    }

    setProfile(data);
    setEditForm({
      nickname: data.nickname || "",
      bio: data.bio || "",
      favorite_color: data.favorite_color || "#3b82f6"
    });
    setLoading(false);
  };

  const fetchStats = async () => {
    if (!id || !user) return;

    try {
      // Get follower count
      const { data: followerCount, error: followerError } = await supabase
        .rpc('get_follower_count', { user_id: id });
      
      // Get following count  
      const { data: followingCount, error: followingError } = await supabase
        .rpc('get_following_count', { user_id: id });

      // Check if current user follows this profile
      let isFollowing = false;
      if (!isOwnProfile) {
        const { data: followCheck, error: followError } = await supabase
          .rpc('is_following', { follower_id: user.id, following_id: id });
        isFollowing = followCheck || false;
      }

      if (followerError || followingError) {
        console.error("Error fetching stats:", followerError || followingError);
      } else {
        setStats({
          follower_count: followerCount || 0,
          following_count: followingCount || 0,
          is_following: isFollowing
        });
      }
    } catch (error) {
      console.error("Error fetching profile stats:", error);
    }
  };

  const fetchFollowers = async () => {
    if (!id) return;
    
    const { data, error } = await supabase
      .from("followers")
      .select(`
        follower_id,
        profiles!followers_follower_id_fkey(id, nickname, favorite_color, profile_pic_url, bio)
      `)
      .eq("following_id", id);

    if (!error && data) {
      setFollowers(data.map(f => f.profiles).filter(Boolean) as Profile[]);
    }
  };

  const fetchFollowing = async () => {
    if (!id) return;
    
    const { data, error } = await supabase
      .from("followers")
      .select(`
        following_id,
        profiles!followers_following_id_fkey(id, nickname, favorite_color, profile_pic_url, bio)
      `)
      .eq("follower_id", id);

    if (!error && data) {
      setFollowing(data.map(f => f.profiles).filter(Boolean) as Profile[]);
    }
  };

  const handleFollow = async () => {
    if (!user || !id || isOwnProfile) return;

    try {
      if (stats.is_following) {
        // Unfollow
        const { error } = await supabase
          .from("followers")
          .delete()
          .match({ follower_id: user.id, following_id: id });

        if (error) throw error;

        setStats(prev => ({
          ...prev,
          follower_count: prev.follower_count - 1,
          is_following: false
        }));

        toast({
          title: "Unfollowed",
          description: `You are no longer following ${profile?.nickname}`,
        });
      } else {
        // Follow
        const { error } = await supabase
          .from("followers")
          .insert({ follower_id: user.id, following_id: id });

        if (error) throw error;

        setStats(prev => ({
          ...prev,
          follower_count: prev.follower_count + 1,
          is_following: true
        }));

        toast({
          title: "Following",
          description: `You are now following ${profile?.nickname}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !isOwnProfile) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          nickname: editForm.nickname,
          bio: editForm.bio,
          favorite_color: editForm.favorite_color,
          is_profile_complete: true
        })
        .eq("id", user.id);

      if (error) throw error;

      setProfile(prev => prev ? {
        ...prev,
        nickname: editForm.nickname,
        bio: editForm.bio,
        favorite_color: editForm.favorite_color,
        is_profile_complete: true
      } : null);

      setEditing(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !isOwnProfile) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `profile-pics/${fileName}`;

      console.log('Uploading file:', fileName, 'Size:', file.size, 'Type:', file.type);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);

      console.log('Generated public URL:', publicUrl);

      // Verify the file actually exists
      const { data: fileExists, error: checkError } = await supabase.storage
        .from('attachments')
        .list('profile-pics', {
          search: fileName
        });

      console.log('File exists check:', fileExists, checkError);

      // Add cache-busting parameter to ensure fresh image loads
      const cacheBustUrl = `${publicUrl}?v=${Date.now()}`;

      console.log('Final URL with cache busting:', cacheBustUrl);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_pic_url: cacheBustUrl })
        .eq('id', user.id);

      if (updateError) {
        console.error('Database update error:', updateError);
        throw updateError;
      }

      console.log('Database updated successfully');

      setProfile(prev => prev ? { ...prev, profile_pic_url: cacheBustUrl } : null);
      
      // Also refresh the profile data to ensure consistency
      await fetchProfile();
      console.log('Local profile refreshed');
      
      // Refresh the auth profile data to update header and other components
      if (refreshProfile) {
        await refreshProfile();
        console.log('Auth profile refreshed');
      }

      // Force image refresh across all components
      setTimeout(() => {
        // Update all avatar images with the new URL
        const images = document.querySelectorAll('img');
        images.forEach((img: any) => {
          if (img.src && (img.src.includes(user.id) || img.src.includes('profile-pics'))) {
            console.log('Updating image src from', img.src, 'to', cacheBustUrl);
            img.src = cacheBustUrl;
            // Force reload by toggling src
            const originalSrc = img.src;
            img.src = '';
            setTimeout(() => img.src = originalSrc, 10);
          }
        });

        // Force React state refresh by triggering window resize
        window.dispatchEvent(new Event('resize'));
      }, 500);
      
      toast({
        title: "Profile picture updated",
        description: "Your new profile picture has been saved",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getOnlineStatus = () => {
    if (!profile?.last_seen_at) return "offline";
    const lastSeen = new Date(profile.last_seen_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
    
    if (diffMinutes < 5) return "online";
    if (diffMinutes < 30) return "away";
    return "offline";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "away": return "bg-yellow-500";
      default: return "bg-gray-400";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Profile not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border h-14 flex items-center px-4 gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/notes")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Notes
        </Button>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader className="pb-6">
            <div className="flex items-start gap-6">
              <div className="relative">
                <div className="relative">
                  <Avatar key={`profile-avatar-${refreshKey}`} className="h-24 w-24 border-4" style={{ borderColor: profile.favorite_color || "#3b82f6" }}>
                    <AvatarImage src={profile.profile_pic_url || undefined} alt={profile.nickname || ""} />
                    <AvatarFallback style={{ backgroundColor: profile.favorite_color || "#3b82f6", color: "#ffffff" }}>
                      {profile.nickname?.[0]?.toUpperCase() || profile.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-background ${getStatusColor(getOnlineStatus())}`} />
                </div>
                
                {isOwnProfile && (
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                    <Camera className="h-6 w-6 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  {editing ? (
                    <Input
                      value={editForm.nickname}
                      onChange={(e) => setEditForm(prev => ({ ...prev, nickname: e.target.value }))}
                      placeholder="Your nickname"
                      className="text-2xl font-bold h-auto p-1 border-0 shadow-none"
                    />
                  ) : (
                    <h1 className="text-2xl font-bold">{profile.nickname || "Anonymous User"}</h1>
                  )}
                  
                  {isOwnProfile ? (
                    editing ? (
                      <div className="flex gap-2">
                        <Button onClick={handleSaveProfile} size="sm">Save</Button>
                        <Button onClick={() => setEditing(false)} variant="outline" size="sm">Cancel</Button>
                      </div>
                    ) : (
                      <Button onClick={() => setEditing(true)} variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    )
                  ) : (
                    <Button onClick={handleFollow} variant={stats.is_following ? "outline" : "default"} size="sm">
                      {stats.is_following ? (
                        <>
                          <UserMinus className="h-4 w-4 mr-2" />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Follow
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <div className="flex gap-4 mb-4">
                  <Dialog open={showFollowers} onOpenChange={setShowFollowers}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" className="p-0 h-auto" onClick={fetchFollowers}>
                        <span className="font-semibold">{stats.follower_count}</span>
                        <span className="ml-1 text-muted-foreground">followers</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Followers</DialogTitle>
                        <DialogDescription>People following {profile.nickname}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {followers.map((follower) => (
                          <div key={follower.id} className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer"
                               onClick={() => navigate(`/profile/${follower.id}`)}>
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={follower.profile_pic_url || undefined} />
                              <AvatarFallback style={{ backgroundColor: follower.favorite_color || "#3b82f6" }}>
                                {follower.nickname?.[0]?.toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{follower.nickname}</p>
                              {follower.bio && <p className="text-sm text-muted-foreground">{follower.bio}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showFollowing} onOpenChange={setShowFollowing}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" className="p-0 h-auto" onClick={fetchFollowing}>
                        <span className="font-semibold">{stats.following_count}</span>
                        <span className="ml-1 text-muted-foreground">following</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Following</DialogTitle>
                        <DialogDescription>People {profile.nickname} follows</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {following.map((user) => (
                          <div key={user.id} className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer"
                               onClick={() => navigate(`/profile/${user.id}`)}>
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.profile_pic_url || undefined} />
                              <AvatarFallback style={{ backgroundColor: user.favorite_color || "#3b82f6" }}>
                                {user.nickname?.[0]?.toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.nickname}</p>
                              {user.bio && <p className="text-sm text-muted-foreground">{user.bio}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {editing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={editForm.bio}
                        onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Tell us about yourself..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="color">Favorite Color</Label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          id="color"
                          value={editForm.favorite_color}
                          onChange={(e) => setEditForm(prev => ({ ...prev, favorite_color: e.target.value }))}
                          className="w-12 h-8 rounded border border-input"
                        />
                        <span className="text-sm text-muted-foreground">Used for avatars and highlights</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  profile.bio && (
                    <p className="text-muted-foreground">{profile.bio}</p>
                  )
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <Badge variant={getOnlineStatus() === "online" ? "default" : "secondary"}>
                        {getOnlineStatus()}
                      </Badge>
                    </div>
                    {profile.last_seen_at && (
                      <div className="flex justify-between">
                        <span>Last seen:</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(profile.last_seen_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Joined:</span>
                      <span className="text-sm text-muted-foreground">
                        {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "Unknown"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span>Favorite Color:</span>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded-full border border-border"
                          style={{ backgroundColor: profile.favorite_color || "#3b82f6" }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {profile.favorite_color || "#3b82f6"}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
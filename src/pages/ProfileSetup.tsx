import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, Sparkles, Palette, User as UserIcon, FileText, Check, ArrowRight, Moon, Sun, Languages } from "lucide-react";
import { useLanguage } from "@/components/language/LanguageProvider";
import { useTheme } from "@/components/theme/ThemeProvider";

const PRESET_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", 
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"
];

const PERSONALITY_TAG_KEYS = [
  "personality.creative", "personality.analytical", "personality.organized", "personality.spontaneous",
  "personality.collaborative", "personality.independent", "personality.detail_oriented", "personality.big_picture",
  "personality.tech_savvy", "personality.artistic", "personality.strategic", "personality.innovative"
];

const ProfileSetup = () => {
  const [user, setUser] = useState<User | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [favoriteColor, setFavoriteColor] = useState("#3b82f6");
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const totalSteps = 3;

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        setInitialLoading(false);
        return;
      }

      setUser(session.user);

      // Load profile to prefill fields and redirect if already complete
      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname, bio, favorite_color, is_profile_complete, profile_pic_url')
        .eq('id', session.user.id)
        .single();

      if (profile?.is_profile_complete) {
        navigate('/notes');
        return;
      }

      if (profile) {
        setNickname(profile.nickname ?? "");
        setBio(profile.bio ?? "");
        if (profile.favorite_color) setFavoriteColor(profile.favorite_color);
        if (profile.profile_pic_url) setProfilePicture(profile.profile_pic_url);
      }

      setInitialLoading(false);
    };

    init();
  }, [navigate]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t("profile_setup.file_too_large"),
        description: t("profile_setup.file_size_limit"),
        variant: "destructive"
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t("profile_setup.invalid_file_type"),
        description: t("profile_setup.choose_image"),
        variant: "destructive"
      });
      return;
    }

    setUploadingImage(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setProfilePicture(publicUrl);
      
      toast({
        title: t("profile_setup.image_uploaded"),
        description: t("profile_setup.image_updated")
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: t("profile_setup.upload_failed"),
        description: t("profile_setup.upload_retry"),
        variant: "destructive"
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const togglePersonalityTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag].slice(0, 5) // Max 5 tags
    );
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (nickname.length < 2 || nickname.length > 50) {
      toast({
        title: t("profile_setup.invalid_nickname"),
        description: t("profile_setup.nickname_length"),
        variant: "destructive"
      });
      return;
    }

    if (!user) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nickname,
          bio: bio || null,
          favorite_color: favoriteColor,
          profile_pic_url: profilePicture,
          is_profile_complete: true
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: t("profile_setup.profile_created"),
        description: t("profile_setup.welcome_message")
      });

      navigate("/notes");
    } catch (error) {
      console.error('Error creating profile:', error);
      toast({
        title: t("profile_setup.error"),
        description: t("profile_setup.creation_failed"),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <UserIcon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">{t("profile_setup.step1_title")}</h3>
              <p className="text-muted-foreground">{t("profile_setup.step1_subtitle")}</p>
            </div>

            {/* Profile Picture Upload */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">{t("profile_setup.profile_picture")}</Label>
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                    <AvatarImage src={profilePicture || undefined} />
                    <AvatarFallback 
                      className="text-2xl font-bold text-white"
                      style={{ backgroundColor: favoriteColor }}
                    >
                      {nickname?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    type="button"
                    size="sm"
                    className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0 shadow-lg"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground text-center">
                  {t("profile_setup.upload_photo_hint")}
                </p>
              </div>
            </div>

            {/* Nickname */}
            <div className="space-y-2">
              <Label htmlFor="nickname" className="text-sm font-medium">{t("profile_setup.display_name")} {t("profile_setup.display_name_required")}</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={t("profile_setup.display_name_placeholder")}
                maxLength={50}
                className="text-center text-lg font-medium"
                required
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("profile_setup.display_name_hint")}</span>
                <span>{nickname.length}/50</span>
              </div>
            </div>
          </motion.div>
        );
      
      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Palette className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">{t("profile_setup.step2_title")}</h3>
              <p className="text-muted-foreground">{t("profile_setup.step2_subtitle")}</p>
            </div>

            {/* Favorite Color */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">{t("profile_setup.favorite_color")} {t("profile_setup.favorite_color_required")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("profile_setup.color_hint")}
              </p>
              <div className="grid grid-cols-8 gap-2">
                {PRESET_COLORS.map((color) => (
                  <motion.button
                    key={color}
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setFavoriteColor(color)}
                    className={`aspect-square rounded-full transition-all relative ${
                      favoriteColor === color 
                        ? "ring-2 ring-offset-2 ring-primary scale-110" 
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    {favoriteColor === color && (
                      <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />
                    )}
                  </motion.button>
                ))}
              </div>
              <div className="flex items-center space-x-2">
                <Input
                  type="color"
                  value={favoriteColor}
                  onChange={(e) => setFavoriteColor(e.target.value)}
                  className="w-16 h-10"
                />
                <span className="text-sm text-muted-foreground">{t("profile_setup.custom_color_hint")}</span>
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-sm font-medium">{t("profile_setup.about_you")}</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t("profile_setup.bio_placeholder")}
                maxLength={200}
                rows={3}
                className="resize-none"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("profile_setup.bio_hint")}</span>
                <span className={bio.length > 180 ? "text-orange-500" : ""}>
                  {bio.length}/200
                </span>
              </div>
            </div>
          </motion.div>
        );
      
      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">{t("profile_setup.step3_title")}</h3>
              <p className="text-muted-foreground">{t("profile_setup.step3_subtitle")}</p>
            </div>

            {/* Personality Tags */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">{t("profile_setup.personality_question")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("profile_setup.personality_hint")}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PERSONALITY_TAG_KEYS.map((tagKey) => {
                  const tagValue = t(tagKey);
                  const isSelected = selectedTags.includes(tagValue);
                  return (
                    <motion.button
                      key={tagKey}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => togglePersonalityTag(tagValue)}
                      disabled={!isSelected && selectedTags.length >= 5}
                      className={`p-3 rounded-lg text-sm font-medium transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {tagValue}
                    </motion.button>
                  );
                })}
              </div>
              <div className="text-center">
                <Badge variant="outline" className="text-xs">
                  {t("profile_setup.tags_selected").replace("{count}", selectedTags.length.toString())}
                </Badge>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-sm">{t("profile_setup.profile_preview")}</h4>
              <div className="flex items-center space-x-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={profilePicture || undefined} />
                  <AvatarFallback 
                    className="text-lg font-bold text-white"
                    style={{ backgroundColor: favoriteColor }}
                  >
                    {nickname?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{nickname || t("profile_setup.display_name")}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {bio || t("profile_setup.no_bio")}
                  </p>
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedTags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {selectedTags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{selectedTags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        );
      
      default:
        return null;
    }
  };

  if (initialLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <div className="text-muted-foreground">{t("profile_setup.loading")}</div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              NoteHaven
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === "en" ? "it" : "en")}
              className="h-8 w-8 p-0"
            >
              <Languages className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-8 w-8 p-0"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)] p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
        <Card className="backdrop-blur-sm bg-background/95 border-0 shadow-2xl">
          <CardHeader className="text-center pb-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                {t("profile_setup.welcome_title")}
              </CardTitle>
              <CardDescription className="text-base mt-2">
                {t("profile_setup.welcome_subtitle")}
              </CardDescription>
            </motion.div>
            
            {/* Progress */}
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>{t("profile_setup.step_progress").replace("{current}", currentStep.toString()).replace("{total}", totalSteps.toString())}</span>
                <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
              </div>
              <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
            </div>
          </CardHeader>
          
          <CardContent className="px-6 pb-6">
            <form onSubmit={handleSubmit}>
              <AnimatePresence mode="wait">
                {getStepContent()}
              </AnimatePresence>
              
              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrev}
                  disabled={currentStep === 1}
                  className={currentStep === 1 ? "invisible" : ""}
                >
                  {t("profile_setup.previous")}
                </Button>
                
                {currentStep < totalSteps ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={currentStep === 1 && nickname.length < 2}
                    className="min-w-[120px]"
                  >
                    {t("profile_setup.next")}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={loading || nickname.length < 2}
                    className="min-w-[120px] bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        {t("profile_setup.creating")}
                      </>
                    ) : (
                      <>
                        {t("profile_setup.complete_setup")}
                        <Sparkles className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
        
        {/* Footer */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-muted-foreground mt-6"
        >
          {t("profile_setup.footer_text")}
        </motion.p>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfileSetup;
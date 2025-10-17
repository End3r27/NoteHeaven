import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Comment, CommentReaction, Profile } from "@/types/shared";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";

interface CommentsProps {
  noteId: string;
}

interface CommentWithUser {
  id: string;
  note_id: string;
  user_id: string;
  parent_id?: string;
  content: string;
  selection_start?: number;
  selection_end?: number;
  created_at: string;
  updated_at: string;
  user: Profile;
  reactions: CommentReaction[];
}

const EMOJI_OPTIONS = ["👍", "❤️", "🔥", "🎉", "🤔", "👀"];

export function Comments({ noteId }: CommentsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    const fetchComments = async () => {
      try {
        type CommentWithProfile = {
          id: string;
          note_id: string;
          user_id: string;
          parent_id?: string;
          content: string;
          selection_start?: number;
          selection_end?: number;
          created_at: string;
          updated_at: string;
          profiles: Profile;
        };

        const { data: comments, error } = await supabase
          .from('comments')
          .select(`
            *,
            profiles (*)
          `)
          .eq('note_id', noteId)
          .order('created_at', { ascending: true }) as {
            data: CommentWithProfile[] | null;
            error: Error | null;
          };

        if (error) throw error;

        // Fetch reactions for all comments
        const { data: reactions, error: reactionsError } = await supabase
          .from("comment_reactions")
          .select("*")
          .in(
            "comment_id",
            comments?.map((c) => c.id) ?? []
          );

        if (reactionsError) throw reactionsError;

        setComments(
          comments?.map((comment) => ({
            ...comment,
            user: comment.profiles,
            reactions: reactions?.filter((r) => r.comment_id === comment.id) ?? [],
          })) ?? []
        );
      } catch (error) {
        console.error("Error fetching comments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();

    // Subscribe to new comments
    const commentsSubscription = supabase
      .channel("comments")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `note_id=eq.${noteId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    // Subscribe to reactions
    const reactionsSubscription = supabase
      .channel("reactions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comment_reactions",
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      commentsSubscription.unsubscribe();
      reactionsSubscription.unsubscribe();
    };
  }, [noteId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to comment",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("comments").insert({
        note_id: noteId,
        user_id: user.id,
        content: newComment.trim(),
      });

      if (error) throw error;

      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    }
  };

  const handleReaction = async (commentId: string, emoji: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to react",
          variant: "destructive",
        });
        return;
      }

      // Check if user already reacted with this emoji
      const existingReaction = comments
        .find((c) => c.id === commentId)
        ?.reactions.find(
          (r) => r.user_id === user.id && r.emoji === emoji
        );

      if (existingReaction) {
        // Remove reaction
        const { error } = await supabase
          .from("comment_reactions")
          .delete()
          .eq("id", existingReaction.id);

        if (error) throw error;
      } else {
        // Add reaction
        const { error } = await supabase.from("comment_reactions").insert({
          comment_id: commentId,
          user_id: user.id,
          emoji,
        });

        if (error) throw error;
      }
    } catch (error) {
      console.error("Error toggling reaction:", error);
      toast({
        title: "Error",
        description: "Failed to update reaction",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading comments...</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {comments.map((comment) => (
          <div key={comment.id} className="space-y-2">
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={comment.user.profile_pic_url || undefined}
                  alt={comment.user.nickname || ""}
                />
                <AvatarFallback
                  style={{
                    backgroundColor: comment.user.favorite_color || undefined,
                  }}
                >
                  {comment.user.nickname?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{comment.user.nickname}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="mt-1 text-sm">{comment.content}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {EMOJI_OPTIONS.map((emoji) => {
                    const count = comment.reactions.filter(
                      (r) => r.emoji === emoji
                    ).length;
                    return (
                      <Button
                        key={emoji}
                        variant={count ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => handleReaction(comment.id, emoji)}
                        className="h-7 px-2 text-sm"
                      >
                        {emoji} {count > 0 && count}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="border-t p-4">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="mb-2"
          rows={2}
        />
        <Button type="submit" disabled={!newComment.trim()}>
          Comment
        </Button>
      </form>
    </div>
  );
}
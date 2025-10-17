import { useState } from 'react';
import { MessageCircle, Send, Check, Trash2, Edit2, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { useCollaboration } from './CollaborationProvider';
import { Badge } from '@/components/ui/badge';

interface CommentsProps {
  noteId: string;
}

export const Comments = ({ noteId }: CommentsProps) => {
  const { comments, addComment, updateComment, resolveComment, deleteComment } = useCollaboration();
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    await addComment(noteId, newComment, replyTo || undefined);
    setNewComment('');
    setReplyTo(null);
  };

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    await updateComment(commentId, editContent);
    setEditingId(null);
    setEditContent('');
  };

  const startEdit = (comment: any) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const noteComments = comments.filter(c => c.noteId === noteId);
  const topLevelComments = noteComments.filter(c => !c.parentId);

  const getReplies = (commentId: string) => {
    return noteComments.filter(c => c.parentId === commentId);
  };

  const CommentItem = ({ comment, isReply = false }: { comment: any; isReply?: boolean }) => {
    const replies = getReplies(comment.id);
    const isEditing = editingId === comment.id;

    return (
      <div className={`${isReply ? 'ml-8 mt-2' : 'mt-4'}`}>
        <Card className="p-3">
          <div className="flex items-start gap-3">
            <Avatar
              className="h-8 w-8 flex items-center justify-center text-white text-xs font-medium"
              style={{ backgroundColor: comment.user.favoriteColor }}
            >
              {comment.user.nickname[0].toUpperCase()}
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{comment.user.nickname}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(comment.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {comment.resolved && (
                  <Badge variant="secondary" className="h-5 text-xs">
                    <Check className="h-3 w-3 mr-1" />
                    Resolved
                  </Badge>
                )}
              </div>
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[60px]"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleEdit(comment.id)}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(null);
                        setEditContent('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyTo(comment.id)}
                      className="h-7 text-xs"
                    >
                      <Reply className="h-3 w-3 mr-1" />
                      Reply
                    </Button>
                    {!comment.resolved && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resolveComment(comment.id)}
                        className="h-7 text-xs"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Resolve
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(comment)}
                      className="h-7 text-xs"
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteComment(comment.id)}
                      className="h-7 text-xs text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
        {replies.map(reply => (
          <CommentItem key={reply.id} comment={reply} isReply />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="h-5 w-5" />
        <h3 className="font-semibold">Comments</h3>
        <Badge variant="secondary">{noteComments.length}</Badge>
      </div>

      <div className="space-y-2">
        {replyTo && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Reply className="h-4 w-4" />
            <span>Replying to comment</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyTo(null)}
              className="h-6 px-2"
            >
              Cancel
            </Button>
          </div>
        )}
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[80px]"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSubmit();
            }
          }}
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            Press Cmd/Ctrl + Enter to submit
          </span>
          <Button onClick={handleSubmit} disabled={!newComment.trim()}>
            <Send className="h-4 w-4 mr-2" />
            Comment
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {topLevelComments.map(comment => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </div>

      {noteComments.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No comments yet. Start the conversation!
        </div>
      )}
    </div>
  );
};
-- Enable pgvector extension for similarity search in activity feed
CREATE EXTENSION IF NOT EXISTS vector;

-- Add presence tracking table
CREATE TABLE IF NOT EXISTS public.user_presence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cursor_position JSONB,
    is_active BOOLEAN DEFAULT true,
    CONSTRAINT presence_scope CHECK (
        (note_id IS NOT NULL AND folder_id IS NULL) OR
        (folder_id IS NOT NULL AND note_id IS NULL) OR
        (note_id IS NULL AND folder_id IS NULL)
    )
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Presence policies
CREATE POLICY "Users can manage their own presence"
    ON public.user_presence FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view presence in shared resources"
    ON public.user_presence FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.shared_notes sn
            WHERE sn.note_id = user_presence.note_id
            AND sn.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.shared_folders sf
            WHERE sf.folder_id = user_presence.folder_id
            AND sf.user_id = auth.uid()
        )
    );

-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    selection_start INTEGER,
    selection_end INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Comments policies
CREATE POLICY "Users can manage their own comments"
    ON public.comments FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view comments on shared notes"
    ON public.comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.shared_notes sn
            WHERE sn.note_id = comments.note_id
            AND sn.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.notes n
            WHERE n.id = comments.note_id
            AND n.user_id = auth.uid()
        )
    );

-- Create comment reactions table
CREATE TABLE IF NOT EXISTS public.comment_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, user_id, emoji)
);

ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

-- Reaction policies
CREATE POLICY "Users can manage their own reactions"
    ON public.comment_reactions FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view reactions on accessible comments"
    ON public.comment_reactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.comments c
            JOIN public.notes n ON c.note_id = n.id
            LEFT JOIN public.shared_notes sn ON n.id = sn.note_id
            WHERE c.id = comment_reactions.comment_id
            AND (n.user_id = auth.uid() OR sn.user_id = auth.uid())
        )
    );

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    resource_id UUID,
    resource_type TEXT,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notification policies
CREATE POLICY "Users can manage their own notifications"
    ON public.notifications FOR ALL
    USING (auth.uid() = user_id);

-- Create activity feed table
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Activity feed policies
CREATE POLICY "Users can view activities in shared resources"
    ON public.activities FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.shared_notes sn
            WHERE sn.note_id = activities.resource_id::UUID
            AND sn.user_id = auth.uid()
            AND activities.resource_type = 'note'
        ) OR
        EXISTS (
            SELECT 1 FROM public.shared_folders sf
            WHERE sf.folder_id = activities.resource_id::UUID
            AND sf.user_id = auth.uid()
            AND activities.resource_type = 'folder'
        ) OR
        activities.user_id = auth.uid()
    );

-- Add realtime triggers
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;

-- Add updated_at triggers
CREATE TRIGGER set_updated_at_comments
    BEFORE UPDATE ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Create function to handle new comments
CREATE OR REPLACE FUNCTION public.handle_new_comment()
RETURNS TRIGGER AS $$
BEGIN
    -- Create notification for note owner if commenter is different
    IF NEW.user_id != (SELECT user_id FROM public.notes WHERE id = NEW.note_id) THEN
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            content,
            resource_id,
            resource_type,
            actor_id
        )
        VALUES (
            (SELECT user_id FROM public.notes WHERE id = NEW.note_id),
            'new_comment',
            'New comment on your note',
            NEW.content,
            NEW.note_id,
            'note',
            NEW.user_id
        );
    END IF;

    -- Create notifications for other participants in the thread
    IF NEW.parent_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            content,
            resource_id,
            resource_type,
            actor_id
        )
        SELECT DISTINCT
            c.user_id,
            'comment_reply',
            'New reply to your comment',
            NEW.content,
            NEW.note_id,
            'note',
            NEW.user_id
        FROM public.comments c
        WHERE c.id = NEW.parent_id
        AND c.user_id != NEW.user_id;
    END IF;

    -- Record activity
    INSERT INTO public.activities (
        user_id,
        action_type,
        resource_type,
        resource_id,
        metadata
    )
    VALUES (
        NEW.user_id,
        'comment',
        'note',
        NEW.note_id,
        jsonb_build_object(
            'comment_id', NEW.id,
            'content', NEW.content
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new comments
CREATE TRIGGER on_new_comment
    AFTER INSERT ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_comment();

-- Function to cleanup presence data
CREATE OR REPLACE FUNCTION public.cleanup_inactive_presence()
RETURNS void AS $$
BEGIN
    DELETE FROM public.user_presence
    WHERE last_seen < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;
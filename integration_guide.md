# Collaboration System Integration Guide

## Overview
This guide shows how to integrate all collaboration features into your NoteHaven app.

## 1. Database Setup

Run the migration:
```bash
supabase migration up
```

This creates tables for:
- `comments` - Threaded comments on notes
- `presence` - Real-time cursor positions
- `notifications` - User notifications
- `shared_notes` - Note sharing permissions
- `shared_folders` - Folder sharing permissions

## 2. Wrap Your App with CollaborationProvider

In `src/App.tsx`:
```tsx
import { CollaborationProvider } from '@/components/collaboration/CollaborationProvider';

// Inside your Notes component:
<CollaborationProvider noteId={selectedNote?.id}>
  {/* Your note editor and other components */}
</CollaborationProvider>
```

## 3. Add Components to NoteEditor

In `src/components/notes/NoteEditor.tsx`:

```tsx
import { PresenceAvatars, CollaborativeEditor } from '@/components/collaboration/PresenceAvatars';
import { Comments } from '@/components/collaboration/Comments';
import { CollaboratorsDialog } from '@/components/collaboration/CollaboratorsDialog';

// In the header:
<div className="flex items-center gap-2">
  <PresenceAvatars />
  <CollaboratorsDialog noteId={note.id} noteTitle={note.title} />
</div>

// Wrap your editor:
<CollaborativeEditor noteId={note.id}>
  <Textarea
    value={body}
    onChange={(e) => setBody(e.target.value)}
    // ... other props
  />
</CollaborativeEditor>

// Add comments sidebar:
<div className="w-80 border-l">
  <Comments noteId={note.id} />
</div>
```

## 4. Add Notifications Menu to Header

In `src/components/notes/NotesHeader.tsx`:

```tsx
import { NotificationsMenu } from '@/components/collaboration/NotificationsMenu';

// In the header:
<NotificationsMenu />
```

## 5. Add Activity Feed (Optional)

In your notes layout, add a collapsible sidebar:

```tsx
import { ActivityFeed } from '@/components/collaboration/ActivityFeed';

// In your layout:
<div className="w-80 border-l">
  <ActivityFeed noteId={selectedNote?.id} />
</div>
```

## 6. Update ProfileSetup Page

Ensure users complete their profile with:
- Nickname (unique, 2-50 chars)
- Favorite color (used for cursors/avatars)
- Optional avatar upload
- Optional bio (max 200 chars)

## 7. Enable RLS Policies

The migration automatically sets up Row Level Security policies:
- Users can only see comments/presence on notes they have access to
- Notifications are private to recipients
- Shared notes respect permission levels (viewer/editor)

## 8. Real-time Subscriptions

The CollaborationProvider automatically handles:
- ✅ Presence tracking (who's online)
- ✅ Cursor position sync
- ✅ Comment updates
- ✅ Notification delivery

## 9. Testing Checklist

1. **Profile Setup**
   - [ ] New users required to set nickname and color
   - [ ] Profile stored in `profiles` table

2. **Sharing**
   - [ ] Can invite users by nickname
   - [ ] Invitations create notifications
   - [ ] Permission levels work (viewer/editor)

3. **Real-time Collaboration**
   - [ ] See other users' cursors with their color
   - [ ] Presence avatars show active users
   - [ ] Cursor tooltips show nicknames

4. **Comments**
   - [ ] Can post comments
   - [ ] Threaded replies work
   - [ ] Resolve/unresolve comments
   - [ ] Edit/delete own comments
   - [ ] Real-time updates

5. **Notifications**
   - [ ] Badge shows unread count
   - [ ] Notifications appear instantly
   - [ ] Mark as read works
   - [ ] Clicking navigates to content

6. **Activity Feed**
   - [ ] Shows recent comments
   - [ ] Shows edit history
   - [ ] Updates in real-time

## 10. Performance Optimizations

- Presence cleanup: Old presence data auto-deletes after 5 minutes
- Notification limit: Only fetch latest 10 by default
- Activity feed: Limited to 20 most recent items
- Cursor throttling: Updates sent max every 100ms

## 11. Security Notes

- All mutations check user permissions via RLS
- Shared notes respect permission levels
- Public notes have separate access control
- Notifications only visible to recipients

## 12. Customization

### Change Cursor Update Frequency
In `CollaborationProvider.tsx`:
```tsx
const debouncedUpdateCursor = debounce(updateCursor, 100); // 100ms
```

### Customize Presence Timeout
In the SQL migration:
```sql
WHERE last_seen < NOW() - INTERVAL '5 minutes'; -- Adjust as needed
```

### Add More Activity Types
Extend the `ActivityFeed` component to track:
- Note creation
- Note deletion
- Tag changes
- Attachment uploads

## Next Steps

1. Deploy the migration to production
2. Test with multiple users in different browsers
3. Monitor real-time subscription performance
4. Gather user feedback on collaboration UX
5. Add @mention functionality in comments
6. Implement conflict resolution for simultaneous edits

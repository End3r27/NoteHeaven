import React from 'react';
import { useCollaboration } from './CollaborationProvider';
import { Avatar } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const PresenceAvatars = () => {
  const { activeUsers } = useCollaboration();

  if (!activeUsers || activeUsers.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground mr-2">Active:</span>
        <div className="flex -space-x-2">
          {activeUsers.slice(0, 5).map((presence) => {
            const user = presence.user;
            if (!user) return null;
            return (
              <Tooltip key={user.id}>
                <TooltipTrigger asChild>
                  <Avatar
                    className="h-8 w-8 border-2 border-background cursor-pointer hover:scale-110 transition-transform flex items-center justify-center text-white text-xs font-medium"
                    style={{ backgroundColor: user.favorite_color || '#ccc' }}
                  >
                    {user.nickname ? user.nickname[0].toUpperCase() : 'U'}
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{user.nickname}</p>
                  <p className="text-xs text-muted-foreground">Editing now</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
          {activeUsers.length > 5 && (
            <div className="h-8 w-8 border-2 border-background rounded-full bg-muted flex items-center justify-center text-xs font-medium">
              +{activeUsers.length - 5}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

interface RemoteCursorsProps {
  containerRef: React.RefObject<HTMLElement>;
}

export const RemoteCursors = ({ containerRef }: RemoteCursorsProps) => {
  const { cursors } = useCollaboration();

  return (
    <>
      {Object.entries(cursors).map(([userId, cursor]) => (
        <div
          key={userId}
          className="pointer-events-none fixed z-50 transition-all duration-100"
          style={{
            left: cursor.position.x,
            top: cursor.position.y,
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5.65376 12.3673L11.6315 5.95605L13.0444 14.8034L17.1666 17.4089L15.7537 18.6272L11.6315 16.0217L5.65376 12.3673Z"
              fill={cursor.color}
              stroke="white"
              strokeWidth="1.5"
            />
          </svg>
          <div
            className="mt-1 px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap shadow-lg"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.nickname}
          </div>
        </div>
      ))}
    </>
  );
};

interface CollaborativeEditorProps {
  noteId: string;
  children: React.ReactNode;
}

export const CollaborativeEditor = ({ noteId, children }: CollaborativeEditorProps) => {
  const { updateCursor } = useCollaboration();
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    updateCursor({
      x: e.clientX,
      y: e.clientY,
    });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative"
    >
      {children}
      <RemoteCursors containerRef={containerRef} />
    </div>
  );
};
import { memo } from "react";
import { motion } from "framer-motion";
import type { CursorUpdate } from "@/types/shared";
import { cn } from "@/lib/utils";

interface RemoteCursorProps {
  cursor: CursorUpdate;
}

const RemoteCursor = memo(({ cursor }: RemoteCursorProps) => {
  const { position, nickname, color } = cursor;

  return (
    <motion.div
      className="pointer-events-none absolute z-50 flex flex-col items-start"
      initial={position}
      animate={position}
      transition={{
        type: "spring",
        stiffness: 150,
        damping: 15,
      }}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
    >
      {/* Cursor */}
      <svg
        viewBox="0 0 24 36"
        width="16"
        height="24"
        style={{
          fill: color,
          filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.25))",
        }}
      >
        <path d="M5.65376 12.3271H5.46026L5.31717 12.4456L0.500002 16.4835V0.500002L23.1901 12.3271H5.65376Z" />
      </svg>

      {/* Nickname tag */}
      <span
        className="ml-2 rounded px-1.5 py-0.5 text-xs text-white"
        style={{
          backgroundColor: color,
          transform: "translateY(-100%)",
          filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))",
        }}
      >
        {nickname}
      </span>
    </motion.div>
  );
});

RemoteCursor.displayName = "RemoteCursor";

export { RemoteCursor };
import React from 'react';
import { PeerPresence } from '../../core/collab/useCollabSession';

interface CollabCursorsProps {
  peers: PeerPresence[];
}

export const CollabCursors: React.FC<CollabCursorsProps> = ({ peers }) => {
  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {peers.map((peer) => {
        const cursor = peer.user.cursor;
        if (!cursor) return null;

        return (
          <div
            key={peer.clientId}
            className="absolute transition-transform duration-75 ease-out"
            style={{
              transform: `translate(${cursor.x}px, ${cursor.y}px)`,
            }}
          >
            {/* SVG Cursor Pointer */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill={peer.user.color}
              stroke="#ffffff"
              strokeWidth="1.5"
              className="drop-shadow-md"
            >
              <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.36z" />
            </svg>

            {/* Peer Name Tag */}
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm whitespace-nowrap ml-3.5 -mt-2 inline-block select-none"
              style={{ backgroundColor: peer.user.color }}
            >
              {peer.user.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};

"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

interface UserMentionProps {
  username: string;
}

interface UserData {
  id: number;
  username: string;
  avatar_url?: string;
  followers_count?: number;
  track_count?: number;
  permalink_url: string;
}

export function UserMention({ username }: UserMentionProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [cardPosition, setCardPosition] = useState({ top: 0, left: 0 });
  const linkRef = useRef<HTMLAnchorElement>(null);

  const handleMouseEnter = async (e: React.MouseEvent) => {
    setIsHovered(true);
    
    // Position card bottom-right from cursor
    setCardPosition({
      top: e.clientY + 10,
      left: e.clientX + 10,
    });
    
    // Only fetch if we haven't tried yet
    if (userData || isLoading || hasError) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/soundcloud/profile?url=https://soundcloud.com/${username}`);
      if (!response.ok) {
        setHasError(true);
        return;
      }
      const data = await response.json();
      if (data.profile) {
        setUserData(data.profile);
      } else {
        setHasError(true);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <span onMouseLeave={() => setIsHovered(false)}>
      <Link
        ref={linkRef}
        href={`/${username}`}
        className="text-purple-400 transition hover:underline"
        onMouseEnter={handleMouseEnter}
      >
        @{username}
      </Link>
      
      {/* Hover card - only show if user data loaded successfully */}
      {isHovered && userData && (
        <div 
          className="pointer-events-none fixed z-[9999] w-32 animate-in fade-in duration-150"
          style={{ top: `${cardPosition.top}px`, left: `${cardPosition.left}px` }}
        >
          <div className="relative overflow-hidden rounded-lg border border-white/20 bg-zinc-900/95 shadow-xl backdrop-blur-sm">
            <div className="relative aspect-square">
              {userData.avatar_url ? (
                <Image
                  src={userData.avatar_url.replace("large.jpg", "t200x200.jpg")}
                  alt={userData.username}
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-500/20 to-amber-600/20 text-3xl font-medium text-amber-400">
                  {userData.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
                <p className="text-sm font-medium text-white">{userData.username}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}



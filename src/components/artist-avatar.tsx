"use client";

import Image from "next/image";

interface ArtistAvatarProps {
  avatar: string;
  username: string;
}

export function ArtistAvatar({ avatar, username }: ArtistAvatarProps) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-neutral-900">
      <Image 
        src={avatar} 
        alt={`${username} avatar`} 
        fill 
        className="object-cover" 
        sizes="(min-width: 768px) 320px, 100vw"
        priority
      />
    </div>
  );
}


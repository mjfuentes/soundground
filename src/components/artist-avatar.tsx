"use client";

import Image from "next/image";

interface ArtistAvatarProps {
  avatar: string;
  username: string;
}

export function ArtistAvatar({ avatar, username }: ArtistAvatarProps) {
  return (
    <div className="relative w-full h-full aspect-square overflow-hidden rounded-xl border border-white/10 bg-neutral-900">
      <Image 
        src={avatar} 
        alt={`${username} avatar`} 
        fill 
        className="object-cover" 
        sizes="320px"
        priority
      />
    </div>
  );
}


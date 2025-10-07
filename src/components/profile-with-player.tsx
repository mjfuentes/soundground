"use client";

import { PlayerProvider } from "@/contexts/player-context";
import { FloatingPlayer } from "./floating-player";
import type { ReactNode } from "react";

interface ProfileWithPlayerProps {
  children: ReactNode;
}

export function ProfileWithPlayer({ children }: ProfileWithPlayerProps) {
  return (
    <PlayerProvider>
      {children}
      <FloatingPlayer />
    </PlayerProvider>
  );
}


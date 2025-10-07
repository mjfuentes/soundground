"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface PlayableItem {
  url: string;
  title: string;
  artwork?: string;
  type: "track" | "playlist" | "album";
}

interface PlayerContextValue {
  currentItem: PlayableItem | null;
  isPlaying: boolean;
  play: (item: PlayableItem) => void;
  stop: () => void;
}

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentItem, setCurrentItem] = useState<PlayableItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const play = (item: PlayableItem) => {
    setCurrentItem(item);
    setIsPlaying(true);
  };

  const stop = () => {
    setCurrentItem(null);
    setIsPlaying(false);
  };

  return (
    <PlayerContext.Provider value={{ currentItem, isPlaying, play, stop }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}


"use client";

import { createContext, useContext, useState, useRef, useEffect, type ReactNode } from "react";
import Hls from "hls.js";

interface PlayableItem {
  id: number; // Track ID for API calls
  url: string; // Permalink URL for attribution
  title: string;
  artist: string; // Artist/uploader name
  artistUrl: string; // Artist profile URL
  artwork?: string;
  description?: string; // Track description
  type: "track" | "playlist" | "album";
}

interface PlayerContextValue {
  currentItem: PlayableItem | null;
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  error: string | null;
  queue: PlayableItem[];
  hasPlayedBefore: boolean;
  play: (item: PlayableItem) => void;
  load: (item: PlayableItem) => void;
  playQueue: (items: PlayableItem[], shuffle?: boolean) => void;
  playTrackWithQueue: (track: PlayableItem, otherTracks: PlayableItem[], shuffle?: boolean) => void;
  loadQueue: (items: PlayableItem[], shuffle?: boolean) => void;
  next: () => void;
  previous: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  clearQueue: () => void;
}

// Fisher-Yates shuffle algorithm for true randomness
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentItem, setCurrentItem] = useState<PlayableItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8); // 0-1 for HTML5 Audio
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<PlayableItem[]>([]);
  const [history, setHistory] = useState<PlayableItem[]>([]);
  const [shouldPlayNext, setShouldPlayNext] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Initialize HTML5 Audio element
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = volume;
    
    const audio = audioRef.current;

    // Set up event listeners
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentTime(0);
      setShouldPlayNext(true);
    };
    const handleError = () => {
      setError("Failed to load audio stream");
      setIsLoading(false);
      setIsPlaying(false);
    };
    const handlePlay = () => {
      setIsPlaying(true);
      setIsPaused(false);
      setError(null);
    };
    const handlePause = () => {
      setIsPaused(true);
      setIsPlaying(false);
    };

    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.pause();
      audio.src = "";
      
      // Clean up HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount/unmount - volume is updated via audioRef.current in setVolume

  // Auto-play next track in queue when current track ends
  useEffect(() => {
    if (shouldPlayNext && queue.length > 0) {
      const [nextTrack, ...remainingQueue] = queue;
      setQueue(remainingQueue);
      
      if (currentItem) {
        setHistory(prev => [...prev, currentItem]);
      }
      
      setShouldPlayNext(false);
      play(nextTrack);
    } else if (shouldPlayNext) {
      setShouldPlayNext(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPlayNext]); // Only depend on shouldPlayNext to avoid circular dependencies

  const load = async (item: PlayableItem) => {
    if (!audioRef.current) return;

    try {
      setIsLoading(true);
      setError(null);
      setCurrentItem(item);

      // Fetch stream URL from our API
      const response = await fetch(`/api/soundcloud/stream/${item.id}`);
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to fetch stream" }));
        
        // Handle 404 errors (track not found, deleted, or unavailable)
        if (response.status === 404) {
          throw new Error("This track is unavailable. It may have been deleted or is not available in your region. Try opening in SoundCloud.");
        }
        
        throw new Error(data.error || "Failed to fetch stream");
      }

      const streamData = await response.json();
      const streamUrl = streamData.stream_url;

      if (!streamUrl) {
        throw new Error("No stream URL available. Try opening in SoundCloud.");
      }

      // Load audio without playing
      audioRef.current.src = streamUrl;
      setIsLoading(false);
      setIsPaused(true);
      setIsPlaying(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load track";
      setError(message);
      setIsLoading(false);
      setIsPlaying(false);
      console.error("Load error:", err);
    }
  };

  const play = async (item: PlayableItem) => {
    if (!audioRef.current) return;

    try {
      setIsLoading(true);
      setError(null);
      setCurrentItem(item);

      // Clean up any existing HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      // Fetch stream URL from our API
      const response = await fetch(`/api/soundcloud/stream/${item.id}`);
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to fetch stream" }));
        
        // Handle 404 errors (track not found, deleted, or unavailable)
        if (response.status === 404) {
          throw new Error("This track is unavailable. It may have been deleted or is not available in your region. Try opening in SoundCloud.");
        }
        
        throw new Error(data.error || "Failed to fetch stream");
      }

      const streamData = await response.json();
      const streamUrl = streamData.stream_url;
      const format = streamData.format;

      if (!streamUrl) {
        throw new Error("No stream URL available. Try opening in SoundCloud.");
      }

      // Check if stream is HLS
      const isHLS = streamUrl.includes('.m3u8') || format?.protocol === 'hls';

      if (isHLS && Hls.isSupported()) {
        // Use HLS.js for HLS streams
        console.log('[Player] Using HLS.js for stream:', streamUrl.substring(0, 100) + '...');
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
        });
        
        hls.loadSource(streamUrl);
        hls.attachMedia(audioRef.current);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          audioRef.current?.play();
        });
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.error('[Player] HLS fatal error:', data);
            setError("HLS stream error. Try opening in SoundCloud.");
            setIsLoading(false);
            setIsPlaying(false);
          }
        });
        
        hlsRef.current = hls;
      } else if (isHLS && audioRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS support
        console.log('[Player] Using native HLS support:', streamUrl.substring(0, 100) + '...');
        audioRef.current.src = streamUrl;
        await audioRef.current.play();
      } else {
        // Progressive MP3 or other formats
        console.log('[Player] Using direct audio:', streamUrl.substring(0, 100) + '...');
        audioRef.current.src = streamUrl;
        await audioRef.current.play();
      }
      
      setIsPlaying(true);
      setIsPaused(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to play track";
      setError(message);
      setIsLoading(false);
      setIsPlaying(false);
      console.error("Playback error:", err);
      
      // If there's a queue and auto-play is enabled, try the next track after a delay
      if (queue.length > 0) {
        setTimeout(() => {
          const [nextTrack, ...remainingQueue] = queue;
          setQueue(remainingQueue);
          
          if (item) {
            setHistory(prev => [...prev, item]);
          }
          
          play(nextTrack);
        }, 2000); // Wait 2 seconds before auto-skipping
      }
    }
  };

  const pause = () => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPaused(true);
    }
  };

  const resume = () => {
    if (audioRef.current && isPaused) {
      audioRef.current.play();
      setIsPaused(false);
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = "";
    }
    
    // Clean up HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    setCurrentItem(null);
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const setVolume = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
  };

  const playQueue = (items: PlayableItem[], shuffle = true) => {
    if (items.length === 0) return;
    
    const processedItems = shuffle ? shuffleArray(items) : items;
    const [firstTrack, ...restOfQueue] = processedItems;
    
    setQueue(restOfQueue);
    play(firstTrack);
  };

  const playTrackWithQueue = (track: PlayableItem, otherTracks: PlayableItem[], shuffle = true) => {
    const processedOtherTracks = shuffle ? shuffleArray(otherTracks) : otherTracks;
    setQueue(processedOtherTracks);
    play(track);
  };

  const loadQueue = (items: PlayableItem[], shuffle = false) => {
    if (items.length === 0) return;
    
    const processedItems = shuffle ? shuffleArray(items) : items;
    setQueue(processedItems);
  };

  const next = () => {
    if (queue.length === 0) return;
    
    const [nextTrack, ...remainingQueue] = queue;
    setQueue(remainingQueue);
    
    if (currentItem) {
      setHistory(prev => [...prev, currentItem]);
    }
    
    play(nextTrack);
  };

  const previous = () => {
    if (history.length === 0) return;
    
    const previousTrack = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    
    if (currentItem) {
      setQueue(prev => [currentItem, ...prev]);
    }
    
    play(previousTrack);
  };

  const clearQueue = () => {
    setQueue([]);
  };

  // Track if player has ever played anything
  const hasPlayedBefore = currentItem !== null || history.length > 0;

  return (
    <PlayerContext.Provider
      value={{
        currentItem,
        isPlaying,
        isPaused,
        isLoading,
        currentTime,
        duration,
        volume,
        error,
        queue,
        hasPlayedBefore,
        play,
        load,
        playQueue,
        playTrackWithQueue,
        loadQueue,
        next,
        previous,
        pause,
        resume,
        stop,
        seek,
        setVolume,
        clearQueue,
      }}
    >
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


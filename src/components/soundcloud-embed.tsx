"use client";

type PlayerProps = {
  url: string;
  autoPlay?: boolean;
};

export function SoundcloudEmbed({ url, autoPlay = false }: PlayerProps) {
  // Using visual=true for a better looking waveform player
  // Color set to purple (#9333ea) to match the app theme
  const embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%239333ea&auto_play=${autoPlay}&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true`;
  
  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
      <iframe
        title="SoundCloud Player"
        className="relative h-[166px] w-full rounded-lg border border-purple-500/20 shadow-2xl shadow-purple-500/10 transition-all group-hover:border-purple-500/30 group-hover:shadow-purple-500/20"
        src={embedUrl}
        allow="autoplay"
        loading="lazy"
      />
    </div>
  );
}

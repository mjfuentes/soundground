"use client";

type PlayerProps = {
  url: string;
  visual?: boolean;
  compact?: boolean;
};

export function SoundcloudEmbed({ url, visual = true, compact = false }: PlayerProps) {
  const height = compact ? "h-20" : visual ? "h-[166px]" : "h-[450px]";
  
  return (
    <iframe
      title="SoundCloud Player"
      className={`${height} w-full rounded-lg`}
      src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=${visual}`}
      allow="autoplay"
    />
  );
}

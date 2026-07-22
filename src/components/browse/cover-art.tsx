/**
 * Cover tiles for browse cards: real artist avatars when resolved, hatched
 * placeholder otherwise.
 */

import Image from "next/image";

const HATCH = "repeating-linear-gradient(45deg, #171717 0 5px, #101010 5px 10px)";

interface CoverTileProps {
  size?: number;
  className?: string;
  imageUrl?: string | null;
}

export function CoverTile({ size = 46, className = "", imageUrl }: CoverTileProps) {
  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt=""
        aria-hidden
        width={size}
        height={size}
        className={`border border-white/[0.06] object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      aria-hidden
      className={`border border-white/[0.06] ${className}`}
      style={{ width: size, height: size, background: HATCH }}
    />
  );
}

interface CoverStripProps {
  count?: number;
  height?: number;
  imageUrls?: readonly (string | null)[];
}

/** Full-width strip of tiles, used as the "cover wall" on city cards. */
export function CoverStrip({ count = 4, height = 52, imageUrls = [] }: CoverStripProps) {
  return (
    <div aria-hidden className="flex gap-[3px]">
      {Array.from({ length: count }, (_, i) => {
        const imageUrl = imageUrls[i];
        return imageUrl ? (
          <Image
            key={i}
            src={imageUrl}
            alt=""
            width={100}
            height={height}
            className="min-w-0 flex-1 border border-white/[0.06] object-cover"
            style={{ height }}
          />
        ) : (
          <div
            key={i}
            className="flex-1 border border-white/[0.06]"
            style={{ height, background: HATCH }}
          />
        );
      })}
    </div>
  );
}

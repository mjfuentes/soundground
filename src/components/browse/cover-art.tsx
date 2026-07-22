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

interface CoverMosaicProps {
  /** Cells in the wall; unresolved cells render as hatched placeholders. */
  count?: number;
  columns?: number;
  imageUrls?: readonly (string | null)[];
}

/**
 * Dense wall of tiny member avatars — a community at a glance. Cells
 * without a resolved avatar keep the hatched placeholder so the wall's
 * size always reflects the roster, not the cache state.
 */
export function CoverMosaic({ count = 20, columns = 10, imageUrls = [] }: CoverMosaicProps) {
  return (
    <div
      aria-hidden
      className="grid w-full gap-[2px]"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: count }, (_, i) => {
        const imageUrl = imageUrls[i];
        return imageUrl ? (
          <Image
            key={i}
            src={imageUrl}
            alt=""
            width={44}
            height={44}
            className="aspect-square h-auto w-full border border-white/[0.06] object-cover"
          />
        ) : (
          <div
            key={i}
            className="aspect-square w-full border border-white/[0.06]"
            style={{ background: HATCH }}
          />
        );
      })}
    </div>
  );
}


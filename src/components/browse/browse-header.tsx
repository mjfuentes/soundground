import Link from "next/link";

interface BrowseHeaderProps {
  /** e.g. "Genre / Dub Techno" — replaces the nav on detail pages. */
  breadcrumb?: string;
  /** e.g. "19 genres · 3 cities" — derived from the store by the page. */
  countsLine?: string;
}

/** Wordmark header for the browse surfaces (home, genre, city). */
export function BrowseHeader({ breadcrumb, countsLine }: BrowseHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-sg-line px-5 py-5 sm:px-7">
      <Link href="/" className="font-sg-mono text-sm tracking-[0.3em] text-sg-ink">
        SOUNDGROUND
      </Link>
      {breadcrumb ? (
        <div className="font-sg-mono text-[11px] uppercase tracking-[0.12em] text-sg-dim">
          {breadcrumb}
        </div>
      ) : (
        <>
          <nav className="hidden font-sg-mono text-[11px] uppercase tracking-[0.14em] sm:flex">
            <Link href="/" className="text-sg-ink">
              Browse
            </Link>
          </nav>
          {countsLine && (
            <div className="hidden font-sg-mono text-[11px] tracking-[0.12em] text-sg-faint md:block">
              {countsLine}
            </div>
          )}
        </>
      )}
    </header>
  );
}

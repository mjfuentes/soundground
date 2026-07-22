"use client";

import { useState } from "react";

interface ShowMoreProps {
  /** Cards always visible. */
  preview: React.ReactNode;
  /** Cards revealed on expand; server-rendered, just hidden until then. */
  rest: React.ReactNode;
  restCount: number;
  label: string;
  gridClassName: string;
}

/** Top-N grid with a "show all" expander; children stay server-rendered. */
export function ShowMore({ preview, rest, restCount, label, gridClassName }: ShowMoreProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div className={gridClassName}>
        {preview}
        {expanded ? rest : null}
      </div>
      {restCount > 0 && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-4 w-full cursor-pointer border border-sg-line bg-sg-surface py-3 font-sg-mono text-[11px] uppercase tracking-[0.14em] text-sg-muted transition-colors hover:border-sg-line-strong hover:text-sg-ink"
        >
          Show {restCount} more {label}
        </button>
      )}
    </div>
  );
}

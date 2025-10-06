"use client";

import { useState, useRef, useEffect, ReactNode } from "react";

interface ExpandableSectionProps {
  children: ReactNode;
  maxHeight?: string;
  className?: string;
}

export function ExpandableSection({ children, maxHeight = "4rem", className = "" }: ExpandableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkOverflow = () => {
      if (contentRef.current) {
        const maxHeightPx = parseFloat(maxHeight) * 16; // Convert rem to px (assuming 1rem = 16px)
        const hasContentOverflow = contentRef.current.scrollHeight > maxHeightPx;
        setHasOverflow(hasContentOverflow);
      }
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [maxHeight, children]);

  return (
    <div className={className}>
      <div
        ref={contentRef}
        className="relative overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isExpanded ? "1000px" : maxHeight }}
      >
        {children}
      </div>
      {hasOverflow && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-1 text-xs text-amber-400 transition hover:text-amber-300"
        >
          {isExpanded ? "...less" : "...more"}
        </button>
      )}
    </div>
  );
}


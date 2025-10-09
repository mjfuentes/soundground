"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export function SmartBackButton() {
  const router = useRouter();
  const [hasHistory, setHasHistory] = useState(false);

  useEffect(() => {
    // Check if there's navigation history
    // If history.length > 1, there's a previous page to go back to
    setHasHistory(window.history.length > 1);
  }, []);

  // Don't render if no history
  if (!hasHistory) {
    return null;
  }

  return (
    <button
      onClick={() => router.back()}
      className="group mb-4 flex cursor-pointer items-center gap-1 text-sm font-medium text-neutral-400 transition-all hover:text-white"
    >
      <svg className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>
  );
}


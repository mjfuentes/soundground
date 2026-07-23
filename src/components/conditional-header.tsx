"use client";

import { usePathname } from "next/navigation";
import { Header } from "./header";

export function ConditionalHeader() {
  const pathname = usePathname();

  // The legacy header survives only on legacy surfaces (track/playlist
  // pages). Everything else — home, browse pages, artist pages — renders
  // BrowseHeader itself.
  if (!pathname.startsWith("/track/") && !pathname.startsWith("/playlist/")) {
    return null;
  }
  
  // Show header on all other pages (profile pages, etc.)
  return (
    <>
      <Header />
      <div className="pt-16" /> {/* Spacer for fixed header */}
    </>
  );
}


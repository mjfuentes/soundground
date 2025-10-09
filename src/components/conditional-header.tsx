"use client";

import { usePathname } from "next/navigation";
import { Header } from "./header";

export function ConditionalHeader() {
  const pathname = usePathname();
  
  // Don't show header on homepage or admin page
  if (pathname === "/" || pathname === "/admin") {
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


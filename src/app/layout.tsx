import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { PlayerProvider } from "@/contexts/player-context";
import { FloatingPlayer } from "@/components/floating-player";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CloudMate",
  description: "View SoundCloud artist profiles with enhanced features",
  icons: {
    icon: [
      { url: "/logo.png" },
      { url: "/logo.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/logo.png",
    shortcut: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PlayerProvider>
          <Header />
          <div className="pt-16">{children}</div>
          <FloatingPlayer />
        </PlayerProvider>
      </body>
    </html>
  );
}

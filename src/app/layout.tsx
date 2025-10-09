import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ConditionalHeader } from "@/components/conditional-header";
import { PlayerProvider } from "@/contexts/player-context";
import { FloatingPlayer } from "@/components/floating-player";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SoundGround - Sounds from the Underground",
  description: "Discover and explore SoundCloud artists. Dig deep into artist profiles, explore connections, and uncover hidden gems in the underground music scene.",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
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
        className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}
        style={{ backgroundColor: '#0f0f0f' }}
      >
        <PlayerProvider>
          <ConditionalHeader />
          {children}
          <FloatingPlayer />
        </PlayerProvider>
      </body>
    </html>
  );
}

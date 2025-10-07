import Image from "next/image";
import Link from "next/link";

export function Header() {
  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-neutral-800 bg-black/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
          <div className="relative h-8 w-8">
            <Image
              src="/logo.png"
              alt="CloudMate"
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>
      </div>
    </header>
  );
}


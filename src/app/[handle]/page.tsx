import { Suspense } from "react";
import { SoundcloudProfileView } from "@/components/soundcloud-profile-view";

async function SoundcloudProfileLoader({ handle }: { handle: string }) {
  return <SoundcloudProfileView profile={handle} />;
}

export default async function ArtistPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-12">
        <Suspense fallback={<div className="text-sm text-zinc-400">Loading profile…</div>}>
          <SoundcloudProfileLoader handle={handle} />
        </Suspense>
      </div>
    </main>
  );
}


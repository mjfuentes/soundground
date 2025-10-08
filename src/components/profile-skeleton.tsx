export function ProfileSkeleton() {
  return (
    <article className="grid gap-8 md:grid-cols-[minmax(260px,320px)_1fr] animate-pulse">
      {/* Left Column - Avatar and Profile Info */}
      <section className="flex flex-col gap-4">
        {/* Avatar skeleton */}
        <div className="relative aspect-square overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="h-20 w-20 text-neutral-700" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
        </div>
        
        <div className="flex flex-col gap-4">
          {/* Username skeleton */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-48 rounded-lg bg-neutral-800"></div>
            <div className="h-6 w-6 rounded bg-neutral-800"></div>
          </div>
          
          {/* Description skeleton */}
          <div className="flex flex-col gap-2">
            <div className="h-4 w-full rounded bg-neutral-800"></div>
            <div className="h-4 w-5/6 rounded bg-neutral-800"></div>
            <div className="h-4 w-4/6 rounded bg-neutral-800"></div>
          </div>
        </div>
      </section>

      {/* Right Column - Content */}
      <section className="flex flex-col gap-6">
        {/* Spotlight section skeleton */}
        <div className="flex flex-col gap-4">
          <div className="h-7 w-32 rounded-lg bg-neutral-800"></div>
          <div className="flex flex-col gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 rounded-xl border border-neutral-800 bg-neutral-900"></div>
            ))}
          </div>
        </div>

        {/* Playlists section skeleton */}
        <div className="flex flex-col gap-4">
          <div className="h-7 w-28 rounded-lg bg-neutral-800"></div>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="relative aspect-square overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="h-12 w-12 text-neutral-700" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                    </svg>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="h-4 w-full rounded bg-neutral-800"></div>
                  <div className="h-3 w-16 rounded bg-neutral-800"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </article>
  );
}



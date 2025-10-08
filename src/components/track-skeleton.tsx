export function TrackSkeleton() {
  return (
    <div className="min-h-screen animate-pulse" style={{ backgroundColor: '#060606' }}>
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Back Button skeleton */}
        <div className="mb-8 h-4 w-16 rounded bg-neutral-800"></div>

        <div className="flex flex-col gap-8 md:flex-row md:gap-12">
          {/* Album Art skeleton - Square 1:1 */}
          <div className="shrink-0">
            <div className="relative h-80 w-80 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="h-20 w-20 text-neutral-700" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Track Info skeleton */}
          <div className="flex flex-1 flex-col">
            {/* Title & Artist skeleton */}
            <div className="mb-6">
              <div className="mb-2 h-8 w-3/4 rounded bg-neutral-800"></div>
              <div className="h-5 w-1/2 rounded bg-neutral-800"></div>
            </div>

            {/* Action Buttons skeleton */}
            <div className="mb-6 flex flex-col gap-3 md:flex-row">
              <div className="h-12 w-full md:w-16 rounded bg-neutral-800"></div>
              <div className="h-12 flex-1 rounded bg-neutral-800"></div>
            </div>

            {/* Stats Row skeleton */}
            <div className="mb-6 flex gap-6">
              <div className="h-4 w-24 rounded bg-neutral-800"></div>
              <div className="h-4 w-16 rounded bg-neutral-800"></div>
              <div className="h-4 w-20 rounded bg-neutral-800"></div>
              <div className="h-4 w-24 rounded bg-neutral-800"></div>
            </div>

            {/* Description skeleton */}
            <div className="mb-8 border-t border-neutral-800 pt-6">
              <div className="flex flex-col gap-2">
                <div className="h-4 w-full rounded bg-neutral-800"></div>
                <div className="h-4 w-full rounded bg-neutral-800"></div>
                <div className="h-4 w-4/5 rounded bg-neutral-800"></div>
                <div className="h-4 w-3/5 rounded bg-neutral-800"></div>
              </div>
            </div>

            {/* Likes Section skeleton */}
            <div className="border-t border-neutral-800 pt-6">
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-12 w-12 bg-neutral-800"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


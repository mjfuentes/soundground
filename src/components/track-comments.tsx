import type { SoundCloudComment } from "@/lib/soundcloud/client";

interface TrackCommentsProps {
  comments: SoundCloudComment[];
  maxComments?: number;
}

export function TrackComments({ comments, maxComments = 3 }: TrackCommentsProps) {
  const displayedComments = comments.slice(0, maxComments);

  if (displayedComments.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-col gap-1">
      {displayedComments.map((comment) => (
        <div key={comment.id} className="text-xs text-zinc-400">
          <a
            href={comment.user.permalink_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-zinc-300 hover:text-white hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {comment.user.username}
          </a>
          : <span className="italic">&ldquo;{comment.body}&rdquo;</span>
        </div>
      ))}
    </div>
  );
}

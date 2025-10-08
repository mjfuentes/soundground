"use client";

import { UserMention } from "./user-mention";

interface RichDescriptionProps {
  text: string;
}

export function RichDescription({ text }: RichDescriptionProps) {
  const lines = text.split("\n");

  return (
    <div className="whitespace-pre-wrap text-sm text-zinc-300">
      {lines.map((line, lineIndex) => {
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;

        // Match URLs (http/https)
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        // Match @ mentions (but not emails)
        const mentionRegex = /@([a-zA-Z0-9_-]+)(?![@\w.-]*\.[a-zA-Z]{2,})/g;
        // Match emails
        const emailRegex = /[\w.-]+@([\w-]+\.)+[\w-]{2,4}/g;

        // Combine all matches with their positions
        const matches: Array<{ index: number; length: number; type: "url" | "mention" | "email"; value: string }> = [];

        let match;
        while ((match = urlRegex.exec(line)) !== null) {
          matches.push({
            index: match.index,
            length: match[0].length,
            type: "url",
            value: match[0],
          });
        }

        while ((match = mentionRegex.exec(line)) !== null) {
          matches.push({
            index: match.index,
            length: match[0].length,
            type: "mention",
            value: match[1],
          });
        }

        while ((match = emailRegex.exec(line)) !== null) {
          matches.push({
            index: match.index,
            length: match[0].length,
            type: "email",
            value: match[0],
          });
        }

        // Sort by position
        matches.sort((a, b) => a.index - b.index);

        matches.forEach((match, i) => {
          // Add text before this match
          if (match.index > lastIndex) {
            parts.push(line.slice(lastIndex, match.index));
          }

          // Add the match as a link
          if (match.type === "url") {
            parts.push(
              <a
                key={`${lineIndex}-${i}`}
                href={match.value}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer text-purple-400 underline decoration-purple-400/30 transition hover:decoration-purple-400"
              >
                {match.value}
              </a>
            );
          } else if (match.type === "mention") {
            parts.push(
              <UserMention
                key={`${lineIndex}-${i}`}
                username={match.value}
              />
            );
          } else if (match.type === "email") {
            parts.push(
              <a
                key={`${lineIndex}-${i}`}
                href={`mailto:${match.value}`}
                className="cursor-pointer text-purple-400 underline decoration-purple-400/30 transition hover:decoration-purple-400"
              >
                {match.value}
              </a>
            );
          }

          lastIndex = match.index + match.length;
        });

        // Add remaining text
        if (lastIndex < line.length) {
          parts.push(line.slice(lastIndex));
        }

        return (
          <span key={lineIndex}>
            {parts.length > 0 ? parts : line}
            {lineIndex < lines.length - 1 && "\n"}
          </span>
        );
      })}
    </div>
  );
}


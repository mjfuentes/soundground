import Link from "next/link";

function SidebarHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3.5 border-b border-sg-line pb-2.5 font-sg-mono text-[11px] uppercase tracking-[0.18em] text-sg-muted">
      {children}
    </div>
  );
}

interface IntersectionItem {
  label: string;
  /** Omitted when the target entity isn't browsable yet — renders as plain text. */
  href?: string;
  suffix?: string;
}

/** Drill-down links like "Dub Techno in Berlin" or "Jungle in Buenos Aires". */
export function IntersectionList({
  heading,
  items,
}: {
  heading: string;
  items: readonly IntersectionItem[];
}) {
  return (
    <div>
      <SidebarHeading>{heading}</SidebarHeading>
      <div className="flex flex-col gap-0.5">
        {items.map((item) => {
          const content = (
            <>
              <span>
                {item.label}
                {item.suffix ? (
                  <span className="ml-1.5 font-sg-mono text-[10px] text-sg-faint">{item.suffix}</span>
                ) : null}
              </span>
              <span className="text-sg-faint">→</span>
            </>
          );
          const rowClass = "flex items-center justify-between py-[9px] font-sg-mono text-xs";

          return item.href ? (
            <Link key={item.label} href={item.href} className={`${rowClass} text-sg-body hover:text-white`}>
              {content}
            </Link>
          ) : (
            <div key={item.label} className={`${rowClass} text-sg-body`} title="Coming soon">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RelatedChips({
  heading,
  items,
}: {
  heading: string;
  items: readonly { label: string; href?: string }[];
}) {
  const chipClass =
    "border border-sg-line-strong px-3 py-[7px] font-sg-mono text-[11px] text-sg-soft";
  return (
    <div>
      <SidebarHeading>{heading}</SidebarHeading>
      <div className="flex flex-wrap gap-2">
        {items.map((item) =>
          item.href ? (
            <Link
              key={item.label}
              href={item.href}
              className={`${chipClass} transition-colors hover:border-sg-ink hover:text-white`}
            >
              {item.label}
            </Link>
          ) : (
            <span key={item.label} className={chipClass} title="Coming soon">
              {item.label}
            </span>
          ),
        )}
      </div>
    </div>
  );
}

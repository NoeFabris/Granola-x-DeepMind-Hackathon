interface HeaderProps {
  title?: string;
  tagline?: string;
}

export function Header({
  title = "Meeting Recap Feed",
  tagline = "Swipe through AI avatar recap videos generated from your latest Granola meetings.",
}: HeaderProps) {
  return (
    <header
      className="pointer-events-none absolute inset-x-0 top-0 z-40 px-4 pt-[calc(var(--safe-top)+1rem)]"
    >
      <div className="mx-auto flex max-w-5xl">
        <div className="max-w-sm rounded-2xl border border-white/15 bg-black/40 p-4 shadow-2xl backdrop-blur motion-safe:animate-[fade-up_650ms_ease-out_forwards]">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]"
            />
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
              Granola recaps
            </span>
          </div>
          <h1 className="mt-2 text-lg font-semibold leading-tight text-white sm:text-xl">
            {title}
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-slate-200 sm:text-sm">{tagline}</p>
        </div>
      </div>
    </header>
  );
}

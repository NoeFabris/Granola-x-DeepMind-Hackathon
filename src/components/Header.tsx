interface HeaderProps {
  title?: string;
  tagline?: string;
}

export function Header({
  title = "GranolaTok",
}: HeaderProps) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-40 px-4 pt-[calc(var(--safe-top)+1rem)]">
      <div className="mx-auto flex max-w-5xl">
        <div className="max-w-sm rounded-2xl border border-white/15 bg-black/40 p-4 shadow-2xl backdrop-blur motion-safe:animate-[fade-up_650ms_ease-out_forwards]">
          <h1 className="text-lg font-semibold leading-tight text-white sm:text-xl">{title}</h1>
        </div>
      </div>
    </header>
  );
}

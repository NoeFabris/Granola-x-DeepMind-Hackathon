"use client";

interface ConnectGranolaProps {
  connected: boolean;
}

export function ConnectGranola({ connected }: ConnectGranolaProps) {
  if (connected) {
    return (
      <div className="rounded-full border border-emerald-300/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-100">
        Granola connected
      </div>
    );
  }

  return (
    <div className="rounded-full border border-amber-300/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-700 dark:text-amber-100">
      Granola not configured
    </div>
  );
}

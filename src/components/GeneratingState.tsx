import { ProgressIndicator, type ProgressStep } from "@/components/ProgressIndicator";

interface GeneratingStateProps {
  title: string;
  headline: string;
  detail?: string;
  steps: ProgressStep[];
}

export function GeneratingState({ title, headline, detail, steps }: GeneratingStateProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 px-5 backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.25),transparent_40%),radial-gradient(circle_at_80%_15%,rgba(56,189,248,0.28),transparent_42%)]" />

      <div className="relative w-full max-w-md rounded-3xl border border-white/20 bg-slate-950/90 p-6 shadow-2xl motion-safe:animate-[fade-up_520ms_ease-out_forwards]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
          Generating recap
        </p>
        <h3 className="mt-2 text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-base font-medium text-emerald-200">{headline}</p>

        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-400" />
        </div>

        <p className="mt-3 text-sm text-slate-300">{detail ?? "Generating script and rendering clips."}</p>

        <div className="mt-5">
          <ProgressIndicator steps={steps} />
        </div>
      </div>
    </div>
  );
}

import { ProgressIndicator, type ProgressStep } from "@/components/ProgressIndicator";

interface GeneratingStateProps {
  title: string;
  headline: string;
  detail?: string;
  steps: ProgressStep[];
}

export function GeneratingState({ title, headline, detail, steps }: GeneratingStateProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.2),transparent_40%),radial-gradient(circle_at_80%_15%,rgba(56,189,248,0.22),transparent_42%)]" />

      <div className="relative w-full max-w-md rounded-3xl border border-white/20 bg-slate-950/85 p-5 shadow-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
          Generating recap
        </p>
        <h3 className="mt-2 text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm font-medium text-emerald-100">{headline}</p>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-300/85" />
        </div>

        <p className="mt-2 text-xs text-slate-200">{detail ?? "Generating script and rendering clips."}</p>

        <div className="mt-4">
          <ProgressIndicator steps={steps} />
        </div>
      </div>
    </div>
  );
}

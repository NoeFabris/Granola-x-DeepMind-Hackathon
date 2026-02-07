export type ProgressStepStatus = "pending" | "running" | "completed" | "failed";

export const DEFAULT_GENERATION_STEP_LABELS = [
  "Generating script",
  "Creating clips",
  "Stitching video",
] as const;

export interface ProgressStep {
  id: string;
  label: string;
  status: ProgressStepStatus;
}

interface ProgressIndicatorProps {
  steps: ProgressStep[];
}

function statusLabel(status: ProgressStepStatus): string {
  if (status === "running") {
    return "Running";
  }

  if (status === "completed") {
    return "Done";
  }

  if (status === "failed") {
    return "Failed";
  }

  return "Pending";
}

function statusClasses(status: ProgressStepStatus): string {
  if (status === "running") {
    return "border-emerald-300/80 bg-emerald-300/20 text-emerald-100";
  }

  if (status === "completed") {
    return "border-sky-300/80 bg-sky-300/20 text-sky-100";
  }

  if (status === "failed") {
    return "border-rose-300/80 bg-rose-300/20 text-rose-100";
  }

  return "border-white/20 bg-white/10 text-slate-100";
}

export function ProgressIndicator({ steps }: ProgressIndicatorProps) {
  return (
    <ol className="space-y-2" aria-label="Generation progress steps">
      {steps.map((step) => (
        <li
          key={step.id}
          className="flex items-center justify-between rounded-xl border border-white/15 bg-black/35 px-3 py-2"
        >
          <span className="text-sm text-slate-100">{step.label}</span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${statusClasses(step.status)}`}
          >
            {statusLabel(step.status)}
          </span>
        </li>
      ))}
    </ol>
  );
}

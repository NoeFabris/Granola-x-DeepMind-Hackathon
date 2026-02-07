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
    return "border-emerald-400/80 bg-emerald-400/20 text-emerald-200";
  }

  if (status === "completed") {
    return "border-sky-400/80 bg-sky-400/20 text-sky-200";
  }

  if (status === "failed") {
    return "border-rose-400/80 bg-rose-400/20 text-rose-200";
  }

  return "border-white/20 bg-white/10 text-slate-300";
}

export function ProgressIndicator({ steps }: ProgressIndicatorProps) {
  return (
    <ol className="space-y-2.5" aria-label="Generation progress steps">
      {steps.map((step) => (
        <li
          key={step.id}
          className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2 shadow-sm"
        >
          <span className="text-sm font-medium text-slate-200">{step.label}</span>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider transition-colors ${statusClasses(step.status)}`}
          >
            {statusLabel(step.status)}
          </span>
        </li>
      ))}
    </ol>
  );
}

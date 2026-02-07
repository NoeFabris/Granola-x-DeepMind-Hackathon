interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

export function ErrorState({ message, onRetry, isRetrying = false }: ErrorStateProps) {
  return (
    <div className="mt-3 rounded-xl border border-rose-300/50 bg-rose-500/20 p-3">
      <p className="text-xs text-rose-100">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="mt-3 rounded-full border border-rose-200/80 bg-rose-100/15 px-3 py-1 text-xs font-semibold text-rose-50 transition hover:bg-rose-100/25 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isRetrying ? "Retrying..." : "Retry generation"}
      </button>
    </div>
  );
}

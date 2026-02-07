interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

export function ErrorState({ message, onRetry, isRetrying = false }: ErrorStateProps) {
  return (
    <div className="mt-4 rounded-lg border border-rose-400/50 bg-rose-500/20 p-3 backdrop-blur-sm">
      <p className="text-sm text-rose-200">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="mt-3 rounded-md border border-rose-300/80 bg-rose-200/20 px-3 py-1.5 text-xs font-semibold text-rose-100 transition duration-200 hover:bg-rose-200/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isRetrying ? "Retrying..." : "Retry generation"}
      </button>
    </div>
  );
}

interface VideoControlsProps {
  hasVideo: boolean;
  isPlaying: boolean;
  isGenerating: boolean;
  onTogglePlayback: () => void;
  onGenerateVideo: () => void;
}

export function VideoControls({
  hasVideo,
  isPlaying,
  isGenerating,
  onTogglePlayback,
  onGenerateVideo,
}: VideoControlsProps) {
  const playbackLabel = isPlaying ? "Pause" : "Play";
  const generationLabel = isGenerating
    ? "Generating recap..."
    : hasVideo
      ? "Regenerate recap"
      : "Generate recap";

  return (
    <div className="absolute bottom-[calc(var(--safe-bottom)+2rem)] right-[calc(var(--safe-right)+1.25rem)] z-20 flex flex-col gap-2.5 sm:gap-3">
      <button
        type="button"
        onClick={onTogglePlayback}
        disabled={!hasVideo}
        className="rounded-full border border-white/40 bg-black/35 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur transition duration-200 hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {playbackLabel}
      </button>
      <button
        type="button"
        onClick={onGenerateVideo}
        disabled={isGenerating}
        className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg transition duration-200 hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-emerald-200"
      >
        {generationLabel}
      </button>
    </div>
  );
}

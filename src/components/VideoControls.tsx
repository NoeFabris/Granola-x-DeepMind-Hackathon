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
    <div className="absolute bottom-8 right-5 z-20 flex flex-col gap-3">
      <button
        type="button"
        onClick={onTogglePlayback}
        disabled={!hasVideo}
        className="rounded-full border border-white/40 bg-black/35 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur transition hover:bg-black/55 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {playbackLabel}
      </button>
      <button
        type="button"
        onClick={onGenerateVideo}
        disabled={isGenerating}
        className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-emerald-200"
      >
        {generationLabel}
      </button>
    </div>
  );
}

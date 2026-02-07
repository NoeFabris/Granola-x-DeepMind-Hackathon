"use client";

import { useEffect, useRef } from "react";

interface VideoPlayerProps {
  videoUrl?: string;
  isActive: boolean;
  isPaused: boolean;
  title: string;
}

export function VideoPlayer({ videoUrl, isActive, isPaused, title }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const videoElement = videoRef.current;

    if (!videoElement || !videoUrl) {
      return;
    }

    if (isActive && !isPaused) {
      const playPromise = videoElement.play();

      if (playPromise && typeof playPromise.catch === "function") {
        void playPromise.catch(() => {});
      }

      return;
    }

    videoElement.pause();
  }, [isActive, isPaused, videoUrl]);

  if (!videoUrl) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.25),transparent_45%),radial-gradient(circle_at_80%_15%,rgba(16,185,129,0.25),transparent_35%),linear-gradient(160deg,#020617,#0f172a_55%,#111827)]">
        <div className="max-w-sm rounded-2xl border border-white/15 bg-black/35 p-6 text-center backdrop-blur">
          <p className="text-xs uppercase tracking-[0.22em] text-emerald-200">Recap pending</p>
          <h3 className="mt-3 text-lg font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm text-slate-200">
            Generate recap to render the AI avatar video for this meeting.
          </p>
        </div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      className="absolute inset-0 h-full w-full object-cover"
      src={videoUrl}
      muted
      playsInline
      loop
      preload="metadata"
    />
  );
}

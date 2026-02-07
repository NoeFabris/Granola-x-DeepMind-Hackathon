"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConnectGranola } from "@/components/ConnectGranola";
import { VideoControls } from "@/components/VideoControls";
import { VideoPlayer } from "@/components/VideoPlayer";
import type { GranolaMeeting } from "@/types/granola";

interface VideoFeedProps {
  initialConnected?: boolean;
}

interface MeetingsPayload {
  meetings?: GranolaMeeting[];
  authUrl?: string;
  connectUrl?: string;
  error?: string;
}

interface GeneratedVideoPayload {
  videoUrl?: string;
  authUrl?: string;
  connectUrl?: string;
  error?: string;
}

const DEFAULT_CONNECT_URL = "/api/auth/granola/connect";

function parseConnectUrl(payload: MeetingsPayload | GeneratedVideoPayload): string {
  if (typeof payload.authUrl === "string" && payload.authUrl.length > 0) {
    return payload.authUrl;
  }

  if (typeof payload.connectUrl === "string" && payload.connectUrl.length > 0) {
    return payload.connectUrl;
  }

  return DEFAULT_CONNECT_URL;
}

function meetingKey(meeting: GranolaMeeting, index: number): string {
  if (typeof meeting.id === "string" && meeting.id.trim().length > 0) {
    return meeting.id;
  }

  return `meeting-${index}`;
}

function summarizeKeyPoints(summary?: string): string[] {
  if (!summary || !summary.trim()) {
    return [
      "Summary is not available for this meeting yet.",
      "Generate recap to create an AI avatar video.",
      "Swipe up for the next meeting.",
    ];
  }

  const lineCandidates = summary
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter(Boolean);

  if (lineCandidates.length > 0) {
    return lineCandidates.slice(0, 3);
  }

  return summary
    .split(/[.!?]/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3);
}

export function VideoFeed({ initialConnected = false }: VideoFeedProps) {
  const [meetings, setMeetings] = useState<GranolaMeeting[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [isConnected, setIsConnected] = useState(initialConnected);
  const [connectUrl, setConnectUrl] = useState(DEFAULT_CONNECT_URL);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [videoByMeeting, setVideoByMeeting] = useState<Record<string, string>>({});
  const [generationErrors, setGenerationErrors] = useState<Record<string, string>>({});
  const [isGeneratingByMeeting, setIsGeneratingByMeeting] = useState<Record<string, boolean>>({});
  const [isPausedByMeeting, setIsPausedByMeeting] = useState<Record<string, boolean>>({});

  const feedRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<Array<HTMLElement | null>>([]);

  const setSlideRef = useCallback((index: number, node: HTMLElement | null) => {
    slideRefs.current[index] = node;
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadMeetings() {
      setIsLoadingMeetings(true);

      try {
        const response = await fetch("/api/meetings?limit=20", {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as MeetingsPayload;

        if (!isMounted) {
          return;
        }

        if (response.status === 401) {
          setIsConnected(false);
          setConnectUrl(parseConnectUrl(payload));
          setMeetings([]);
          setError(null);
          return;
        }

        if (!response.ok) {
          throw new Error(
            typeof payload.error === "string" ? payload.error : "Unable to load meetings."
          );
        }

        setIsConnected(true);
        setError(null);
        setMeetings(Array.isArray(payload.meetings) ? payload.meetings : []);
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        const message =
          requestError instanceof Error ? requestError.message : "Unable to load meetings.";

        setError(message);
        setIsConnected(false);
      } finally {
        if (isMounted) {
          setIsLoadingMeetings(false);
        }
      }
    }

    void loadMeetings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (activeIndex < meetings.length) {
      return;
    }

    setActiveIndex(0);
  }, [activeIndex, meetings.length]);

  useEffect(() => {
    if (meetings.length === 0) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    const rootElement = feedRef.current;

    if (!rootElement) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        let bestEntry: IntersectionObserverEntry | null = null;

        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          if (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio) {
            bestEntry = entry;
          }
        }

        if (!bestEntry) {
          return;
        }

        const rawIndex = (bestEntry.target as HTMLElement).dataset.index;
        const parsedIndex = Number.parseInt(rawIndex ?? "", 10);

        if (Number.isNaN(parsedIndex)) {
          return;
        }

        setActiveIndex(parsedIndex);
      },
      {
        root: rootElement,
        threshold: [0.6, 0.8],
      }
    );

    for (const slide of slideRefs.current) {
      if (slide) {
        observer.observe(slide);
      }
    }

    return () => {
      observer.disconnect();
    };
  }, [meetings.length]);

  const handleGenerateVideo = useCallback(async (meeting: GranolaMeeting, index: number) => {
    const key = meetingKey(meeting, index);

    setGenerationErrors((previous) => {
      if (!previous[key]) {
        return previous;
      }

      const nextState: Record<string, string> = {};

      for (const [entryKey, value] of Object.entries(previous)) {
        if (entryKey !== key) {
          nextState[entryKey] = value;
        }
      }

      return nextState;
    });
    setIsGeneratingByMeeting((previous) => ({
      ...previous,
      [key]: true,
    }));

    try {
      const response = await fetch("/api/generate-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meetingId: meeting.id,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as GeneratedVideoPayload;

      if (response.status === 401) {
        setIsConnected(false);
        setConnectUrl(parseConnectUrl(payload));
        setGenerationErrors((previous) => ({
          ...previous,
          [key]: "Granola connection required to generate this recap.",
        }));
        return;
      }

      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string" ? payload.error : "Unable to generate recap video."
        );
      }

      const videoUrl = payload.videoUrl;

      if (typeof videoUrl !== "string" || videoUrl.length === 0) {
        throw new Error("Video generation succeeded but no video URL was returned.");
      }

      setVideoByMeeting((previous) => ({
        ...previous,
        [key]: videoUrl,
      }));
      setIsPausedByMeeting((previous) => ({
        ...previous,
        [key]: false,
      }));
      setIsConnected(true);
      setError(null);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Unable to generate recap video.";

      setGenerationErrors((previous) => ({
        ...previous,
        [key]: message,
      }));
    } finally {
      setIsGeneratingByMeeting((previous) => ({
        ...previous,
        [key]: false,
      }));
    }
  }, []);

  if (isLoadingMeetings) {
    return (
      <section className="flex h-screen items-center justify-center bg-[linear-gradient(160deg,#020617,#0f172a,#111827)] text-slate-200">
        <p className="rounded-full border border-white/20 bg-black/25 px-5 py-2 text-sm tracking-wide">
          Loading meetings...
        </p>
      </section>
    );
  }

  if (!isConnected) {
    return (
      <section className="flex h-screen items-center justify-center bg-[linear-gradient(160deg,#020617,#0f172a,#111827)] p-6 text-slate-100">
        <div className="w-full max-w-md rounded-3xl border border-white/20 bg-black/30 p-7 text-center shadow-2xl backdrop-blur">
          <p className="text-xs uppercase tracking-[0.24em] text-emerald-200">Meeting recap feed</p>
          <h2 className="mt-4 text-2xl font-semibold">Connect Granola to start swiping recaps</h2>
          <p className="mt-3 text-sm text-slate-300">
            Authorize your account to load meetings and generate TikTok-style recap videos.
          </p>
          <div className="mt-6 flex justify-center">
            <ConnectGranola connected={false} connectUrl={connectUrl} />
          </div>
          {error ? (
            <p className="mt-4 rounded-lg border border-rose-200/50 bg-rose-500/20 px-3 py-2 text-sm text-rose-100">
              {error}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  if (meetings.length === 0) {
    return (
      <section className="flex h-screen items-center justify-center bg-[linear-gradient(160deg,#020617,#0f172a,#111827)] p-6 text-slate-100">
        <div className="max-w-md rounded-3xl border border-white/20 bg-black/30 p-7 text-center shadow-2xl backdrop-blur">
          <h2 className="text-xl font-semibold">No meetings found</h2>
          <p className="mt-3 text-sm text-slate-300">
            Your Granola workspace has no recent meetings yet. Record one and refresh to generate
            a recap feed.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative h-screen w-full overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-black/75 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-44 bg-gradient-to-t from-black/80 to-transparent" />

      <div
        ref={feedRef}
        className="h-screen snap-y snap-mandatory overflow-y-auto overscroll-y-contain"
      >
        {meetings.map((meeting, index) => {
          const key = meetingKey(meeting, index);
          const hasVideo = typeof videoByMeeting[key] === "string";
          const isPaused = Boolean(isPausedByMeeting[key]);
          const isCurrentSlide = index === activeIndex;
          const isPlaying = isCurrentSlide && hasVideo && !isPaused;
          const keyPoints = summarizeKeyPoints(meeting.summary);

          return (
            <article
              key={key}
              data-index={index}
              ref={(node) => {
                setSlideRef(index, node);
              }}
              className="relative h-screen snap-start"
            >
              <VideoPlayer
                videoUrl={videoByMeeting[key]}
                isActive={isCurrentSlide}
                isPaused={isPaused}
                title={meeting.title}
              />

              <div className="absolute left-5 top-5 z-20 rounded-full border border-white/20 bg-black/35 px-3 py-1 text-xs font-medium text-slate-100 backdrop-blur">
                {index + 1} / {meetings.length}
              </div>

              <div className="absolute bottom-7 left-5 right-24 z-20 rounded-2xl border border-white/15 bg-black/35 p-4 shadow-xl backdrop-blur">
                <p className="text-xs uppercase tracking-[0.22em] text-emerald-200">Meeting recap</p>
                <h3 className="mt-2 text-xl font-semibold leading-tight">{meeting.title}</h3>
                <ul className="mt-3 space-y-1 text-sm text-slate-100">
                  {keyPoints.map((point, pointIndex) => (
                    <li key={`${key}-${pointIndex}`} className="flex gap-2">
                      <span aria-hidden className="text-emerald-300">
                        -
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-200">
                  Swipe up for next meeting
                </p>
                {generationErrors[key] ? (
                  <p className="mt-3 rounded-lg border border-rose-300/40 bg-rose-500/20 px-2 py-1 text-xs text-rose-100">
                    {generationErrors[key]}
                  </p>
                ) : null}
              </div>

              <VideoControls
                hasVideo={hasVideo}
                isPlaying={isPlaying}
                isGenerating={Boolean(isGeneratingByMeeting[key])}
                onTogglePlayback={() => {
                  setIsPausedByMeeting((previous) => ({
                    ...previous,
                    [key]: !previous[key],
                  }));
                }}
                onGenerateVideo={() => {
                  void handleGenerateVideo(meeting, index);
                }}
              />
            </article>
          );
        })}
      </div>
    </section>
  );
}

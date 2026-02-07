"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConnectGranola } from "@/components/ConnectGranola";
import { ErrorState } from "@/components/ErrorState";
import { GeneratingState } from "@/components/GeneratingState";
import type { ProgressStep, ProgressStepStatus } from "@/components/ProgressIndicator";
import { VideoControls } from "@/components/VideoControls";
import { VideoPlayer } from "@/components/VideoPlayer";
import type { GranolaMeeting } from "@/types/granola";

interface MeetingsPayload {
  meetings?: GranolaMeeting[];
  error?: string;
}

interface VideoPipelineProgressEvent {
  step?: string;
  status?: string;
  message?: string;
  timestamp?: string;
}

interface GeneratedVideoPayload {
  videoUrl?: string;
  runId?: string;
  error?: string;
  progress?: VideoPipelineProgressEvent[];
}

interface VideoGenerationRunPayload {
  status?: string;
  progress?: VideoPipelineProgressEvent[];
  error?: string;
}

type PipelineStep = "summary" | "prompt" | "video" | "saving";

interface GenerationProgressSnapshot {
  runId: string;
  progress: VideoPipelineProgressEvent[];
}

const STEP_LABELS: Record<PipelineStep, string> = {
  summary: "Fetching summary",
  prompt: "Generating prompt",
  video: "Creating video",
  saving: "Saving video",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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

function createRunId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `run-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeProgressEvents(progress: unknown): VideoPipelineProgressEvent[] {
  if (!Array.isArray(progress)) {
    return [];
  }

  const events: VideoPipelineProgressEvent[] = [];

  for (const entry of progress) {
    if (!isRecord(entry)) {
      continue;
    }

    const step = typeof entry.step === "string" ? entry.step : undefined;
    const status = typeof entry.status === "string" ? entry.status : undefined;
    const message = typeof entry.message === "string" ? entry.message : undefined;
    const timestamp = typeof entry.timestamp === "string" ? entry.timestamp : undefined;

    events.push({
      step,
      status,
      message,
      timestamp,
    });
  }

  return events;
}

function statusFromProgress(
  progress: VideoPipelineProgressEvent[],
  step: PipelineStep
): ProgressStepStatus {
  let currentStatus: ProgressStepStatus = "pending";

  for (const event of progress) {
    if (event.step !== step) {
      continue;
    }

    if (event.status === "running" || event.status === "completed" || event.status === "failed") {
      currentStatus = event.status;
    }
  }

  return currentStatus;
}

function buildProgressView(
  progress: VideoPipelineProgressEvent[],
  _progressTick: number
): { headline: string; detail: string; steps: ProgressStep[] } {
  const summaryStatus = statusFromProgress(progress, "summary");
  const promptStatus = statusFromProgress(progress, "prompt");
  const videoStatus = statusFromProgress(progress, "video");
  const savingStatus = statusFromProgress(progress, "saving");

  const steps: ProgressStep[] = [
    {
      id: "summary",
      label: STEP_LABELS.summary,
      status: summaryStatus,
    },
    {
      id: "prompt",
      label: STEP_LABELS.prompt,
      status: promptStatus,
    },
    {
      id: "video",
      label: STEP_LABELS.video,
      status: videoStatus,
    },
    {
      id: "saving",
      label: STEP_LABELS.saving,
      status: savingStatus,
    },
  ];

  const latestMessage =
    typeof progress[progress.length - 1]?.message === "string"
      ? (progress[progress.length - 1]?.message as string)
      : "Preparing recap generation.";

  let headline = STEP_LABELS.summary;

  if (savingStatus === "running" || savingStatus === "completed") {
    headline = STEP_LABELS.saving;
  } else if (videoStatus === "running" || videoStatus === "completed") {
    headline = STEP_LABELS.video;
  } else if (promptStatus === "running" || promptStatus === "completed") {
    headline = STEP_LABELS.prompt;
  } else if (summaryStatus === "completed") {
    headline = STEP_LABELS.prompt;
  }

  if (
    summaryStatus === "failed" ||
    promptStatus === "failed" ||
    videoStatus === "failed" ||
    savingStatus === "failed"
  ) {
    headline = "Generation failed";
  }

  return {
    headline,
    detail: latestMessage,
    steps,
  };
}

export function VideoFeed() {
  const [meetings, setMeetings] = useState<GranolaMeeting[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [videoByMeeting, setVideoByMeeting] = useState<Record<string, string>>({});
  const [generationErrors, setGenerationErrors] = useState<Record<string, string>>({});
  const [isGeneratingByMeeting, setIsGeneratingByMeeting] = useState<Record<string, boolean>>({});
  const [isPausedByMeeting, setIsPausedByMeeting] = useState<Record<string, boolean>>({});
  const [generationProgressByMeeting, setGenerationProgressByMeeting] = useState<
    Record<string, GenerationProgressSnapshot>
  >({});
  const [progressTick, setProgressTick] = useState(() => Date.now());

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

        if (response.status === 503) {
          setIsConnected(false);
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

  useEffect(() => {
    const hasActiveGeneration = Object.values(isGeneratingByMeeting).some(Boolean);

    if (!hasActiveGeneration) {
      return;
    }

    const intervalId = setInterval(() => {
      setProgressTick(Date.now());
    }, 900);

    return () => {
      clearInterval(intervalId);
    };
  }, [isGeneratingByMeeting]);

  const handleGenerateVideo = useCallback(async (meeting: GranolaMeeting, index: number) => {
    const key = meetingKey(meeting, index);
    const runId = createRunId();

    setGenerationErrors((previous) => {
      if (!previous[key]) {
        return previous;
      }

      const nextState = { ...previous };
      delete nextState[key];
      return nextState;
    });
    setGenerationProgressByMeeting((previous) => ({
      ...previous,
      [key]: {
        runId,
        progress: [
          {
            step: "summary",
            status: "running",
            message: "Fetching meeting summary.",
            timestamp: new Date().toISOString(),
          },
        ],
      },
    }));
    setIsGeneratingByMeeting((previous) => ({
      ...previous,
      [key]: true,
    }));
    setProgressTick(Date.now());

    let keepPolling = true;

    const pollProgress = async () => {
      while (keepPolling) {
        try {
          const progressResponse = await fetch(`/api/generate-video?runId=${encodeURIComponent(runId)}`, {
            cache: "no-store",
          });
          const runPayload =
            (await progressResponse.json().catch(() => ({}))) as VideoGenerationRunPayload;

          if (progressResponse.ok) {
            const progressEvents = normalizeProgressEvents(runPayload.progress);

            if (progressEvents.length > 0) {
              setGenerationProgressByMeeting((previous) => ({
                ...previous,
                [key]: {
                  runId,
                  progress: progressEvents,
                },
              }));
            }
          }

          if (
            runPayload.status === "completed" ||
            runPayload.status === "failed"
          ) {
            keepPolling = false;
          }
        } catch {
          // Ignore transient polling errors and continue until the POST request resolves.
        }

        if (!keepPolling) {
          break;
        }

        await sleep(1200);
      }
    };

    const pollTask = pollProgress();

    try {
      const response = await fetch("/api/generate-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meetingId: meeting.id,
          runId,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as GeneratedVideoPayload;
      const responseProgress = normalizeProgressEvents(payload.progress);

      if (responseProgress.length > 0) {
        setGenerationProgressByMeeting((previous) => ({
          ...previous,
          [key]: {
            runId,
            progress: responseProgress,
          },
        }));
      }

      if (response.status === 503) {
        setIsConnected(false);
        setGenerationErrors((previous) => ({
          ...previous,
          [key]: "Granola is not configured. Set GRANOLA_API_TOKEN.",
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
      keepPolling = false;
      await pollTask;
      setIsGeneratingByMeeting((previous) => ({
        ...previous,
        [key]: false,
      }));
    }
  }, []);

  if (isLoadingMeetings) {
    return (
      <section className="flex h-screen h-[100dvh] items-center justify-center bg-[linear-gradient(160deg,#020617,#0f172a,#111827)] text-slate-200">
        <p className="rounded-full border border-white/20 bg-black/25 px-5 py-2 text-sm tracking-wide">
          Loading meetings...
        </p>
      </section>
    );
  }

  if (!isConnected) {
    return (
      <section className="flex h-screen h-[100dvh] items-center justify-center bg-[linear-gradient(160deg,#020617,#0f172a,#111827)] p-6 text-slate-100">
        <div className="w-full max-w-md rounded-3xl border border-white/20 bg-black/30 p-7 text-center shadow-2xl backdrop-blur">
          <p className="text-xs uppercase tracking-[0.24em] text-emerald-200">Meeting recap feed</p>
          <h2 className="mt-4 text-2xl font-semibold">Configure Granola to start swiping recaps</h2>
          <p className="mt-3 text-sm text-slate-300">
            Set the GRANOLA_API_TOKEN environment variable to load meetings and generate TikTok-style recap videos.
          </p>
          <div className="mt-6 flex justify-center">
            <ConnectGranola connected={false} />
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
      <section className="flex h-screen h-[100dvh] items-center justify-center bg-[linear-gradient(160deg,#020617,#0f172a,#111827)] p-6 text-slate-100">
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
    <section className="relative h-screen h-[100dvh] w-full overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-black/75 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-48 bg-gradient-to-t from-black/80 to-transparent" />

      <div
        ref={feedRef}
        className="ios-scroll scrollbar-hidden h-screen h-[100dvh] snap-y snap-mandatory overflow-y-auto overscroll-y-contain touch-pan-y"
      >
        {meetings.map((meeting, index) => {
          const key = meetingKey(meeting, index);
          const hasVideo = typeof videoByMeeting[key] === "string";
          const isPaused = Boolean(isPausedByMeeting[key]);
          const isCurrentSlide = index === activeIndex;
          const isPlaying = isCurrentSlide && hasVideo && !isPaused;
          const isGenerating = Boolean(isGeneratingByMeeting[key]);
          const keyPoints = summarizeKeyPoints(meeting.summary);
          const progressView = buildProgressView(
            generationProgressByMeeting[key]?.progress ?? [],
            progressTick
          );

          return (
            <article
              key={key}
              data-index={index}
              ref={(node) => {
                setSlideRef(index, node);
              }}
              className="relative h-screen h-[100dvh] snap-start"
            >
              <VideoPlayer
                videoUrl={videoByMeeting[key]}
                isActive={isCurrentSlide}
                isPaused={isPaused}
                title={meeting.title}
              />

              {isGenerating ? (
                <GeneratingState
                  title={meeting.title}
                  headline={progressView.headline}
                  detail={progressView.detail}
                  steps={progressView.steps}
                />
              ) : null}

              <div className="absolute right-[calc(var(--safe-right)+1.25rem)] top-[calc(var(--safe-top)+1rem)] z-20 rounded-full border border-white/20 bg-black/35 px-3 py-1 text-xs font-medium text-slate-100 backdrop-blur motion-safe:animate-[fade-up_500ms_ease-out_forwards]">
                {index + 1} / {meetings.length}
              </div>

              <div className="absolute bottom-[calc(var(--safe-bottom)+1.5rem)] left-[calc(var(--safe-left)+1.25rem)] right-[calc(var(--safe-right)+6rem)] z-20 rounded-2xl border border-white/15 bg-black/35 p-4 shadow-xl backdrop-blur motion-safe:animate-[fade-up_520ms_ease-out_forwards] sm:p-5">
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
                  <ErrorState
                    message={generationErrors[key]}
                    isRetrying={isGenerating}
                    onRetry={() => {
                      void handleGenerateVideo(meeting, index);
                    }}
                  />
                ) : null}
              </div>

              <VideoControls
                hasVideo={hasVideo}
                isPlaying={isPlaying}
                isGenerating={isGenerating}
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

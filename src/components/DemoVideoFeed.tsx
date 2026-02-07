"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface DemoMeeting {
  id: string;
  title: string;
  summary: string;
}

const DEMO_MEETINGS: DemoMeeting[] = [
  {
    id: "demo-1",
    title: "Q4 Strategy Review",
    summary:
      "Discussed quarterly revenue targets and market expansion plans.\nReviewed competitive landscape and adjusted pricing strategy.\nAligned on hiring goals for the next quarter.",
  },
  {
    id: "demo-2",
    title: "Product Roadmap Planning",
    summary:
      "Prioritized feature backlog for the upcoming release cycle.\nDebated trade-offs between performance improvements and new features.\nAgreed on launch timeline for the mobile app redesign.",
  },
  {
    id: "demo-3",
    title: "Engineering Sprint Retro",
    summary:
      "Identified bottlenecks in the CI/CD pipeline.\nCelebrated shipping the new onboarding flow ahead of schedule.\nPlanned improvements to code review turnaround time.",
  },
];

const DEMO_VIDEOS = ["/video0.mp4", "/video1.mp4", "/video2.mp4"];

function summarizeKeyPoints(summary: string): string[] {
  const lines = summary
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter(Boolean);

  return lines.slice(0, 3);
}

export function DemoVideoFeed() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPausedByIndex, setIsPausedByIndex] = useState<Record<number, boolean>>({});

  const feedRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<Array<HTMLElement | null>>([]);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);

  const setSlideRef = useCallback((index: number, node: HTMLElement | null) => {
    slideRefs.current[index] = node;
  }, []);

  const setVideoRef = useCallback((index: number, node: HTMLVideoElement | null) => {
    videoRefs.current[index] = node;
  }, []);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    for (let i = 0; i < DEMO_MEETINGS.length; i++) {
      const videoElement = videoRefs.current[i];

      if (!videoElement) {
        continue;
      }

      const isActive = i === activeIndex;
      const isPaused = Boolean(isPausedByIndex[i]);

      if (isActive && !isPaused) {
        const playPromise = videoElement.play();

        if (playPromise && typeof playPromise.catch === "function") {
          void playPromise.catch(() => {});
        }
      } else {
        videoElement.pause();
      }
    }
  }, [activeIndex, isPausedByIndex]);

  return (
    <section className="relative h-screen h-[100dvh] w-full overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-black/75 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-48 bg-gradient-to-t from-black/80 to-transparent" />

      <div
        ref={feedRef}
        className="ios-scroll scrollbar-hidden h-screen h-[100dvh] snap-y snap-mandatory overflow-y-auto overscroll-y-contain touch-pan-y"
      >
        {DEMO_MEETINGS.map((meeting, index) => {
          const isCurrentSlide = index === activeIndex;
          const isPaused = Boolean(isPausedByIndex[index]);
          const isPlaying = isCurrentSlide && !isPaused;
          const keyPoints = summarizeKeyPoints(meeting.summary);

          return (
            <article
              key={meeting.id}
              data-index={index}
              ref={(node) => {
                setSlideRef(index, node);
              }}
              className="relative h-screen h-[100dvh] snap-start"
            >
              <video
                ref={(node) => {
                  setVideoRef(index, node);
                }}
                className="absolute inset-0 h-full w-full object-contain [transform:translateZ(0)]"
                src={DEMO_VIDEOS[index]}
                playsInline
                loop
                preload="metadata"
              />

              <div className="absolute right-[calc(var(--safe-right)+1.25rem)] top-[calc(var(--safe-top)+1rem)] z-20 rounded-full border border-white/20 bg-black/35 px-3 py-1 text-xs font-medium text-slate-100 backdrop-blur motion-safe:animate-[fade-up_500ms_ease-out_forwards]">
                {index + 1} / {DEMO_MEETINGS.length}
              </div>

              <div className="absolute bottom-[calc(var(--safe-bottom)+1.5rem)] left-[calc(var(--safe-left)+1.25rem)] right-[calc(var(--safe-right)+1.25rem)] z-20 motion-safe:animate-[fade-up_520ms_ease-out_forwards]">
                <div className="relative rounded-2xl border border-white/15 bg-black/35 p-4 shadow-xl backdrop-blur sm:p-5">
                  {index === 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-emerald-200">
                        Meeting recap
                      </p>
                      <h3 className="mt-2 text-xl font-semibold leading-tight">{meeting.title}</h3>
                      <ul className="mt-3 space-y-1 text-sm text-slate-100">
                        {keyPoints.map((point, pointIndex) => (
                          <li key={`${meeting.id}-${pointIndex}`} className="flex gap-2">
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
                    </div>
                  )}
                  {index !== 0 && (
                    <div>
                      <h3 className="text-xl font-semibold leading-tight">{meeting.title}</h3>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="absolute inset-0 z-15"
                aria-label={isPlaying ? "Pause" : "Play"}
                onClick={() => {
                  setIsPausedByIndex((previous) => ({
                    ...previous,
                    [index]: !previous[index],
                  }));
                }}
              />

              {isPaused && isCurrentSlide && (
                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                  <div className="rounded-full bg-black/50 p-4 backdrop-blur">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-10 w-10 text-white"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

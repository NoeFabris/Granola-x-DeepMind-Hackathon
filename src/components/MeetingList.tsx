"use client";

import { useEffect, useMemo, useState } from "react";
import { ConnectGranola } from "@/components/ConnectGranola";
import { MeetingCard } from "@/components/MeetingCard";
import type { GranolaMeeting } from "@/types/granola";

interface MeetingsPayload {
  meetings?: GranolaMeeting[];
  error?: string;
}

export function MeetingList() {
  const [meetings, setMeetings] = useState<GranolaMeeting[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          requestError instanceof Error
            ? requestError.message
            : "Unable to load meetings right now.";

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

  const emptyStateLabel = useMemo(() => {
    if (!isConnected) {
      return "Set GRANOLA_API_TOKEN to load your recent meetings.";
    }

    return "No meetings available yet.";
  }, [isConnected]);

  return (
    <section className="w-full max-w-2xl rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg)] p-5 shadow-xl backdrop-blur motion-safe:animate-[fade-up_520ms_ease-out_forwards]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--app-fg)]">Recent meetings</h2>
          <p className="text-sm text-[color:var(--app-muted)]">From your Granola account</p>
        </div>
        <ConnectGranola connected={isConnected} />
      </div>

      {isLoadingMeetings ? (
        <p className="mt-4 text-sm text-[color:var(--app-muted)]">Loading meetings...</p>
      ) : null}

      {!isLoadingMeetings && error ? (
        <p className="mt-4 rounded-xl border border-rose-300/40 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-100">
          {error}
        </p>
      ) : null}

      {!isLoadingMeetings && !error && meetings.length === 0 ? (
        <p className="mt-4 rounded-xl border border-[color:var(--panel-border)] bg-white/60 p-3 text-sm text-[color:var(--app-muted)] dark:bg-white/5">
          {emptyStateLabel}
        </p>
      ) : null}

      {!isLoadingMeetings && meetings.length > 0 ? (
        <div className="mt-4 space-y-3">
          {meetings.map((meeting, index) => (
            <MeetingCard key={`${meeting.id}-${index}`} meeting={meeting} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

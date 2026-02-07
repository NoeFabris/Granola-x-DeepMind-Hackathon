"use client";

import { useEffect, useMemo, useState } from "react";
import { ConnectGranola } from "@/components/ConnectGranola";
import { MeetingCard } from "@/components/MeetingCard";
import { useGranolaToken } from "@/hooks/useGranolaToken";
import type { GranolaMeeting } from "@/types/granola";

interface MeetingsPayload {
  meetings?: GranolaMeeting[];
  error?: string;
}

export function MeetingList() {
  const { token, hasToken, isLoading: isLoadingToken, setToken, clearToken } = useGranolaToken();
  const [meetings, setMeetings] = useState<GranolaMeeting[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoadingToken || !hasToken || !token) {
      setIsConnected(false);
      setMeetings([]);
      return;
    }

    const accessToken = token;

    if (!accessToken) {
      return;
    }

    let isMounted = true;

    async function loadMeetings() {
      setIsLoadingMeetings(true);

      try {
        const response = await fetch("/api/meetings?limit=20", {
          cache: "no-store",
          headers: {
            "X-Granola-Token": accessToken,
          },
        });
        const payload = (await response.json().catch(() => ({}))) as MeetingsPayload;

        if (!isMounted) {
          return;
        }

        if (response.status === 401) {
          setIsConnected(false);
          setMeetings([]);
          setError(payload.error || "Invalid Granola access token. Please reconnect.");
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
  }, [token, hasToken, isLoadingToken]);

  const handleConnect = (newToken: string) => {
    setToken(newToken);
    setError(null);
  };

  const handleDisconnect = () => {
    clearToken();
    setIsConnected(false);
    setMeetings([]);
    setError(null);
  };

  const emptyStateLabel = useMemo(() => {
    if (!hasToken) {
      return null;
    }

    return "No meetings available yet.";
  }, [hasToken]);

  if (isLoadingToken) {
    return (
      <section className="w-full max-w-2xl rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg)] p-5 shadow-xl backdrop-blur motion-safe:animate-[fade-up_520ms_ease-out_forwards]">
        <p className="text-sm text-[color:var(--app-muted)]">Loading...</p>
      </section>
    );
  }

  return (
    <section className="w-full max-w-2xl rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg)] p-5 shadow-xl backdrop-blur motion-safe:animate-[fade-up_520ms_ease-out_forwards]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--app-fg)]">Recent meetings</h2>
          <p className="text-sm text-[color:var(--app-muted)]">From your Granola account</p>
        </div>
        {isConnected && (
          <ConnectGranola
            connected={isConnected}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        )}
      </div>

      {!hasToken && (
        <div className="mt-4">
          <ConnectGranola
            connected={false}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        </div>
      )}

      {isLoadingMeetings ? (
        <p className="mt-4 text-sm text-[color:var(--app-muted)]">Loading meetings...</p>
      ) : null}

      {!isLoadingMeetings && error ? (
        <p className="mt-4 rounded-xl border border-rose-300/40 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-100">
          {error}
        </p>
      ) : null}

      {!isLoadingMeetings && !error && hasToken && meetings.length === 0 ? (
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

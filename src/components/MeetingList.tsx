"use client";

import { useEffect, useMemo, useState } from "react";
import { ConnectGranola } from "@/components/ConnectGranola";
import { MeetingCard } from "@/components/MeetingCard";
import type { GranolaMeeting } from "@/types/granola";

interface MeetingsPayload {
  meetings?: GranolaMeeting[];
  authUrl?: string;
  connectUrl?: string;
  error?: string;
}

interface MeetingListProps {
  initialConnected?: boolean;
}

const DEFAULT_CONNECT_URL = "/api/auth/granola/connect";

function parseConnectUrl(payload: MeetingsPayload): string {
  if (typeof payload.authUrl === "string" && payload.authUrl.length > 0) {
    return payload.authUrl;
  }

  if (typeof payload.connectUrl === "string" && payload.connectUrl.length > 0) {
    return payload.connectUrl;
  }

  return DEFAULT_CONNECT_URL;
}

export function MeetingList({ initialConnected = false }: MeetingListProps) {
  const [meetings, setMeetings] = useState<GranolaMeeting[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [isConnected, setIsConnected] = useState(initialConnected);
  const [connectUrl, setConnectUrl] = useState(DEFAULT_CONNECT_URL);
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
      return "Connect Granola to load your recent meetings.";
    }

    return "No meetings available yet.";
  }, [isConnected]);

  return (
    <section className="w-full max-w-md rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Recent meetings</h2>
          <p className="text-sm text-slate-600">From your Granola account</p>
        </div>
        <ConnectGranola connected={isConnected} connectUrl={connectUrl} />
      </div>

      {isLoadingMeetings ? (
        <p className="mt-4 text-sm text-slate-600">Loading meetings...</p>
      ) : null}

      {!isLoadingMeetings && error ? (
        <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {!isLoadingMeetings && !error && meetings.length === 0 ? (
        <p className="mt-4 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-600">
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

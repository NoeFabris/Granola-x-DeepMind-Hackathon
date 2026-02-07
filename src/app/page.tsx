import { MeetingList } from "@/components/MeetingList";
import { VideoFeed } from "@/components/VideoFeed";

interface HomePageProps {
  searchParams?: {
    granola?: string | string[];
  };
}

export default function HomePage({ searchParams }: HomePageProps) {
  const granolaStatus = Array.isArray(searchParams?.granola)
    ? searchParams?.granola[0]
    : searchParams?.granola;
  const initialConnected = granolaStatus === "connected";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="relative">
        <VideoFeed initialConnected={initialConnected} />

        <header className="pointer-events-none absolute left-4 top-4 z-30 max-w-xs rounded-2xl border border-white/20 bg-black/40 p-4 shadow-lg backdrop-blur">
          <h1 className="text-xl font-semibold md:text-2xl">Meeting Recap Feed</h1>
          <p className="mt-2 text-xs text-slate-200 md:text-sm">
            Swipe through AI recap videos generated from your recent Granola meetings.
          </p>
        </header>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <details className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg">
          <summary className="cursor-pointer text-sm font-semibold text-slate-100">
            Open meeting list
          </summary>
          <div className="mt-4 flex justify-center">
            <MeetingList initialConnected={initialConnected} />
          </div>
        </details>
      </div>
    </main>
  );
}

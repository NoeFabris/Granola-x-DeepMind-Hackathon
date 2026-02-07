import { MeetingList } from "@/components/MeetingList";
import { Header } from "@/components/Header";
import { VideoFeed } from "@/components/VideoFeed";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      <div className="relative">
        <VideoFeed />
        <Header title="Meeting Recap Feed" />
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <details className="rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg)] p-4 shadow-xl backdrop-blur">
          <summary className="cursor-pointer text-sm font-semibold text-[color:var(--app-fg)]">
            Open meeting list
          </summary>
          <div className="mt-4 flex justify-center">
            <MeetingList />
          </div>
        </details>
      </div>
    </main>
  );
}

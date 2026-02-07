import { MeetingList } from "@/components/MeetingList";
import { Header } from "@/components/Header";
import { VideoFeed } from "@/components/VideoFeed";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      <div className="relative">
        <VideoFeed />
        <Header title="GranolaTok" />
      </div>
    </main>
  );
}

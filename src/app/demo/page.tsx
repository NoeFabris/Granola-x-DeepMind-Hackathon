import { Header } from "@/components/Header";
import { DemoVideoFeed } from "@/components/DemoVideoFeed";

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)]">
      <div className="relative">
        <DemoVideoFeed />
        <Header title="GranolaTok" />
      </div>
    </main>
  );
}

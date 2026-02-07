import { MeetingList } from "@/components/MeetingList";

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
    <main className="min-h-screen bg-slate-100 p-6 md:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">Meeting Recap Feed</h1>
          <p className="mt-2 text-slate-600">
            Connect Granola to view recent meetings and generate recap content.
          </p>
        </header>

        <div className="mt-6">
          <MeetingList initialConnected={initialConnected} />
        </div>
      </div>
    </main>
  );
}

import type { GranolaMeeting } from "@/types/granola";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatMeetingDate(startedAt?: string): string {
  if (!startedAt) {
    return "Date not available";
  }

  const parsedDate = new Date(startedAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date not available";
  }

  return dateFormatter.format(parsedDate);
}

function toParticipantList(meeting: GranolaMeeting): string[] {
  const participantCandidates = [
    meeting.participants,
    meeting.participant_names,
    meeting.attendees,
    meeting.people,
  ];

  for (const candidate of participantCandidates) {
    if (typeof candidate === "string") {
      return candidate
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
    }

    if (Array.isArray(candidate)) {
      return candidate
        .map((entry) => {
          if (typeof entry === "string") {
            return entry.trim();
          }

          if (entry && typeof entry === "object" && "name" in entry) {
            const name = entry.name;

            if (typeof name === "string") {
              return name.trim();
            }
          }

          return "";
        })
        .filter(Boolean);
    }
  }

  return [];
}

interface MeetingCardProps {
  meeting: GranolaMeeting;
}

export function MeetingCard({ meeting }: MeetingCardProps) {
  const participants = toParticipantList(meeting);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">{meeting.title}</h3>
      <p className="mt-1 text-sm text-slate-500">{formatMeetingDate(meeting.startedAt)}</p>
      <p className="mt-3 text-sm text-slate-700">
        Participants: {participants.length > 0 ? participants.join(", ") : "Not listed"}
      </p>
    </article>
  );
}

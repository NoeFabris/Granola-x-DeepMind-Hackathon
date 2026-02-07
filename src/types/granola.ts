export interface GranolaMeeting {
  id: string;
  title: string;
  startedAt?: string;
  endedAt?: string;
  summary?: string;
  [key: string]: unknown;
}

export interface GranolaMeetingsResponse {
  meetings: GranolaMeeting[];
}

export interface GranolaDocumentSummaryResponse {
  documentId: string;
  summary: string;
}

export interface GranolaClientContext {
  sessionId: string;
  callbackBaseUrl: string;
}

export type GranolaProxyResult<T> =
  | {
      status: "ok";
      data: T;
    }
  | {
      status: "auth_required";
      authUrl: string;
    };

export interface GranolaMeeting {
  id: string;
  title: string;
  startedAt?: string;
  endedAt?: string;
  summary?: string;
  [key: string]: unknown;
}

export interface GranolaMeetingsResponse {
  toolName: string;
  meetings: GranolaMeeting[];
  raw: unknown;
}

export interface GranolaDocumentSummaryResponse {
  toolName: string;
  documentId: string;
  summary: string;
  raw: unknown;
}

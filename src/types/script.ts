export interface ScriptChunk {
  index: number;
  durationSeconds: number;
  narration: string;
  visualPrompt: string;
  textOverlay?: string;
}

export interface GeneratedMeetingScript {
  meetingId: string;
  summary: string;
  chunks: ScriptChunk[];
}

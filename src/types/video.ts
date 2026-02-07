import type { ScriptChunk } from "@/types/script";

export type VeoAspectRatio = "9:16" | "16:9";

export interface GenerateVeoClipsOptions {
  chunks: ScriptChunk[];
  aspectRatio?: VeoAspectRatio;
  model?: string;
  pollIntervalMs?: number;
  timeoutMs?: number;
}

export interface VeoGeneratedClip {
  index: number;
  durationSeconds: number;
  prompt: string;
  url?: string;
  bufferBase64?: string;
  mimeType?: string;
}

export interface VeoOperationStatus {
  done: boolean;
  errorMessage?: string;
  payload: unknown;
}

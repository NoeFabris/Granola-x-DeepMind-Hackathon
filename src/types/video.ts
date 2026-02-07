export type VeoAspectRatio = "9:16" | "16:9";

export interface VeoOperationStatus {
  done: boolean;
  errorMessage?: string;
  payload: unknown;
}

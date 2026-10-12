export type ActionErrorCode = "transient" | "business" | "session";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  /** Machine-readable failure for offline sync retries (not shown in UI). */
  errorCode?: ActionErrorCode;
};

/** Client-safe note shape (no server-only imports). */
export interface AppNote {
  id: string;
  title: string;
  createdAt: string;
  body: string;
}

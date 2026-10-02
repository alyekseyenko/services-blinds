import { z } from "zod";
import { TaskStatusEnum } from "@/lib/schemas";

export const SyncPhotosSchema = z.array(z.string().max(500_000)).max(12).optional().default([]);

export const SyncTaskStatusInputSchema = z.object({
  status: z.string().min(1),
  observations: z.string().max(20_000).optional(),
  photos: SyncPhotosSchema,
  clientRequestId: z.string().min(8).max(128).optional(),
});

export function parseSyncTaskStatus(status: string) {
  const normalized = status
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return TaskStatusEnum.safeParse(normalized);
}

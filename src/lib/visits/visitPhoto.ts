import { z } from "zod";

export const VISIT_PHOTO_MAX_COUNT = 8;
export const VISIT_PHOTO_MAX_BYTES = 350_000;
export const VISIT_PHOTO_TARGET_BYTES = 150_000;
export const VISIT_PHOTO_RETRY_BYTES = 200_000;
export const VISIT_PHOTO_MAX_EDGE_PX = 1280;

const CLIENT_REQUEST_ID_RE = /^[a-zA-Z0-9-]{8,128}$/;

export const VisitPhotoUploadInputSchema = z.object({
  taskId: z.string().uuid(),
  opportunityId: z.string().uuid(),
  clientRequestId: z.string().regex(CLIENT_REQUEST_ID_RE, "Identificador de foto inválido."),
});

export function isJpegBytes(buffer: Uint8Array): boolean {
  return buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8;
}

export function validateVisitPhotoByteSize(byteLength: number): string | null {
  if (!Number.isFinite(byteLength) || byteLength <= 0) {
    return "Ficheiro vazio.";
  }
  if (byteLength > VISIT_PHOTO_MAX_BYTES) {
    return "A foto é demasiado pesada. Tire outra mais perto ou com menos luz.";
  }
  return null;
}

export function buildVisitPhotoFilename(params: {
  clientRequestId: string;
  capturedAtMs: number;
}): string {
  const stamp = new Date(params.capturedAtMs).toISOString().replace(/[:.]/g, "-");
  return `terreno-${stamp}-${params.clientRequestId.slice(0, 8)}.jpg`;
}

export function visitPhotoQualityStep(attempt: number): number {
  if (attempt <= 0) return 0.82;
  if (attempt === 1) return 0.72;
  return 0.62;
}
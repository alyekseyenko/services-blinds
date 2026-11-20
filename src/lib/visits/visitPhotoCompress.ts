"use client";

import {
  VISIT_PHOTO_MAX_BYTES,
  VISIT_PHOTO_MAX_EDGE_PX,
  VISIT_PHOTO_RETRY_BYTES,
  VISIT_PHOTO_TARGET_BYTES,
  buildVisitPhotoFilename,
  visitPhotoQualityStep,
} from "@/lib/visits/visitPhoto";

export type VisitPhotoCompressOk = {
  ok: true;
  blob: Blob;
  filename: string;
};

export type VisitPhotoCompressErr = {
  ok: false;
  error: string;
};

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem."));
    };
    img.src = url;
  });
}

function scaledSize(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const edge = Math.max(width, height);
  if (edge <= maxEdge) return { width, height };
  const scale = maxEdge / edge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Falha ao comprimir a foto."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality
    );
  });
}

export async function compressVisitPhotoFile(
  file: File,
  clientRequestId: string
): Promise<VisitPhotoCompressOk | VisitPhotoCompressErr> {
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "Só são aceites imagens." };
  }

  let image: HTMLImageElement;
  try {
    image = await loadImageFromFile(file);
  } catch {
    return { ok: false, error: "Não foi possível ler a imagem." };
  }

  const { width, height } = scaledSize(image.naturalWidth, image.naturalHeight, VISIT_PHOTO_MAX_EDGE_PX);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { ok: false, error: "Não foi possível processar a foto neste dispositivo." };
  }
  ctx.drawImage(image, 0, 0, width, height);

  const capturedAtMs = Date.now();
  const filename = buildVisitPhotoFilename({ clientRequestId, capturedAtMs });

  let best: Blob | null = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const blob = await canvasToJpegBlob(canvas, visitPhotoQualityStep(attempt));
    best = blob;
    if (blob.size <= VISIT_PHOTO_TARGET_BYTES) break;
    if (attempt === 0 && blob.size <= VISIT_PHOTO_RETRY_BYTES) break;
    if (attempt >= 2 && blob.size <= VISIT_PHOTO_MAX_BYTES) break;
  }

  if (!best) {
    return { ok: false, error: "Falha ao comprimir a foto." };
  }

  if (best.size > VISIT_PHOTO_MAX_BYTES) {
    return {
      ok: false,
      error: "A foto ficou demasiado pesada. Tente outra mais perto ou com menos detalhe.",
    };
  }

  return { ok: true, blob: best, filename };
}
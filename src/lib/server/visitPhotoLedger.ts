import "server-only";

import { readFile, writeFile } from "fs/promises";
import { ensureAppDataDir, resolveAppDataFile } from "@/lib/server/scratchPath";

const LEDGER_FILE = "visit-photo-ledger.json";

export type VisitPhotoLedgerEntry = {
  fileId?: string;
  attachmentId?: string;
  updatedAt: string;
};

type LedgerStore = Record<string, VisitPhotoLedgerEntry>;

async function readLedger(): Promise<LedgerStore> {
  ensureAppDataDir();
  const path = resolveAppDataFile(LEDGER_FILE);
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as LedgerStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeLedger(store: LedgerStore): Promise<void> {
  ensureAppDataDir();
  const path = resolveAppDataFile(LEDGER_FILE);
  await writeFile(path, JSON.stringify(store), "utf8");
}

export async function getVisitPhotoLedgerEntry(
  clientRequestId: string
): Promise<VisitPhotoLedgerEntry | null> {
  const store = await readLedger();
  return store[clientRequestId] ?? null;
}

export async function setVisitPhotoLedgerEntry(
  clientRequestId: string,
  patch: Partial<VisitPhotoLedgerEntry>
): Promise<VisitPhotoLedgerEntry> {
  const store = await readLedger();
  const prev = store[clientRequestId];
  const next: VisitPhotoLedgerEntry = {
    ...prev,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  store[clientRequestId] = next;
  await writeLedger(store);
  return next;
}
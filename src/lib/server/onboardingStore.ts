import "server-only";

import {
  EMPTY_ONBOARDING_STORE,
  OnboardingStoreV1Schema,
  OnboardingTourIdSchema,
  OnboardingTourRecordSchema,
  type OnboardingStoreV1,
  type OnboardingTourId,
  type OnboardingTourRecord,
  type OnboardingTourStatus,
} from "@/lib/schemas/onboarding";
import { readJsonFile, writeJsonFileAtomic } from "@/lib/server/atomicJsonFile";
import { resolveAppDataFile } from "@/lib/server/scratchPath";

const FILENAME = "onboarding.json";

function storePath(): string {
  return resolveAppDataFile(FILENAME);
}

/** Pure parse + migration for tests and read path. */
export function parseOnboardingStore(raw: unknown): OnboardingStoreV1 {
  if (raw == null || typeof raw !== "object") {
    return { ...EMPTY_ONBOARDING_STORE, users: {} };
  }

  const parsed = OnboardingStoreV1Schema.safeParse(raw);
  if (parsed.success) return parsed.data;

  const legacy = raw as { users?: unknown };
  if (legacy.users && typeof legacy.users === "object") {
    return OnboardingStoreV1Schema.parse({
      version: 1,
      users: legacy.users,
    });
  }

  return { ...EMPTY_ONBOARDING_STORE, users: {} };
}

function readStore(): OnboardingStoreV1 {
  const raw = readJsonFile<unknown>(storePath(), EMPTY_ONBOARDING_STORE);
  return parseOnboardingStore(raw);
}

function writeStore(data: OnboardingStoreV1): void {
  writeJsonFileAtomic(storePath(), data);
}

export function getOnboardingTourStatus(
  userId: string,
  tourId: OnboardingTourId
): OnboardingTourStatus | null {
  const store = readStore();
  const record = store.users[userId]?.[tourId];
  return record?.status ?? null;
}

export function setOnboardingTourStatus(
  userId: string,
  tourId: OnboardingTourId,
  status: Exclude<OnboardingTourStatus, "pending">
): OnboardingTourRecord {
  OnboardingTourIdSchema.parse(tourId);
  const record = OnboardingTourRecordSchema.parse({
    status,
    updatedAt: new Date().toISOString(),
  });

  const store = readStore();
  const users = { ...store.users };
  const userRecord = { ...(users[userId] ?? {}) };
  userRecord[tourId] = record;
  users[userId] = userRecord;
  writeStore({ version: 1, users });

  return record;
}

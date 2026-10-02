import fs from "fs";
import path from "path";

/** Server-side durable data directory (mount a volume here in production). */
export function getAppDataDir(): string {
  const configured = process.env.APP_DATA_DIR?.trim();
  if (configured) return configured;
  return path.join(process.cwd(), "src/scratch");
}

export function resolveAppDataFile(filename: string): string {
  return path.join(getAppDataDir(), filename);
}

export function ensureAppDataDir(): void {
  if (typeof window !== "undefined") return;
  const dir = getAppDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

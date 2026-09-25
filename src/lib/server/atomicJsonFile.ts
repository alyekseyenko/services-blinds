import fs from "fs";
import path from "path";
import { ensureAppDataDir } from "./scratchPath";

export function readJsonFile<T>(filePath: string, fallback: T): T {
  ensureAppDataDir();
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
    }
  } catch {
    // corrupted or missing — treat as empty
  }
  return fallback;
}

export function writeJsonFileAtomic(filePath: string, data: unknown): void {
  ensureAppDataDir();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, filePath);
}

import fs from "fs";
import path from "path";
import { logger } from "@/lib/logger";
import { ensureAppDataDir } from "./scratchPath";

export function readJsonFile<T>(filePath: string, fallback: T): T {
  ensureAppDataDir();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8");
      return JSON.parse(raw) as T;
    }
  } catch (err: unknown) {
    if (fs.existsSync(filePath)) {
      const corruptPath = `${filePath}.corrupt-${Date.now()}`;
      try {
        fs.renameSync(filePath, corruptPath);
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error(
          `Ficheiro JSON corrompido; cópia em ${corruptPath}`,
          { filePath },
          error
        );
      } catch (renameErr: unknown) {
        const error =
          renameErr instanceof Error ? renameErr : new Error(String(renameErr));
        logger.error(
          "Ficheiro JSON corrompido e não foi possível renomear",
          { filePath },
          error
        );
      }
    }
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
  fs.writeFileSync(tmp, JSON.stringify(data), "utf8");
  try {
    fs.renameSync(tmp, filePath);
  } catch (err: unknown) {
    try {
      if (fs.existsSync(tmp)) {
        fs.unlinkSync(tmp);
      }
    } catch {
      /* ignore cleanup failure */
    }
    throw err;
  }
}

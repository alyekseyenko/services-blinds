import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { readJsonFile, writeJsonFileAtomic } from "@/lib/server/atomicJsonFile";

describe("atomicJsonFile", () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    delete process.env.APP_DATA_DIR;
  });

  it("renomeia ficheiro corrompido em vez de apagar silenciosamente", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "atomic-json-"));
    process.env.APP_DATA_DIR = tempDir;
    const filePath = path.join(tempDir, "data.json");
    fs.writeFileSync(filePath, "{ not-json", "utf8");

    const result = readJsonFile(filePath, [] as string[]);
    expect(result).toEqual([]);
    expect(fs.existsSync(filePath)).toBe(false);
    const corrupt = fs.readdirSync(tempDir).find((name) => name.startsWith("data.json.corrupt-"));
    expect(corrupt).toBeDefined();
  });

  it("escreve JSON de forma atómica", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "atomic-json-"));
    process.env.APP_DATA_DIR = tempDir;
    const filePath = path.join(tempDir, "outbox.json");
    writeJsonFileAtomic(filePath, [{ id: "a" }]);
    expect(readJsonFile(filePath, [])).toEqual([{ id: "a" }]);
    expect(fs.readdirSync(tempDir).some((n) => n.endsWith(".tmp"))).toBe(false);
  });
});

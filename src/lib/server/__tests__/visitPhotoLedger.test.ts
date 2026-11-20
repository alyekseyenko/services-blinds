import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import {
  getVisitPhotoLedgerEntry,
  setVisitPhotoLedgerEntry,
} from "@/lib/server/visitPhotoLedger";

const tempDir = path.join(os.tmpdir(), `visit-photo-ledger-${Date.now()}`);

describe("visitPhotoLedger", () => {
  beforeEach(() => {
    process.env.APP_DATA_DIR = tempDir;
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    delete process.env.APP_DATA_DIR;
  });

  it("guarda fileId e attachmentId por pedido", async () => {
    const id = "11111111-2222-3333-4444-555555555555";
    await setVisitPhotoLedgerEntry(id, { fileId: "file-1" });
    await setVisitPhotoLedgerEntry(id, { attachmentId: "att-1" });
    const row = await getVisitPhotoLedgerEntry(id);
    expect(row?.fileId).toBe("file-1");
    expect(row?.attachmentId).toBe("att-1");
  });
});
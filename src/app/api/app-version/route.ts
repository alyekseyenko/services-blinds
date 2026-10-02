import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

async function readBuildId(): Promise<string> {
  try {
    const raw = await readFile(join(process.cwd(), ".next", "BUILD_ID"), "utf8");
    const id = raw.trim();
    if (id) return id;
  } catch {
    /* standalone image */
  }
  return process.env.NEXT_DEPLOYMENT_ID?.trim() || "unknown";
}

export async function GET() {
  const buildId = await readBuildId();
  return NextResponse.json(
    { buildId },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}

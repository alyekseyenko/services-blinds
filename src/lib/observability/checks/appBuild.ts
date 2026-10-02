import { readFile } from "fs/promises";
import { join } from "path";
import { defineE2ECheck } from "../checkHelpers";

async function readBuildId(): Promise<string> {
  try {
    const raw = await readFile(join(process.cwd(), ".next", "BUILD_ID"), "utf8");
    const id = raw.trim();
    if (id) return id;
  } catch {
    /* standalone */
  }
  return process.env.NEXT_DEPLOYMENT_ID?.trim() || "";
}

export const appBuildVersionCheck = defineE2ECheck({
  id: "app-build-version",
  name: "Versão / build",
  category: "APP",
  description: "BUILD_ID ou NEXT_DEPLOYMENT_ID definidos",
  tier: "safe",
  covers: ["system:app-version", "api:/api/app-version"],
  remediation: "Deploy com build Next.js válido ou NEXT_DEPLOYMENT_ID no Docker.",
  async run() {
    const buildId = await readBuildId();
    if (!buildId || buildId === "unknown") {
      return {
        status: "WARN",
        message: "Identificador de build desconhecido.",
      };
    }
    return {
      status: "PASS",
      message: `Build: ${buildId.slice(0, 12)}…`,
      details: { buildId },
    };
  },
});

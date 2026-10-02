import fs from "fs";
import path from "path";

/** Converte `src/app/api/foo/bar/route.ts` → `/api/foo/bar` */
export function apiRouteFromRouteFile(relativePath: string): string {
  const withoutPrefix = relativePath
    .replace(/^src\/app\/api\//, "")
    .replace(/\\/g, "/");
  const route = withoutPrefix.replace(/\/route\.ts$/, "");
  return `/api/${route}`;
}

export function listAppApiRoutes(repoRoot = process.cwd()): string[] {
  const apiDir = path.join(repoRoot, "src", "app", "api");
  const routes: string[] = [];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name === "route.ts") {
        const rel = path.relative(repoRoot, full).replace(/\\/g, "/");
        routes.push(apiRouteFromRouteFile(rel));
      }
    }
  }

  walk(apiDir);
  return routes.sort();
}

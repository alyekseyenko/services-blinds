import { describe, expect, it } from "vitest";
import { OUTBOX_EVENT_TYPES } from "@/lib/integrations/outboxEvents";
import { E2E_COVERS_BY_CHECK_ID } from "../e2eCoversByCheckId";
import { E2E_CHECK_REGISTRY, collectRegistryCovers } from "../e2eRegistry";
import { INTEGRATION_SYSTEM_IDS } from "../integrationManifest";
import { listAppApiRoutes } from "../listApiRoutes";
import { OBSERVABILITY_API_EXEMPTIONS } from "../observabilityExemptions";

describe("observability coverage", () => {
  it("keeps e2eCoversByCheckId aligned with the server registry", () => {
    for (const check of E2E_CHECK_REGISTRY) {
      expect(E2E_COVERS_BY_CHECK_ID[check.id]).toEqual(check.covers);
    }
    expect(Object.keys(E2E_COVERS_BY_CHECK_ID).length).toBe(E2E_CHECK_REGISTRY.length);
  });

  it("has unique check ids", () => {
    const ids = E2E_CHECK_REGISTRY.map((c) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("covers every integration system in the manifest", () => {
    const covers = collectRegistryCovers();
    const missing = INTEGRATION_SYSTEM_IDS.filter(
      (id) => !covers.has(`system:${id}`)
    );
    expect(missing).toEqual([]);
  });

  it("covers every OUTBOX_EVENT_TYPE", () => {
    const covers = collectRegistryCovers();
    const missing = OUTBOX_EVENT_TYPES.filter(
      (event) => !covers.has(`event:${event}`)
    );
    expect(missing).toEqual([]);
  });

  it("covers every API route or lists an exemption", () => {
    const covers = collectRegistryCovers();
    const routes = listAppApiRoutes();
    const uncovered: string[] = [];

    for (const route of routes) {
      if (OBSERVABILITY_API_EXEMPTIONS[route]) continue;
      if (!covers.has(`api:${route}`)) {
        uncovered.push(route);
      }
    }

    expect(uncovered).toEqual([]);
  });

  it("documents exemptions only for existing routes", () => {
    const routes = new Set(listAppApiRoutes());
    const stale = Object.keys(OBSERVABILITY_API_EXEMPTIONS).filter(
      (r) => !routes.has(r)
    );
    expect(stale).toEqual([]);
  });
});

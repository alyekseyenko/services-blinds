import "server-only";

import { access, constants } from "fs/promises";
import { crmFetch } from "@/lib/crm/client";
import { env } from "@/lib/env";
import { getSharedRedisClient } from "@/lib/crmCache";

export interface HealthProbe {
  status: "connected" | "disconnected";
  latencyMs: number;
  error?: string;
}

export async function probeGraphql(): Promise<HealthProbe> {
  const start = Date.now();
  try {
    await crmFetch<{ __typename: string }>(
      "{ __typename }",
      {},
      { timeoutMs: 4000, maxRetries: 0, bypassCircuitBreaker: true }
    );
    return { status: "connected", latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: "disconnected",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "GraphQL probe failed",
    };
  }
}

export async function probeMetadata(): Promise<HealthProbe | null> {
  const start = Date.now();
  const metadataUrl =
    env.TWENTY_METADATA_URL || `${env.TWENTY_API_URL.replace(/\/$/, "")}/metadata`;

  try {
    const response = await fetch(metadataUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.TWENTY_API_KEY}`,
      },
      body: JSON.stringify({
        query: "{ currentWorkspace { id displayName } }",
      }),
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    if (payload.errors?.length) {
      throw new Error(payload.errors[0]?.message || "Metadata error");
    }

    return { status: "connected", latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: "disconnected",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Metadata probe failed",
    };
  }
}

export async function probeRedis(): Promise<HealthProbe> {
  const start = Date.now();
  try {
    const client = await getSharedRedisClient();
    if (!client) {
      return {
        status: "disconnected",
        latencyMs: Date.now() - start,
        error: "Redis não configurado",
      };
    }
    await client.ping();
    return { status: "connected", latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: "disconnected",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Redis indisponível",
    };
  }
}

export async function probeAppDataDir(): Promise<HealthProbe> {
  const start = Date.now();
  const dir = process.env.APP_DATA_DIR?.trim() || "/app/data";
  try {
    await access(dir, constants.W_OK);
    return { status: "connected", latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: "disconnected",
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Volume de dados indisponível",
    };
  }
}

export async function runAppHealthProbes() {
  const [graphql, metadata, redis, appData] = await Promise.all([
    probeGraphql(),
    probeMetadata(),
    probeRedis(),
    probeAppDataDir(),
  ]);
  const healthy = graphql.status === "connected";
  return {
    healthy,
    graphql,
    metadata,
    redis,
    appData,
    authOriginConfigured: Boolean(env.TWENTY_AUTH_ORIGIN),
  };
}

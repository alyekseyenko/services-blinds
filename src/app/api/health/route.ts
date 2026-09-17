import { NextResponse } from 'next/server';
import { crmFetch } from '@/lib/crm/client';
import { env } from '@/lib/env';

interface HealthProbe {
  status: 'connected' | 'disconnected';
  latencyMs: number;
  error?: string;
}

async function probeGraphql(): Promise<HealthProbe> {
  const start = Date.now();
  try {
    await crmFetch<{ __typename: string }>(
      '{ __typename }',
      {},
      { timeoutMs: 4000, maxRetries: 0 }
    );
    return { status: 'connected', latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: 'disconnected',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'GraphQL probe failed',
    };
  }
}

async function probeMetadata(): Promise<HealthProbe | null> {
  const start = Date.now();
  const metadataUrl =
    env.TWENTY_METADATA_URL || `${env.TWENTY_API_URL.replace(/\/$/, '')}/metadata`;

  try {
    const response = await fetch(metadataUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.TWENTY_API_KEY}`,
      },
      body: JSON.stringify({
        query: '{ currentWorkspace { id displayName } }',
      }),
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    if (payload.errors?.length) {
      throw new Error(payload.errors[0]?.message || 'Metadata error');
    }

    return { status: 'connected', latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: 'disconnected',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Metadata probe failed',
    };
  }
}

export async function GET() {
  const graphql = await probeGraphql();
  const metadata = await probeMetadata();
  const healthy = graphql.status === 'connected';

  return NextResponse.json(
    {
      status: healthy ? 'healthy' : 'unhealthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      crm: {
        graphql,
        metadata,
        authOriginConfigured: Boolean(env.TWENTY_AUTH_ORIGIN),
      },
    },
    { status: healthy ? 200 : 503 }
  );
}

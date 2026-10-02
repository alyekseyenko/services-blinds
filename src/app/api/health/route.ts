import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import {
  probeAppDataDir,
  probeGraphql,
  probeMetadata,
  probeRedis,
} from '@/lib/server/healthProbes';
import { getAppSession } from '@/lib/auth/session.server';
import { isStrictAdminRole } from '@/lib/auth/rbac';

const PUBLIC_HEALTH_CACHE_MS = 12_000;
let publicHealthCache: {
  at: number;
  status: number;
  body: { status: string };
} | null = null;

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get('probe') === 'live') {
    return NextResponse.json({ status: 'healthy', probe: 'live' }, { status: 200 });
  }

  const auth = await getAppSession();
  const strictAdmin = auth?.user.role && isStrictAdminRole(auth.user.role);

  if (!strictAdmin) {
    const now = Date.now();
    if (publicHealthCache && now - publicHealthCache.at < PUBLIC_HEALTH_CACHE_MS) {
      return NextResponse.json(publicHealthCache.body, { status: publicHealthCache.status });
    }

    const graphql = await probeGraphql();
    const healthy = graphql.status === 'connected';
    const body = { status: healthy ? 'healthy' : 'unhealthy' };
    const status = healthy ? 200 : 503;
    publicHealthCache = { at: now, body, status };
    return NextResponse.json(body, { status });
  }

  const [graphql, metadata, redis, appData] = await Promise.all([
    probeGraphql(),
    probeMetadata(),
    probeRedis(),
    probeAppDataDir(),
  ]);
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
      redis,
      appData,
    },
    { status: healthy ? 200 : 503 }
  );
}

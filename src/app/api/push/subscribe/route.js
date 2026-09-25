
import { NextResponse } from 'next/server';
import { getAppSession } from '@/lib/auth/session.server';

export async function POST(request) {
  try {
    const ctx = await getAppSession();
    if (!ctx) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { subscription } = await request.json();
    const userId = ctx.user.id;
    const userName = ctx.user.name || ctx.user.email || userId;

    console.log(`[Push] New subscription received for user: ${userName} (${userId})`);

    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL_PUSH || 'http://localhost:5678/webhook-test/app-push-subscription';

    await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'PUSH_SUBSCRIPTION',
        subscription,
        userId,
        userName,
        timestamp: new Date().toISOString()
      }),
      signal: AbortSignal.timeout(30_000),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in push subscription API:', error);
    const message = error instanceof Error ? error.message : 'Erro ao registar subscrição.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

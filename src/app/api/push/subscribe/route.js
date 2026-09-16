
import { NextResponse } from 'next/server';

// In a real production app, you would save this to a database like Twenty CRM or PostgreSQL
// For this POC, we'll forward it to n8n so it can manage the push sending
export async function POST(request) {
  try {
    const { subscription, userId, userName } = await request.json();
    
    console.log(`[Push] New subscription received for user: ${userName} (${userId})`);
    
    // Forward to n8n for management
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL_PUSH || 'http://localhost:5678/webhook-test/habitarmos-push-subscription';
    
    await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'PUSH_SUBSCRIPTION',
        subscription,
        userId,
        userName,
        timestamp: new Date().toISOString()
      })
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in push subscription API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

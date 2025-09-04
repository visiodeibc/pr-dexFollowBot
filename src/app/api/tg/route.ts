import { NextRequest, NextResponse } from 'next/server';
import { bot } from '@/bot/bot';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const isLocal = process.env.NODE_ENV !== 'production';
    // Verify webhook secret token
    const secretToken = request.headers.get('x-telegram-bot-api-secret-token');
    
    if (secretToken !== env.WEBHOOK_SECRET) {
      console.error('Invalid webhook secret token');
      const res = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      if (isLocal) console.log('Webhook responded:', 401);
      return res;
    }

    // Parse the update from Telegram
    const update = await request.json();
    if (isLocal) {
      try {
        console.log('Webhook update:', JSON.stringify(update, null, 2));
      } catch {
        console.log('Webhook update received (non-serializable)');
      }
    }
    
    // Handle the update with grammY
    await bot().handleUpdate(update);
    
    const res = NextResponse.json({ ok: true });
    if (isLocal) console.log('Webhook responded:', 200, '{ ok: true }');
    return res;
  } catch (error) {
    console.error('Webhook error:', error);
    const res = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    if (process.env.NODE_ENV !== 'production') console.log('Webhook responded:', 500);
    return res;
  }
}

// Health check for GET requests
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    bot: 'telegram-bot-vercel'
  });
}

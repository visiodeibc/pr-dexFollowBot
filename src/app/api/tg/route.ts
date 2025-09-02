import { NextRequest, NextResponse } from 'next/server';
import { bot } from '@/bot/bot';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret token
    const secretToken = request.headers.get('x-telegram-bot-api-secret-token');
    
    if (secretToken !== env.WEBHOOK_SECRET) {
      console.error('Invalid webhook secret token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the update from Telegram
    const update = await request.json();
    
    // Handle the update with grammY
    await bot().handleUpdate(update);
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
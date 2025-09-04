#!/usr/bin/env tsx

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import { env } from '../src/lib/env';

interface WebhookResponse {
  ok: boolean;
  result?: boolean;
  description?: string;
}

async function setWebhook() {
  const { BOT_TOKEN, WEBHOOK_SECRET, PUBLIC_URL } = env;

  if (!PUBLIC_URL) {
    console.error('❌ PUBLIC_URL is required to set webhook');
    process.exit(1);
  }

  const webhookUrl = `${PUBLIC_URL}/api/tg`;
  const telegramApiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`;

  console.log('🔧 Setting webhook...');
  console.log(`📍 Webhook URL: ${webhookUrl}`);

  try {
    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: WEBHOOK_SECRET,
        drop_pending_updates: true,
      }),
    });

    const data: WebhookResponse = await response.json();

    if (data.ok) {
      console.log('✅ Webhook set successfully!');
      console.log(`🔗 Bot will receive updates at: ${webhookUrl}`);
    } else {
      console.error('❌ Failed to set webhook:', data.description);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error setting webhook:', error);
    process.exit(1);
  }
}

// Run the script
setWebhook().catch((error) => {
  console.error('Failed to set webhook:', error);
  process.exit(1);
});

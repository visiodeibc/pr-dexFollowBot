#!/usr/bin/env tsx

import dotenv from 'dotenv';
// Load .env.local first (if present), then .env as fallback
dotenv.config({ path: '.env.local' });
dotenv.config();

let stopBot: (() => void) | null = null;

async function main() {
  console.log('🤖 Starting Telegram bot in polling mode...');
  console.log('Press Ctrl+C to stop the bot');

  const { bot } = await import('./bot/bot');
  const getBot = bot;
  await getBot().start();
  stopBot = () => getBot().stop();
}

// Handle graceful shutdown
process.once('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, stopping bot...');
  try { stopBot?.(); } catch {}
  process.exit(0);
});

process.once('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, stopping bot...');
  try { stopBot?.(); } catch {}
  process.exit(0);
});

// Catch unhandled errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
  process.exit(1);
});

// Start the bot
main().catch((error) => {
  console.error('Failed to start bot:', error);
  process.exit(1);
});

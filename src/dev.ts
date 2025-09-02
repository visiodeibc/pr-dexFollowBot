#!/usr/bin/env tsx

import { bot } from './bot/bot';

async function main() {
  console.log('🤖 Starting Telegram bot in polling mode...');
  console.log('Press Ctrl+C to stop the bot');
  
  // Start the bot in polling mode
  await bot().start();
}

// Handle graceful shutdown
process.once('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, stopping bot...');
  bot().stop();
  process.exit(0);
});

process.once('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, stopping bot...');
  bot().stop();
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
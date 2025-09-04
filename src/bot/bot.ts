import { Bot, GrammyError, HttpError, InlineKeyboard } from 'grammy';
import { env } from '@/lib/env';
import { createJob } from '@/lib/supabase';
import { joinWaitlist, isInWaitlist, setWaitlistEmail, setWaitlistWallet } from '@/lib/waitlist';

// Lazy bot instance creation
let _bot: Bot | null = null;

function getBot(): Bot {
  if (_bot) return _bot;
  
  _bot = new Bot(env.BOT_TOKEN);
  setupBotHandlers(_bot);
  return _bot;
}

function setupBotHandlers(bot: Bot) {
  // Development-only verbose logging of updates and API calls
  const isLocal = process.env.NODE_ENV !== 'production';
  if (isLocal) {
    bot.use(async (ctx, next) => {
      try {
        console.log('⬇️ Incoming update:', JSON.stringify(ctx.update, null, 2));
      } catch {
        console.log('⬇️ Incoming update received (non-serializable)');
      }

      const start = Date.now();
      try {
        await next();
      } finally {
        const ms = Date.now() - start;
        console.log(`✔️ Handled update in ${ms}ms`);
      }
    });

    // Log outgoing Telegram API calls and their results
    bot.api.config.use(async (prev, method, payload, signal) => {
      try {
        console.log('→ API call:', method, safeJson(payload));
      } catch {
        console.log('→ API call:', method, '[unlogged payload]');
      }
      try {
        const res = await prev(method, payload, signal);
        try {
          // Avoid huge/circular logs; print shallow info only
          const summary = summarizeResult(res);
          console.log('← API result:', method, summary);
        } catch {
          console.log('← API result:', method, '[unlogged result]');
        }
        return res;
      } catch (err) {
        console.error('✖ API error:', method, err);
        throw err;
      }
    });
  }

// Start command with inline keyboard
bot.command('start', async (ctx) => {
  const keyboard = new InlineKeyboard()
    .text('📝 Join waitlist', 'join_waitlist')
    .row()
    .text('✉️ Add email', 'add_email')
    .text('💼 Add wallet', 'add_wallet')
    .row()
    .text('🏓 Ping me!', 'ping');

  await ctx.reply(
    `🤖 Crypto Wallet Follow Bot (Solana-first)

Track wallets and get summarized transaction updates in Telegram.

We are gathering early users now. Tap below or use /waitlist to join free early access.`,
    { reply_markup: keyboard }
  );
});

// Help command
bot.command('help', async (ctx) => {
  await ctx.reply(
    `📚 Available commands:

/start - Get started with the bot
/help - Show this help message
/waitlist - Join the free early-access waitlist
/email <you@example.com> - Save an optional email for updates
/wallet <solana_address> - Save your preferred Solana wallet
/echo <text> - Echo your message back
/job <message> - Create a background job (demo)

You can also send me any text and I'll echo it back!`
  );
});

// Echo command
bot.command('echo', async (ctx) => {
  const text = ctx.match;
  if (!text) {
    await ctx.reply('Please provide some text to echo. Example: /echo Hello World');
    return;
  }
  
  await ctx.reply(`Echo: ${text}`);
});

// Job command - demonstrates background worker integration
bot.command('job', async (ctx) => {
  const message = ctx.match;
  if (!message) {
    await ctx.reply('Please provide a message for the job. Example: /job Process this data');
    return;
  }

  try {
    const job = await createJob('echo_job', ctx.chat.id, { message });
    
    if (job) {
      await ctx.reply(`✅ Background job created with ID: ${job.id}`);
    } else {
      await ctx.reply('❌ Failed to create background job');
    }
  } catch (error) {
    console.error('Error creating job:', error);
    await ctx.reply('❌ Error creating background job');
  }
});

// Waitlist command
bot.command('waitlist', async (ctx) => {
  const from = ctx.from;
  if (!from) {
    await ctx.reply('Could not read your user info. Please try again.');
    return;
  }
  const res = await joinWaitlist(
    {
      id: from.id,
      username: from.username,
      first_name: (from as any).first_name,
      last_name: (from as any).last_name,
    },
    'command'
  );

  if (!res.ok) {
    await ctx.reply('❌ Failed to join the waitlist. Please try again later.');
    return;
  }

  if (res.already) {
    await ctx.reply('✅ You are already on the waitlist. We will keep you posted!');
  } else {
    await ctx.reply('🎉 You are on the waitlist! We will reach out when beta opens.');
  }
});

// Helpers: validators
function isValidEmail(email: string): boolean {
  // Simple RFC5322-ish sanity check
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function isValidSolanaAddress(addr: string): boolean {
  // Base58 without 0,O,I,l; typical length ~32-44
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr.trim());
}

// Email command
bot.command('email', async (ctx) => {
  const from = ctx.from;
  if (!from) return;

  const email = ctx.match?.trim();
  if (!email) {
    await ctx.reply('Usage: /email you@example.com');
    return;
  }
  if (!isValidEmail(email)) {
    await ctx.reply('That email does not look valid. Please try again.');
    return;
  }
  const joined = await isInWaitlist(from.id);
  if (!joined) {
    await ctx.reply('Please join the waitlist first with /waitlist.');
    return;
  }
  const ok = await setWaitlistEmail(from.id, email);
  if (!ok) {
    await ctx.reply('❌ Could not save your email. Try again later.');
    return;
  }
  await ctx.reply('✉️ Email saved. Thank you!');
});

// Wallet command (Solana)
bot.command('wallet', async (ctx) => {
  const from = ctx.from;
  if (!from) return;

  const wallet = ctx.match?.trim();
  if (!wallet) {
    await ctx.reply('Usage: /wallet <your_solana_address>');
    return;
  }
  if (!isValidSolanaAddress(wallet)) {
    await ctx.reply('That does not look like a valid Solana address.');
    return;
  }
  const joined = await isInWaitlist(from.id);
  if (!joined) {
    await ctx.reply('Please join the waitlist first with /waitlist.');
    return;
  }
  const ok = await setWaitlistWallet(from.id, wallet);
  if (!ok) {
    await ctx.reply('❌ Could not save your wallet. Try again later.');
    return;
  }
  await ctx.reply('💼 Wallet saved. Thanks!');
});

// Handle callback queries (inline keyboard buttons)
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  
  if (data === 'ping') {
    await ctx.answerCallbackQuery('Pong! 🏓');
    await ctx.reply('🏓 Pong! The bot is working perfectly!');
  } else if (data === 'add_email') {
    await ctx.answerCallbackQuery();
    await ctx.reply('Send your email with the command: /email you@example.com');
  } else if (data === 'add_wallet') {
    await ctx.answerCallbackQuery();
    await ctx.reply('Send your Solana wallet with: /wallet <address>');
  } else if (data === 'join_waitlist') {
    const from = ctx.from;
    if (!from) {
      await ctx.answerCallbackQuery('Could not read your user.');
      return;
    }
    const res = await joinWaitlist(
      {
        id: from.id,
        username: from.username,
        first_name: (from as any).first_name,
        last_name: (from as any).last_name,
      },
      'start_button'
    );
    if (!res.ok) {
      await ctx.answerCallbackQuery('Failed. Try again later.');
      await ctx.reply('❌ Failed to join the waitlist. Please try again later.');
      return;
    }
    if (res.already) {
      await ctx.answerCallbackQuery('Already joined ✅');
      await ctx.reply('✅ You are already on the waitlist. We will keep you posted!');
    } else {
      await ctx.answerCallbackQuery('Joined! 🎉');
      await ctx.reply('🎉 You are on the waitlist! We will reach out when beta opens.');
    }
  } else {
    await ctx.answerCallbackQuery('Unknown action');
  }
});

// Handle all text messages (fallback)
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text;
  
  // Skip if it's a command (already handled above)
  if (text.startsWith('/')) {
    return;
  }
  
  await ctx.reply(`You said: "${text}"`);
});

  // Error handling
  bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    
    const e = err.error;
    if (e instanceof GrammyError) {
      console.error('Error in request:', e.description);
    } else if (e instanceof HttpError) {
      console.error('Could not contact Telegram:', e);
    } else {
      console.error('Unknown error:', e);
    }
  });
}

// Export lazy bot getter
export const bot = getBot;
export default getBot;

// Helpers
function safeJson(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

function summarizeResult(res: unknown) {
  if (!res || typeof res !== 'object') return String(res);
  const obj = res as Record<string, unknown>;
  const keys = Object.keys(obj).slice(0, 10);
  const summary: Record<string, unknown> = {};
  for (const k of keys) summary[k] = obj[k];
  return { keys: Object.keys(obj).length, preview: summary };
}

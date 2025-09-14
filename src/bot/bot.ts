import { Bot, GrammyError, HttpError, InlineKeyboard } from 'grammy';
import { env } from '@/lib/env';
import { joinWaitlist, isInWaitlist, setWaitlistEmail, setWaitlistWallet } from '@/lib/waitlist';
import { createJob } from '@/lib/supabase';

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

// Simple in-memory flow state (best-effort; Stage 1)
type FlowState = 'awaiting_email' | 'awaiting_wallet' | 'awaiting_reels_url';
const waitlistFlow = new Map<number, FlowState>();

// Start command with inline keyboard
bot.command('start', async (ctx) => {
  const keyboard = new InlineKeyboard()
    .text('📝 Join waitlist', 'join_waitlist')
    .row()
    .text('✉️ Add email', 'add_email')
    .text('💼 Add wallet', 'add_wallet')
    .row()
    .text('🎬 Reels → Maps', 'reels_start')
    .row()
    .text('🏓 Ping me!', 'ping');

  await ctx.reply(
    `🤖 Crypto Wallet Follow Bot (Solana‑first)

✨ Follow any Solana wallet and receive instant, human‑readable trade & transfer summaries right in Telegram.

Be among the first to try it (free beta). Tap “📝 Join waitlist” below or send /waitlist.`,
    { reply_markup: keyboard }
  );
});

// Help command
bot.command('help', async (ctx) => {
  await ctx.reply(
    `📚 Available commands:

/start - Get started with the bot
/help - Show this help message
/waitlist - Join the free early-access waitlist (will ask for email & wallet)
/reels - Convert an Instagram Reel/Post URL into Google Maps places`
  );
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
  waitlistFlow.set(from.id, 'awaiting_email');
  const keyboard = new InlineKeyboard().text('Skip ✉️', 'skip_email');
  await ctx.reply(
    res.already
      ? 'You are on the waitlist. Please reply with your email (optional), or tap Skip.'
      : '🎉 You are on the waitlist! Please reply with your email (optional), or tap Skip.',
    { reply_markup: keyboard }
  );
});

// Reels command (entry to flow)
bot.command('reels', async (ctx) => {
  const from = ctx.from;
  if (!from) return;
  waitlistFlow.set(from.id, 'awaiting_reels_url');
  const keyboard = new InlineKeyboard().text('Cancel ❌', 'reels_cancel');
  await ctx.reply(
    'Send me an Instagram reel/post URL (e.g., https://www.instagram.com/reel/XXXX/).',
    { reply_markup: keyboard }
  );
});

// Helpers: URL validators
function extractInstaShortcode(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const m = u.pathname.match(/^\/(?:reel|p)\/([A-Za-z0-9_-]+)(?:\/|$)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

// Helpers: validators
function isValidEmail(email: string): boolean {
  // Simple RFC5322-ish sanity check
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function isValidSolanaAddress(addr: string): boolean {
  // Base58 without 0,O,I,l; typical length ~32-44
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr.trim());
}

// Handle callback queries (inline keyboard buttons)
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  
  if (data === 'ping') {
    await ctx.answerCallbackQuery('Pong! 🏓');
    await ctx.reply('🏓 Pong! The bot is working perfectly!');
  } else if (data === 'add_email') {
    await ctx.answerCallbackQuery();
    const from = ctx.from;
    if (!from) return;
    const joined = await isInWaitlist(from.id);
    if (!joined) {
      const res = await joinWaitlist(
        {
          id: from.id,
          username: from.username,
          first_name: (from as any).first_name,
          last_name: (from as any).last_name,
        },
        'start_add_email'
      );
      if (!res.ok) {
        await ctx.reply('❌ Failed to join the waitlist. Please try again later.');
        return;
      }
    }
    waitlistFlow.set(from!.id, 'awaiting_email');
    const keyboard = new InlineKeyboard().text('Skip ✉️', 'skip_email');
    await ctx.reply('Please reply with your email (optional), or tap Skip.', {
      reply_markup: keyboard,
    });
  } else if (data === 'add_wallet') {
    await ctx.answerCallbackQuery();
    const from = ctx.from;
    if (!from) return;
    const joined = await isInWaitlist(from.id);
    if (!joined) {
      const res = await joinWaitlist(
        {
          id: from.id,
          username: from.username,
          first_name: (from as any).first_name,
          last_name: (from as any).last_name,
        },
        'start_add_wallet'
      );
      if (!res.ok) {
        await ctx.reply('❌ Failed to join the waitlist. Please try again later.');
        return;
      }
    }
    waitlistFlow.set(from!.id, 'awaiting_wallet');
    const keyboard = new InlineKeyboard().text('Skip 💼', 'skip_wallet');
    await ctx.reply('Please reply with your Solana wallet (optional), or tap Skip.', {
      reply_markup: keyboard,
    });
  } else if (data === 'skip_email') {
    await ctx.answerCallbackQuery('Skipped email');
    const from = ctx.from;
    if (!from) return;
    waitlistFlow.set(from.id, 'awaiting_wallet');
    const keyboard = new InlineKeyboard().text('Skip 💼', 'skip_wallet');
    await ctx.reply('No worries. Now, reply with your Solana wallet (optional), or tap Skip.', {
      reply_markup: keyboard,
    });
  } else if (data === 'skip_wallet') {
    await ctx.answerCallbackQuery('All set!');
    const from = ctx.from;
    if (!from) return;
    waitlistFlow.delete(from.id);
    await ctx.reply('All set! Thanks for joining. We will be in touch.');
  } else if (data === 'reels_start') {
    await ctx.answerCallbackQuery();
    const from = ctx.from;
    if (!from) return;
    waitlistFlow.set(from.id, 'awaiting_reels_url');
    const keyboard = new InlineKeyboard().text('Cancel ❌', 'reels_cancel');
    await ctx.reply(
      'Send me an Instagram reel/post URL (e.g., https://www.instagram.com/reel/XXXX/).',
      { reply_markup: keyboard }
    );
  } else if (data === 'reels_cancel') {
    await ctx.answerCallbackQuery('Canceled');
    const from = ctx.from;
    if (!from) return;
    if (waitlistFlow.get(from.id) === 'awaiting_reels_url') {
      waitlistFlow.delete(from.id);
    }
    await ctx.reply('Canceled. You can restart anytime with /reels');
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
    await ctx.answerCallbackQuery(res.already ? 'Already joined ✅' : 'Joined! 🎉');
    waitlistFlow.set(from.id, 'awaiting_email');
    const keyboard = new InlineKeyboard().text('Skip ✉️', 'skip_email');
    await ctx.reply(
      res.already
        ? 'You are on the waitlist. Please reply with your email (optional), or tap Skip.'
        : '🎉 You are on the waitlist! Please reply with your email (optional), or tap Skip.',
      { reply_markup: keyboard }
    );
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
  const from = ctx.from;
  if (!from) return;

  const state = waitlistFlow.get(from.id);
  if (!state) {
    // No active flow; ignore or provide gentle hint
    return;
  }

  if (state === 'awaiting_email') {
    const email = text.trim();
    if (email.toLowerCase() === 'skip') {
      // simulate skip via text
      waitlistFlow.set(from.id, 'awaiting_wallet');
      const keyboard = new InlineKeyboard().text('Skip 💼', 'skip_wallet');
      await ctx.reply('No worries. Now, reply with your Solana wallet (optional), or tap Skip.', {
        reply_markup: keyboard,
      });
      return;
    }
    if (!isValidEmail(email)) {
      await ctx.reply('That email does not look valid. Please try again or type "skip".');
      return;
    }
    const joined = await isInWaitlist(from.id);
    if (!joined) await joinWaitlist({ id: from.id, username: from.username, first_name: (from as any).first_name, last_name: (from as any).last_name }, 'flow_email');
    const ok = await setWaitlistEmail(from.id, email);
    if (!ok) {
      await ctx.reply('❌ Could not save your email. Try again later or type "skip".');
      return;
    }
    waitlistFlow.set(from.id, 'awaiting_wallet');
    const keyboard = new InlineKeyboard().text('Skip 💼', 'skip_wallet');
    await ctx.reply('✉️ Email saved. Now, reply with your Solana wallet (optional), or tap Skip.', {
      reply_markup: keyboard,
    });
    return;
  }

  if (state === 'awaiting_wallet') {
    const wallet = text.trim();
    if (wallet.toLowerCase() === 'skip') {
      waitlistFlow.delete(from.id);
      await ctx.reply('All set! Thanks for joining. We will be in touch.');
      return;
    }
    if (!isValidSolanaAddress(wallet)) {
      await ctx.reply('That does not look like a valid Solana address. Please try again or type "skip".');
      return;
    }
    const joined = await isInWaitlist(from.id);
    if (!joined) await joinWaitlist({ id: from.id, username: from.username, first_name: (from as any).first_name, last_name: (from as any).last_name }, 'flow_wallet');
    const ok = await setWaitlistWallet(from.id, wallet);
    if (!ok) {
      await ctx.reply('❌ Could not save your wallet. Try again later or type "skip".');
      return;
    }
    waitlistFlow.delete(from.id);
    await ctx.reply('💼 Wallet saved. All set! Thanks for joining.');
    return;
  }

  if (state === 'awaiting_reels_url') {
    const url = text.trim();
    const sc = extractInstaShortcode(url);
    if (!sc) {
      await ctx.reply('Invalid Instagram URL. Please send a /reel or /p link, or tap Cancel.');
      return;
    }

    // Create background job
    const chatId = ctx.chat?.id;
    if (!chatId) {
      await ctx.reply('Could not read chat. Please try again.');
      return;
    }
    const job = await createJob('reels_scrape', Number(chatId), {
      url,
      shortcode: sc,
      from: {
        id: from.id,
        username: from.username,
        first_name: (from as any).first_name,
        last_name: (from as any).last_name,
      },
    });
    if (!job) {
      await ctx.reply('❌ Failed to enqueue your request. Please try again later.');
      return;
    }
    waitlistFlow.delete(from.id);
    await ctx.reply(
      `🎬 Got it! Processing your reel (${sc}). I’ll send the results here when ready.`
    );
    return;
  }
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

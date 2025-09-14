import { Bot, GrammyError, HttpError, InlineKeyboard } from 'grammy';
import { env } from '@/lib/env';

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

// No conversational flow currently; placeholder only

// Start command with inline keyboard
bot.command('start', async (ctx) => {
  const keyboard = new InlineKeyboard()
    .text('🎬 Reels → Maps', 'reels_start')
    .row()
    .text('🏓 Ping me!', 'ping');

  await ctx.reply(
    `🗺️ OmniMap Agent

Extract places from content and turn them into useful map links.

Reels → Maps is under construction — tap to see status.`,
    { reply_markup: keyboard }
  );
});

// Help command
bot.command('help', async (ctx) => {
  await ctx.reply(
    `📚 Available commands:

/start - Get started with the bot
/help - Show this help message`
  );
});

// No /reels command while feature is WIP

// Handle callback queries (inline keyboard buttons)
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  
  if (data === 'ping') {
    await ctx.answerCallbackQuery('Pong! 🏓');
    await ctx.reply('🏓 Pong! The bot is working perfectly!');
  } else if (data === 'reels_start') {
    await ctx.answerCallbackQuery('WIP');
    await ctx.reply('🎬 Reels → Maps is a work in progress. I will update this soon!');
  } else {
    await ctx.answerCallbackQuery('Unknown action');
  }
});

// No text handlers currently

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

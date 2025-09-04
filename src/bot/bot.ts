import { Bot, GrammyError, HttpError, InlineKeyboard } from 'grammy';
import { env } from '@/lib/env';
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

// Start command with inline keyboard
bot.command('start', async (ctx) => {
  const keyboard = new InlineKeyboard().text('🏓 Ping me!', 'ping');
  
  await ctx.reply(
    `🤖 Hello! I'm your Telegram bot built with Next.js, grammY, and Supabase!

🚀 I'm running on Vercel and ready to help you.

Use /help to see available commands.`,
    { reply_markup: keyboard }
  );
});

// Help command
bot.command('help', async (ctx) => {
  await ctx.reply(
    `📚 Available commands:

/start - Get started with the bot
/help - Show this help message
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

// Handle callback queries (inline keyboard buttons)
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  
  if (data === 'ping') {
    await ctx.answerCallbackQuery('Pong! 🏓');
    await ctx.reply('🏓 Pong! The bot is working perfectly!');
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

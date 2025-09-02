# 🤖 Telegram Bot Vercel

A production-ready Telegram bot built with **Next.js 14**, **grammY**, and **Supabase**, designed to run seamlessly on **Vercel** with webhook support and optional background worker processing.

## ✨ Features

- 🚀 **Vercel-ready**: Deploys as serverless functions with webhook support
- 🔄 **Dual mode**: Local polling for development, webhooks for production
- 🗄️ **Supabase integration**: Persistent storage and background job processing
- 🏗️ **TypeScript**: Fully typed with strict mode enabled
- 🔒 **Secure**: Webhook secret validation and environment variable validation
- 🎯 **Modern stack**: Next.js 14 App Router, grammY, Zod validation

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd telegram-bot-vercel

# Install dependencies
pnpm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env.local

# Edit your environment variables
nano .env.local
```

Required environment variables:
- `BOT_TOKEN`: Get from [@BotFather](https://t.me/BotFather)
- `WEBHOOK_SECRET`: Generate a long random string
- `PUBLIC_URL`: Your deployed Vercel URL (only needed for webhooks)
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anon key
- `SUPABASE_SERVICE_ROLE`: Your Supabase service role key (optional, for admin operations)

### 3. Supabase Database Setup

Create the following tables in your Supabase database:

#### Users Table (Optional)
```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Jobs Table (Required for background worker)
```sql
CREATE TABLE jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  chat_id BIGINT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  result JSONB,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient job polling
CREATE INDEX idx_jobs_status_created ON jobs (status, created_at);
```

### 4. Development Modes

#### Local Polling Mode (Recommended for development)
```bash
# Start the bot in polling mode
pnpm bot:dev
```

#### Local Webhook Mode (Advanced)
```bash
# Terminal 1: Start Next.js dev server
pnpm dev

# Terminal 2: Expose localhost with ngrok
npx ngrok http 3000

# Terminal 3: Set webhook with ngrok URL
PUBLIC_URL=https://your-ngrok-url.ngrok.io pnpm bot:set-webhook
```

### 5. Production Deployment

#### Deploy to Vercel
```bash
# Deploy to Vercel
vercel --prod

# Set environment variables in Vercel dashboard
# Then register webhook
pnpm bot:set-webhook
```

### 6. Background Worker (Optional)

For processing background jobs:

```bash
# Start the worker locally
pnpm worker:dev
```

In production, you can run the worker as a separate service or scheduled function.

## 🏗️ Project Structure

```
src/
├── app/api/tg/route.ts      # Webhook endpoint for Vercel
├── bot/bot.ts               # grammY bot instance and handlers
├── lib/
│   ├── env.ts              # Environment validation with Zod
│   └── supabase.ts         # Supabase client setup
├── worker/index.ts         # Background job processor
└── dev.ts                  # Local polling mode script
scripts/
└── setWebhook.ts           # Webhook registration utility
```

## 🤖 Bot Commands

- `/start` - Welcome message with interactive button
- `/help` - List available commands
- `/echo <text>` - Echo your message back
- `/job <message>` - Create a background job (demo)

## 🔧 Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start Next.js development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm bot:dev` | Start bot in polling mode (development) |
| `pnpm bot:set-webhook` | Register webhook with Telegram |
| `pnpm worker:dev` | Start background worker |

## 🔐 Security Notes

- ✅ Webhook endpoints validate secret tokens
- ✅ Environment variables are validated with Zod
- ✅ Never commit `.env*` files to version control
- ⚠️ Keep webhook handlers fast (< 1 second response time)
- ⚠️ Use background jobs for heavy processing

## 🏃‍♂️ Development Workflow

### Local Development
1. Use `pnpm bot:dev` for quick testing with polling
2. Bot responds immediately without webhook setup
3. Perfect for testing commands and logic

### Testing Webhooks Locally
1. Run `pnpm dev` to start Next.js
2. Use ngrok or similar to expose localhost
3. Set `PUBLIC_URL` and run `pnpm bot:set-webhook`
4. Test webhook flow locally

### Production Deployment
1. Deploy to Vercel with environment variables
2. Run `pnpm bot:set-webhook` with production URL
3. Bot receives updates via webhooks
4. Scale background worker as needed

## 🔧 Customization

### Adding New Commands
Edit `src/bot/bot.ts` and add new command handlers:

```typescript
bot.command('newcommand', async (ctx) => {
  await ctx.reply('New command response!');
});
```

### Adding Background Jobs
1. Add processor to `src/worker/index.ts`
2. Create jobs using `createJob()` from Supabase lib
3. Worker automatically processes queued jobs

### Database Extensions
Extend the Supabase schema as needed for your use case.

## 🐛 Troubleshooting

### Bot not responding
- Check `BOT_TOKEN` is correct
- Verify network connectivity
- Check Telegram API status

### Webhook issues
- Ensure `WEBHOOK_SECRET` matches
- Verify `PUBLIC_URL` is accessible
- Check Vercel function logs

### Database errors
- Verify Supabase credentials
- Check table permissions
- Ensure tables exist

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

Built with ❤️ using Next.js, grammY, and Supabase
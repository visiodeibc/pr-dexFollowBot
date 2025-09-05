# 🤖 Crypto Wallet Follow Bot

A production-ready Telegram bot built with **Next.js 14**, **grammY**, and **Supabase**, designed to run seamlessly on **Vercel** with webhook support and optional background worker processing.

This project is evolving into a crypto wallet follow bot. Initial scope focuses on Solana. Users will be able to follow wallets and receive summarized transaction updates in Telegram. We’re rolling out in stages to validate demand and iterate quickly.

## ✨ Features

- 🚀 **Vercel-ready**: Deploys as serverless functions with webhook support
- 🔄 **Dual mode**: Local polling for development, webhooks for production
- 🗄️ **Supabase integration**: Persistent storage and background job processing
- 🏗️ **TypeScript**: Fully typed with strict mode enabled
- 🔒 **Secure**: Webhook secret validation and environment variable validation
- 🎯 **Modern stack**: Next.js 14 App Router, grammY, Zod validation
- 📝 **Waitlist capture (Stage 1)**: Users can join a free early-access waitlist via `/waitlist` or the Start button

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

### 3. Database Setup (Prisma)

This project uses Prisma to manage the Supabase (Postgres) schema. No manual SQL is required.

1) Add database env vars to `.env.local` (see `prisma/.env.example` for reference):

```env
DATABASE_URL="postgresql://..."   # Supabase Pooler URL (pgBouncer)
DIRECT_URL="postgresql://..."     # Supabase Direct URL (5432)
```

2) Generate the Prisma client and apply migrations:

```bash
pnpm prisma:generate
pnpm prisma:deploy   # applies the checked-in migrations
```

That’s it. The checked-in Prisma schema defines the `waitlist` and `jobs` tables used by the bot and worker.

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

### 7. Prisma (Schema Management)

We use Prisma to manage the Postgres (Supabase) schema. Set `DATABASE_URL` in `.env.local` to your Supabase connection string.

Commands:

```bash
# Generate client
pnpm prisma:generate

# Create and apply a migration based on prisma/schema.prisma
pnpm prisma:migrate --name init

# Deploy pending migrations (CI/production)
pnpm prisma:deploy
```

Notes:
- The Prisma schema defines `waitlist` and `jobs` to match this project.
- This repo includes an initial migration; use `pnpm prisma:deploy` to apply it in CI/prod.
- Ensure `DATABASE_URL` uses the pooled (non-readonly) connection string and set `DIRECT_URL` for migrations.

#### Prisma datasource configuration

The schema is configured to use a pooled URL for runtime and a direct URL for migrations:

- `DATABASE_URL`: Supabase Pooler (pgBouncer) URL, e.g. `...@<POOLER_HOST>:6543/postgres?pgbouncer=true&sslmode=require`
- `DIRECT_URL`: Supabase Direct URL, e.g. `...@db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require`

`prisma migrate deploy` uses `DIRECT_URL` under the hood. Ensure outbound access to port 5432 is allowed on your network.

#### Troubleshooting P1001 (can’t reach database server)

- Verify `DIRECT_URL` is correct and includes `sslmode=require`.
- Check your network/VPN/firewall allows outbound `5432` to `db.<PROJECT_REF>.supabase.co`.
- Test connectivity: `nc -vz db.<PROJECT_REF>.supabase.co 5432` (or `openssl s_client -connect db.<PROJECT_REF>.supabase.co:5432`)
- If 5432 is blocked, you can temporarily run migrations through the Pooler:
  - Set `DATABASE_URL` to your Pooler URL in `prisma/.env`.
  - Run: `pnpm prisma:deploy:pooler` (this overrides `DIRECT_URL` with the Pooler for the deploy run).
  - After success, revert to the direct URL for future migrations.


## 🏗️ Project Structure

```
src/
├── app/api/tg/route.ts      # Webhook endpoint for Vercel
├── bot/bot.ts               # grammY bot instance and handlers
├── lib/
│   ├── env.ts              # Environment validation with Zod
│   └── supabase.ts         # Supabase client setup
│   └── waitlist.ts         # Waitlist helpers (Stage 1)
├── worker/index.ts         # Background job processor
└── dev.ts                  # Local polling mode script
scripts/
└── setWebhook.ts           # Webhook registration utility
prisma/
└── schema.prisma           # Prisma schema for Postgres (Supabase)
```

## 🤖 Bot Commands

- `/start` - Welcome message with interactive buttons
- `/help` - List available commands
- `/waitlist` - Join the free early-access waitlist (asks for email and wallet inline)

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

## 🗺️ Rollout Stages

Stage 1 — Gathering Users (now)
- Add waitlist command and inline button to collect interest
- Store Telegram user metadata into `waitlist`
- Keep messaging clear about Solana-only initial support

Stage 2 — Beta (usage tracking)
- Let users add Solana wallet addresses to follow
- Track usage events to tune UX and infra
- Summarize wallet transactions and post to Telegram (webhooks preferred; fallback to cron)

Stage 3 — Paywall
- Decide pricing based on Stage 2 data
- Add in-bot paywall and quotas
- Monetize while maintaining free tier for light usage

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

## 🧪 Stage 1 Validation Tips
- Share the bot in relevant channels and communities
- Use `/waitlist` and the Start button to collect interest quickly
- After joining, the bot will ask for email and wallet inline (optional)
- Review `waitlist` table to gauge demand and note feedback

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

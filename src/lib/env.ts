import { z } from 'zod';

const envSchema = z.object({
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN is required'),
  WEBHOOK_SECRET: z.string().min(1, 'WEBHOOK_SECRET is required'),
  PUBLIC_URL: z.string().url().optional(),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE: z.string().optional(),
});

let _env: z.infer<typeof envSchema> | null = null;

function getEnv() {
  if (_env) return _env;

  const rawEnv = {
    BOT_TOKEN: process.env.BOT_TOKEN,
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
    PUBLIC_URL: process.env.PUBLIC_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE,
  };

  const result = envSchema.safeParse(rawEnv);
  
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    result.error.issues.forEach((issue) => {
      console.error(`  ${issue.path}: ${issue.message}`);
    });
    throw new Error('Invalid environment variables');
  }

  _env = result.data;
  return _env;
}

// Use getter to defer validation to runtime
export const env = new Proxy({} as z.infer<typeof envSchema>, {
  get(target, prop) {
    const envData = getEnv();
    return envData[prop as keyof typeof envData];
  }
});
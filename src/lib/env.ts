import { z } from 'zod';

// Per-key validators; validate only when accessed
const validators = {
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN is required'),
  WEBHOOK_SECRET: z.string().min(1, 'WEBHOOK_SECRET is required'),
  PUBLIC_URL: z.string().url().optional(),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE: z.string().optional(),
} as const;

type Env = {
  BOT_TOKEN: string;
  WEBHOOK_SECRET: string;
  PUBLIC_URL?: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE?: string;
};

const cache = new Map<keyof Env, string | undefined>();

function readAndValidate<K extends keyof Env>(key: K): Env[K] {
  if (cache.has(key)) return cache.get(key) as Env[K];

  // Pull raw value from process.env
  const raw = process.env[key as string];
  const schema = validators[key];

  const result = schema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    const message = issue?.message || `Invalid value for ${String(key)}`;
    throw new Error(`Invalid environment variable ${String(key)}: ${message}`);
  }

  cache.set(key, result.data as Env[K]);
  return result.data as Env[K];
}

export const env: Env = new Proxy({} as Env, {
  get(_target, prop) {
    if (typeof prop !== 'string') return undefined as any;
    if (!(prop in validators)) return undefined as any;
    return readAndValidate(prop as keyof Env);
  },
});

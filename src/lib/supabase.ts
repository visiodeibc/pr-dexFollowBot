import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

// Lazy client initialization
let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

// Client for general use (uses anon key)
export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;
  _supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  return _supabase;
}

// Admin client for service operations (uses service role key if available)
export function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdmin) return _supabaseAdmin;
  
  const hasServiceRole = Boolean(env.SUPABASE_SERVICE_ROLE && env.SUPABASE_SERVICE_ROLE.length > 0);
  if (!hasServiceRole) {
    // In production, never fall back to anon for admin operations
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SUPABASE_SERVICE_ROLE is not set in production environment');
    }
    // In development, fall back but warn loudly
    console.warn('[supabaseAdmin] SUPABASE_SERVICE_ROLE not set; falling back to anon key (dev only)');
    _supabaseAdmin = getSupabase();
    return _supabaseAdmin;
  }

  _supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
    
  return _supabaseAdmin;
}

// Export getter functions as default exports
export const supabase = getSupabase;
export const supabaseAdmin = getSupabaseAdmin;

// Database types for jobs table
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type Platform = 'telegram' | 'instagram' | 'whatsapp' | 'tiktok' | 'web';

export interface JobRecord {
  id: string;
  type: string;
  chat_id: number;
  payload: Record<string, any>;
  status: JobStatus;
  result?: Record<string, any>;
  error?: string;
  session_id?: string | null;
  parent_job_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionRecord {
  id: string;
  platform: Platform;
  platform_user_id: string;
  platform_chat_id?: number | null;
  metadata?: Record<string, any> | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface SessionMemoryRecord {
  id: string;
  session_id: string;
  role: string;
  kind: string;
  content?: Record<string, any> | null;
  created_at: string;
}

export interface EnsureSessionParams {
  platform: Platform;
  platformUserId: string;
  platformChatId?: number;
  metadata?: Record<string, any> | null;
}

export async function ensureSession({
  platform,
  platformUserId,
  platformChatId,
  metadata,
}: EnsureSessionParams): Promise<SessionRecord | null> {
  const now = new Date().toISOString();
  const payload: Record<string, any> = {
    platform,
    platform_user_id: platformUserId,
    platform_chat_id: platformChatId ?? null,
    last_message_at: now,
    updated_at: now,
  };

  if (metadata && Object.keys(metadata).length > 0) {
    payload.metadata = metadata;
  }

  const { data, error } = await getSupabaseAdmin()
    .from('sessions')
    .upsert(payload, {
      onConflict: 'platform,platform_user_id',
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to ensure session:', error);
    return null;
  }

  return data as SessionRecord;
}

export interface AppendMemoryParams {
  sessionId: string;
  role: string;
  kind: string;
  content?: Record<string, any> | null;
}

export async function appendSessionMemory({
  sessionId,
  role,
  kind,
  content,
}: AppendMemoryParams): Promise<SessionMemoryRecord | null> {
  const insertPayload: Record<string, any> = {
    session_id: sessionId,
    role,
    kind,
    content: content ?? null,
  };

  const { data, error } = await getSupabaseAdmin()
    .from('session_memories')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error('Failed to append session memory:', error);
    return null;
  }

  return data as SessionMemoryRecord;
}

export interface CreateJobParams {
  type: string;
  chatId: number;
  payload: Record<string, any>;
  sessionId?: string;
  parentJobId?: string;
}

// Helper function to create a new job
export async function createJob({
  type,
  chatId,
  payload,
  sessionId,
  parentJobId,
}: CreateJobParams): Promise<JobRecord | null> {
  const insertPayload: Record<string, any> = {
    type,
    chat_id: chatId,
    payload,
    status: 'queued',
    session_id: sessionId ?? null,
    parent_job_id: parentJobId ?? null,
  };

  const { data, error } = await getSupabaseAdmin()
    .from('jobs')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error('Failed to create job:', error);
    return null;
  }

  return data as JobRecord;
}

// Helper function to update job status
export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  result?: Record<string, any>,
  error?: string
): Promise<boolean> {
  const updatePayload: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (result !== undefined) updatePayload.result = result;
  if (error !== undefined) updatePayload.error = error;

  const { error: updateError } = await getSupabaseAdmin()
    .from('jobs')
    .update(updatePayload)
    .eq('id', jobId);

  if (updateError) {
    console.error('Failed to update job status:', updateError);
    return false;
  }

  return true;
}

export interface NotifyUserPayload {
  message: string;
  parse_mode?: 'Markdown' | 'HTML' | 'MarkdownV2';
}

export async function enqueueNotifyJob(
  chatId: number,
  payload: NotifyUserPayload,
  sessionId?: string,
  parentJobId?: string
): Promise<JobRecord | null> {
  return createJob({
    type: 'notify_user',
    chatId,
    payload,
    sessionId,
    parentJobId,
  });
}

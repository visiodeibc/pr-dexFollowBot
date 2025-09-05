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
export interface JobRecord {
  id: string;
  type: string;
  chat_id: number;
  payload: Record<string, any>;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  result?: Record<string, any>;
  error?: string;
  created_at: string;
  updated_at: string;
}

// Helper function to create a new job
export async function createJob(
  type: string,
  chatId: number,
  payload: Record<string, any>
): Promise<JobRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('jobs')
    .insert({
      type,
      chat_id: chatId,
      payload,
      status: 'queued',
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create job:', error);
    return null;
  }

  return data;
}

// Helper function to update job status
export async function updateJobStatus(
  jobId: string,
  status: JobRecord['status'],
  result?: Record<string, any>,
  error?: string
): Promise<boolean> {
  const { error: updateError } = await getSupabaseAdmin()
    .from('jobs')
    .update({
      status,
      result,
      error,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (updateError) {
    console.error('Failed to update job status:', updateError);
    return false;
  }

  return true;
}

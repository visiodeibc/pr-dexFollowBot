import { supabaseAdmin } from './supabase';

export interface TelegramUserLike {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export async function isInWaitlist(userId: number): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from('waitlist')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('waitlist:isInWaitlist error', error);
    return false;
  }
  return !!data;
}

export async function joinWaitlist(
  user: TelegramUserLike,
  source?: string
): Promise<{ ok: boolean; already: boolean }> {
  try {
    const exists = await isInWaitlist(user.id);
    if (exists) return { ok: true, already: true };

    const { error } = await supabaseAdmin()
      .from('waitlist')
      .insert({
        user_id: user.id,
        username: user.username ?? null,
        first_name: user.first_name ?? null,
        last_name: user.last_name ?? null,
        source: source ?? null,
      });

    if (error) {
      console.error('waitlist:join error', error);
      return { ok: false, already: false };
    }
    return { ok: true, already: false };
  } catch (err) {
    console.error('waitlist:join exception', err);
    return { ok: false, already: false };
  }
}

export async function waitlistCount(): Promise<number> {
  const { count, error } = await supabaseAdmin()
    .from('waitlist')
    .select('*', { count: 'exact', head: true });
  if (error) {
    console.error('waitlist:count error', error);
    return 0;
  }
  return count ?? 0;
}

export async function setWaitlistEmail(
  userId: number,
  email: string
): Promise<boolean> {
  const { error } = await supabaseAdmin()
    .from('waitlist')
    .update({ email })
    .eq('user_id', userId);
  if (error) {
    console.error('waitlist:setEmail error', error);
    return false;
  }
  return true;
}

export async function setWaitlistWallet(
  userId: number,
  pref_solana_wallet: string
): Promise<boolean> {
  const { error } = await supabaseAdmin()
    .from('waitlist')
    .update({ pref_solana_wallet })
    .eq('user_id', userId);
  if (error) {
    console.error('waitlist:setWallet error', error);
    return false;
  }
  return true;
}

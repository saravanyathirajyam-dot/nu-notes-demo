import { jsonResponse, supabaseReady } from '../_shared.js';

export async function onRequestGet({ env }) {
  return jsonResponse({
    aiReady: Boolean(env.AI && supabaseReady(env)),
    aiProvider: 'Cloudflare Workers AI',
    checkinsReady: supabaseReady(env),
  });
}

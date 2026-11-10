import { jsonResponse, supabaseReady } from '../_shared.js';

export async function onRequestGet({ env }) {
  const ready = Boolean(env.AI && supabaseReady(env));
  return jsonResponse({
    aiReady: ready,
    imageReady: ready,
    aiProvider: 'Cloudflare Workers AI',
  });
}

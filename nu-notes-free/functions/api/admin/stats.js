import { isStaffRequest, jsonResponse, supabaseReady, supabaseRpc } from '../../_shared.js';

export async function onRequestGet({ request, env }) {
  if (!env.ADMIN_TOKEN) return jsonResponse({ error: 'Staff access is not configured.' }, 503);
  if (!isStaffRequest(request, env)) return jsonResponse({ error: 'The staff access code is incorrect.' }, 401);
  if (!supabaseReady(env)) return jsonResponse({ error: 'Check-in storage is not connected yet.' }, 503);

  try {
    const stats = await supabaseRpc(env, 'admin_checkin_stats', {});
    return jsonResponse(stats);
  } catch {
    return jsonResponse({ error: 'Saved check-in counts could not be loaded.' }, 503);
  }
}

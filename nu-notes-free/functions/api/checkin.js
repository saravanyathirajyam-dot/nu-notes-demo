import { jsonResponse, readJson, supabaseReady, supabaseRpc } from '../_shared.js';

export async function onRequestPost({ request, env }) {
  if (!supabaseReady(env)) return jsonResponse({ error: 'Check-ins are not connected yet.' }, 503);
  const body = await readJson(request);
  const name = typeof body?.name === 'string'
    ? body.name.replace(/[\u0000-\u001f\u007f]/g, '').trim().replace(/\s+/g, ' ')
    : '';
  const usn = typeof body?.usn === 'string'
    ? body.usn.toUpperCase().replace(/\s+/g, '')
    : '';

  if (name.length < 2 || name.length > 80) {
    return jsonResponse({ error: 'Enter a name between 2 and 80 characters.' }, 400);
  }
  if (!/^[A-Z0-9-]{3,24}$/.test(usn)) {
    return jsonResponse({ error: 'Enter a valid USN using letters and numbers.' }, 400);
  }

  try {
    await supabaseRpc(env, 'record_checkin', { p_usn: usn, p_name: name });
    return jsonResponse({ ok: true });
  } catch {
    return jsonResponse({ error: 'We could not save this check-in. Please try again.' }, 503);
  }
}

export const jsonResponse = (payload, status = 200, headers = {}) => new Response(JSON.stringify(payload), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  },
});

export function supabaseReady(env) {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SECRET_KEY);
}

export async function supabaseRpc(env, functionName, payload) {
  if (!supabaseReady(env)) throw new Error('Supabase is not configured.');
  const baseUrl = env.SUPABASE_URL.replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SECRET_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}).`);
  return response.json();
}

export async function readJson(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) return null;
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 30000) return null;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 30000) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isStaffRequest(request, env) {
  const expected = env.ADMIN_TOKEN || '';
  const received = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!expected || !received) return false;
  const left = new TextEncoder().encode(expected);
  const right = new TextEncoder().encode(received);
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i += 1) difference |= left[i] ^ right[i];
  return difference === 0;
}

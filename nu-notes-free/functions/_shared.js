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

export async function readJson(request, maxBytes = 9_000_000) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) return null;
  const length = Number(request.headers.get('content-length') || 0);
  if (length > maxBytes) return null;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > maxBytes) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

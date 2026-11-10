import { jsonResponse, readJson, supabaseReady, supabaseRpc } from '../_shared.js';

const MODEL = '@cf/black-forest-labs/flux-1-schnell';
const DAILY_LIMIT = 40;

export async function onRequestPost({ request, env }) {
  if (!env.AI) return jsonResponse({ error: 'Image creation is not connected right now.' }, 503);
  if (!supabaseReady(env)) return jsonResponse({ error: 'Image creation is not ready right now.' }, 503);
  const body = await readJson(request, 16000);
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt || prompt.length > 1400) return jsonResponse({ error: 'Describe an image in 1,400 characters or less.' }, 400);

  try {
    const allowed = await supabaseRpc(env, 'claim_ai_request', { p_daily_limit: DAILY_LIMIT });
    if (allowed !== true) return jsonResponse({ error: 'Today’s shared free AI allowance has been used. It resets tomorrow.' }, 429);
  } catch {
    return jsonResponse({ error: 'Image creation is temporarily unavailable. Please try again shortly.' }, 503);
  }

  try {
    const result = await env.AI.run(env.WORKERS_AI_IMAGE_MODEL || MODEL, {
      prompt: `Create a clear, school-appropriate illustration based on this description: ${prompt}`,
      steps: 4,
      seed: Math.floor(Math.random() * 2_000_000_000) + 1,
    });
    if (typeof result?.image !== 'string' || !result.image) return jsonResponse({ error: 'The picture did not finish generating. Please try again.' }, 503);
    return jsonResponse({ dataUrl: `data:image/jpeg;base64,${result.image}` });
  } catch (error) {
    const details = `${error?.message || ''} ${error?.code || ''} ${String(error)}`;
    if (/3036|neuron|daily.{0,20}allocation|free.{0,20}limit/i.test(details)) return jsonResponse({ error: 'Today’s shared free AI allowance has been used. It resets tomorrow.' }, 429);
    return jsonResponse({ error: 'The free image service is busy right now. Please try again in a little while.' }, 503);
  }
}

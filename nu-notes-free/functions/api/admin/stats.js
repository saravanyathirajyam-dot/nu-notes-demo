import { jsonResponse } from '../../_shared.js';

export async function onRequest() {
  return jsonResponse({ error: 'Student check-in reporting is no longer available.' }, 410);
}

import { jsonResponse } from '../_shared.js';

export async function onRequest() {
  return jsonResponse({ error: 'Student check-ins have been removed from NU Notes.' }, 410);
}

# NU AI deployment notes

## Cloudflare Pages

Connect the repository to the existing Pages project. Set its root/build output directory to `nu-notes-free`, leaving the build command empty for this static HTML site. The `functions` directory is inside that Pages root.

Add the Workers AI binding named `AI`. Store `SUPABASE_URL` and the Supabase service-role key under the secret name `SUPABASE_SECRET_KEY`. Keep both secret values in the Cloudflare dashboard only.

Optional model variables are `WORKERS_AI_MODEL`, `WORKERS_AI_VISION_MODEL`, and `WORKERS_AI_IMAGE_MODEL`. Defaults are GLM-4.7-Flash, Moondream 3.1, and FLUX.1 Schnell. The app allows at most 40 combined AI calls per UTC day through the existing `claim_ai_request` Supabase RPC.

## Supabase

This version uses the existing `ai_daily_usage` table and `claim_ai_request(integer)` RPC from `supabase/schema.sql`. No new table or migration is required. The function is called by the text, image-understanding, and image-creation endpoints through the same shared counter.

## Capabilities and boundaries

- `/api/status` reports whether Workers AI and Supabase are configured.
- `/api/ask` accepts up to three compressed images and extracted text from up to four attachments.
- `/api/image` creates a single illustration from a text prompt.
- PDF text is extracted in the browser. When a PDF has no selectable text, the first two pages are rendered in the browser and sent as images.
- Chat transcripts remain in the user's browser storage; uploads and generated images are not archived by the app.
- The daily AI allowance is shared. When exhausted, the app gives a gentle reset message and does not request paid usage intentionally.

Keep the account on Cloudflare Workers Free if the site must not incur AI usage charges. The free inference pool is account-wide and can be used by other Workers AI projects too.

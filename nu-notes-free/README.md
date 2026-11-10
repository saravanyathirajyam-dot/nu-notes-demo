# NU AI

NU AI is a chat-first study companion for Nrupathunga University students. It uses the warm campus palette and keeps the interface focused on one task: asking a question and getting a clear explanation.

## What it does

- Answers general questions across life sciences, microbiology, chemistry, physics, mathematics, coding, BCA, and other academic subjects.
- Keeps recent chats in the current browser on the current device. Chat text is not synced between devices.
- Accepts JPG, PNG, and WebP photos, selectable-text or scanned PDFs, TXT, Markdown, and CSV study documents.
- Creates a study illustration from a text description and offers a download.
- Shows molecular structures as diagrams when the AI returns the supported `molecule` JSON format.
- Uses no student login, name, USN, or check-in endpoint. The backend enforces a shared maximum of 40 AI actions a day across chat and image creation.

## Honest limits

NU AI uses a general hosted model; it does not contain every department's course notes or an official Nrupathunga syllabus. It can make mistakes. Verify important coursework with class materials. Free use is shared and capped; if the account's daily free AI allowance runs out, replies pause until it resets. Keep the Cloudflare account on its free plan if the goal is to avoid charges.

Past chats are stored in browser storage only. Uploaded images and document text are sent with the current request to Cloudflare Workers AI; the application does not save uploaded files on its server. Photo previews and generated pictures are temporary and should be downloaded if the student wants to keep them. Do not upload personal identity, health, or other private information.

## Stack

- Static chat interface: HTML, CSS, browser JavaScript.
- AI API: Cloudflare Pages Functions and Workers AI.
- Text model: `@cf/zai-org/glm-4.7-flash`.
- Image understanding: `@cf/moondream/moondream3.1-9B-A2B`.
- Image creation: `@cf/black-forest-labs/flux-1-schnell` at four steps.
- Shared daily usage gate: existing Supabase `claim_ai_request` RPC.
- PDF text extraction: PDF.js loaded from cdnjs when a PDF is selected; scanned PDFs send up to the first two pages as images.

## Required Pages settings

- Build output directory: `nu-notes-free`.
- Functions directory: `nu-notes-free/functions` (Pages discovers this when the folder is the project root).
- Workers AI binding named `AI`.
- Environment secrets `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.
- Optional text model setting `WORKERS_AI_MODEL`; optional vision model setting `WORKERS_AI_VISION_MODEL`; optional image model setting `WORKERS_AI_IMAGE_MODEL`.
- Optional `AI_DAILY_LIMIT` is clamped to at most 40 by the application.

No model API key is placed in browser code. Never commit service-role keys or API tokens.

## Local preview

Opening `index.html` as a `file://` URL shows the interface but cannot run the Pages Functions. Run the project through Cloudflare Pages local development or use the hosted site to use AI.

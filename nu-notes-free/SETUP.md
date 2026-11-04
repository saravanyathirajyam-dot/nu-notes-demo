# Free NU Notes setup

This build uses Cloudflare Pages and Workers AI on their free plan, plus the Supabase Free plan for check-in records. It does not use the OpenAI API and needs no paid AI key. Keep the Cloudflare account on Workers Free; do not upgrade it if you want to keep the site at ₹0.

## 1. Set up the database

1. Create a Supabase Free project.
2. In its SQL Editor, run the full `supabase/schema.sql` script once.
3. In the project API settings, copy the project URL and create/copy a secret API key (`sb_secret_...`). Keep that key private; add it to Cloudflare only as an encrypted secret.

The Free plan currently includes up to 500 MB of database storage per project and 50,000 monthly active users. Free projects with very little database activity can pause after a week; Supabase emails the owner and the project can be resumed from its dashboard. Recheck the provider's current limits before relying on them for exam week.

## 2. Create the free hosted site

1. Keep the Cloudflare account on the **Workers Free** plan.
2. Create a Cloudflare Pages project from the GitHub repository containing this folder. Set the project root directory to `outputs/nu-notes-free`, or put the contents of this folder at the repository root.
3. Choose no framework/build command and use `.` as the output directory.
4. Cloudflare will publish the static site at a free `pages.dev` address. The existing GitHub Pages demo can remain as a separate preview.

## 3. Add the Workers AI binding

In the Pages project, open **Settings → Bindings → Add → Workers AI**. Set the variable name to `AI`, choose the Production environment, save, and redeploy. The code uses the free-available model `@cf/zai-org/glm-4.7-flash`; no AI API key is needed.

The AI allowance is 10,000 Neurons per day on Workers Free, and Cloudflare stops further AI calls after that allowance is exhausted. NU Notes also sets a shared cap of 100 AI questions per UTC day. The Worker Free plan currently has a separate 100,000-request daily limit. These limits can change, and free quotas do not guarantee capacity or uptime.

## 4. Add the remaining settings

In **Settings → Variables and Secrets**, add these for Production. Mark secrets as encrypted. Never put them in the website source, GitHub, or this chat.

| Name | Type | Value |
|---|---|---|
| `SUPABASE_URL` | Variable | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Secret | Supabase `sb_secret_...` key |
| `ADMIN_TOKEN` | Secret | A long, random staff-only access code |
| `AI_DAILY_LIMIT` | Variable | `100` |
| `WORKERS_AI_MODEL` | Variable | `@cf/zai-org/glm-4.7-flash` |

Redeploy after adding variables or bindings.

## 5. Check that it is connected

- Visit `/api/status` on the new site. It should report `aiReady: true` and `checkinsReady: true` after configuration.
- During setup, use invented names and USNs. Submit a check-in and check the Admin preview with the staff code.
- Ask a general question. For course-specific explanations, paste a short passage into the optional course-material box.

## What students' data does

- Supabase stores the name, USN, check-in count, and first/last check-in times. It is a counter, not identity verification; a visitor can enter another student's USN or check in repeatedly.
- Cloudflare Workers AI receives the question, recent chat turns from that browser tab, and any course text pasted for that question. The app does not send student names or USNs to the AI route. Do not paste private or sensitive information.
- Study dates, saved topics, progress, daily-plan checkboxes, and revision reminders stay in each student's browser. Reminders appear inside NU Notes when the student returns; there are no push notifications.
- Staff can see check-in counts, but not private study progress. The AI has not analyzed college notes or a full syllabus yet; those files have not been provided.
- Supabase's Free plan is subject to inactivity pausing and usage limits. Cloudflare's free AI and Worker quotas can be exhausted during busy periods; the AI may stop until the next daily reset. Free tiers do not guarantee service for 1,000 simultaneous users, so do not advertise that capacity as guaranteed.

## Official free-plan details

- [Cloudflare Workers AI pricing and daily free allowance](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Cloudflare Workers Free request limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare Pages Function bindings](https://developers.cloudflare.com/pages/functions/bindings/)
- [Supabase Free plan limits](https://supabase.com/docs/guides/platform/billing-on-supabase)
- [Supabase Free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)

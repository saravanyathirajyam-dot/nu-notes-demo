# NU Notes setup

The site uses Cloudflare Pages and Workers AI plus a Supabase Free project for a shared daily AI usage counter. It does not use OpenAI API billing or collect student names or USNs. Keep Cloudflare on the Workers Free plan if you want to keep hosting at ₹0.

## 1. Set up the AI usage counter

1. In Supabase, create a Free project.
2. In its SQL Editor, run `supabase/schema.sql` once.
3. In the project API settings, copy the Project URL and create/copy a secret API key (`sb_secret_...`). Keep the key private and add it to Cloudflare only as an encrypted secret.

The SQL creates only an anonymous daily request counter. It does not create or remove student check-in data. If an earlier version already created a student check-in table, it stays untouched; this version does not write to it or expose it through the site.

## 2. Connect the hosted site

The Cloudflare Pages project should use the GitHub repository's `nu-notes-free` folder as its root. Choose no framework/build command and `.` as the output directory. Cloudflare publishes the site on its free `pages.dev` address and deploys new commits from the production branch.

## 3. Connect Workers AI

In the Pages project, open **Settings → Bindings → Add → Workers AI**. Set the variable name to `AI`, choose the Production environment, save, and redeploy. The app uses `@cf/zai-org/glm-4.7-flash`; no separate AI provider key is needed. The tutor is configured to return direct student-facing explanations and worked steps instead of spending the response on hidden reasoning.

Cloudflare's free AI allowance and request limits can change or run out. The app also sets a shared cap of 100 AI questions per UTC day. Free tiers do not guarantee service for 1,000 simultaneous visitors.

## 4. Add Cloudflare settings

In **Settings → Variables and Secrets**, add these for Production. Mark the Supabase key as encrypted. Never put it in website source, GitHub, or chat.

| Name | Type | Value |
|---|---|---|
| `SUPABASE_URL` | Variable | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Secret | Supabase `sb_secret_...` key |
| `AI_DAILY_LIMIT` | Variable | `100` |
| `WORKERS_AI_MODEL` | Variable | `@cf/zai-org/glm-4.7-flash` |

Redeploy after changing bindings or settings. `ADMIN_TOKEN` is no longer used.

## 5. Check the connection

- Visit `/api/status`; it should report `aiReady: true` and `aiProvider: "Cloudflare Workers AI"`.
- Ask the tutor a general study question, chemistry reaction question, or simple maths/physics problem. Confirm that a short follow-up such as “show the structural formula” uses the previous reaction without asking the student to repeat it.
- For a course-focused explanation, paste the relevant text into the optional course-material box.

## Student data

- No login, name, USN, or student check-in is collected by this site.
- Cloudflare Workers AI receives each question, recent chat turns, and any course text pasted with the question. The last six exchanges are saved in local browser storage for follow-up context after a reload; **Clear chat** removes this history. Pasted course text is not saved in that history. Avoid entering personal or sensitive information.
- Supabase stores only daily aggregate AI request counts for the shared cap. The website does not save student chat history there.
- Exam dates, saved topics, progress, and revision reminders are stored in that student's browser and are not visible to staff.
- Supabase or Cloudflare free limits can be reached during busy periods. Free plans do not guarantee 1,000 simultaneous users or uninterrupted service.

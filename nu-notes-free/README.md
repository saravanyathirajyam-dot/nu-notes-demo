# NU Notes · free-stack build

This folder contains the NU Notes site, Cloudflare Pages Functions, and the Supabase schema for real USN check-ins. It uses only free-plan services: Cloudflare Pages/Workers AI and Supabase Free. It does not use OpenAI API billing.

## Features

- Open check-in form for name and USN, with shared counts saved in Supabase.
- Private staff view protected by a secret access code.
- NU AI powered by Cloudflare Workers AI, with a shared limit of 100 questions per UTC day and Cloudflare's own free-neuron ceiling.
- Questions, recent chat turns, and optional pasted course text go to Cloudflare Workers AI. Student names and USNs do not.
- Daily exam countdown, short study plan, continue reading, saved topics, private subject progress, and opt-in spaced revision reminders stored in the current browser.
- AI follow-up prompts for simpler explanations, worked examples, and short recaps. There are no practice-question features.

## Setup

Follow [SETUP.md](SETUP.md). Keep Cloudflare on Workers Free and add the Supabase secret key and staff access code only through Cloudflare's encrypted secret settings. The AI uses a Cloudflare binding and does not need a provider API key.

## Limits and privacy

The USN field is not identity verification, and check-in counts can be inaccurate or abused. The staff view shows the 200 most active USNs while totals cover all saved rows. AI chat is held only in that browser tab; it is not saved in Supabase. Study progress is stored locally and not visible to staff. The free provider quotas can be exhausted; free tiers do not guarantee uptime or 1,000 simultaneous users.

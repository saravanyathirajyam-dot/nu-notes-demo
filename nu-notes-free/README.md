# NU Notes

NU Notes is a public study space for Nrupathunga University students. The live site has a notes library, department browsing, private on-device study tools, and a free AI tutor powered by Cloudflare Workers AI. It does not use OpenAI API billing.

## Features

- Browse sample study topics by subject and department. Official college notes can replace the clearly labelled sample material later.
- Ask the tutor general study questions, chemistry reaction questions, or request worked maths and physics solutions. Follow-ups use the recent chat context. Optional pasted course text is sent with the question to Cloudflare Workers AI.
- Use an exam countdown, study plan, saved topics, progress, and revision reminders. This information stays in the student's browser.
- No login, name, USN, or check-in is collected by the site.
- A shared limit of 100 AI questions per UTC day protects the free AI allocation. Cloudflare may impose additional free-plan limits and availability constraints.

## Setup

Follow [SETUP.md](SETUP.md). The backend uses encrypted Cloudflare settings for the Supabase AI usage counter and a Workers AI binding. Keep secret keys out of the website source, GitHub, and chat.

## Privacy and capacity

AI questions, recent chat turns, and any optional pasted course text are sent to Cloudflare Workers AI. Up to six recent exchanges are saved in local browser storage so follow-ups can use context after a reload; students can clear them with **Clear chat**. Pasted notes are not saved in that history. Study tools use local browser storage. No student identity is submitted. Older versions could have created a Supabase check-in table; the current site no longer writes or displays those records, and does not delete existing database rows automatically. Free plans do not guarantee uptime or capacity for 1,000 simultaneous users.

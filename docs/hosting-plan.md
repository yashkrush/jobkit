# Hosting plan: JobKit as a public web app

Status: **parked 2026-11-04**, to pick up later. Nothing below is built yet.

## Decisions

- **Hosted web app** (people sign up at a URL), not clone-and-run only.
- **Free at launch.** No billing, no paid tiers. Each user pays for their own Claude use, so the
  only running costs on our side are hosting, the database and Discover's board fetching.

## How a user connects Claude

A hosted app may not offer "sign in with claude.ai" or send requests on a user's Free/Pro/Max
plan. Anthropic bars this for third-party apps (enforced from January 2026, docs clarified
February 2026, "unless previously approved"). Two routes stay open:

1. **Subscription, through the user's own GitHub (the Pulse pattern).** The user runs Claude
   Code's `/install-github-app` in their own private JobKit data repo. That saves their
   subscription token (or API key) as a secret in *their* repo and adds Claude's official GitHub
   workflow. JobKit then hands Claude work by opening issues / triggering the workflow, and reads
   the results back from the repo. JobKit never holds or forwards the token. Already proven on
   this repo from Pulse (issue opened by the Pulse bot, Claude replied on the subscription).
   - Fits JobKit well: the engine already is slash commands over markdown files in git.
   - Costs: needs a GitHub account and Claude Code, which many job seekers won't have. Each run
     waits for an Actions runner to start, on top of the 30 to 60 seconds a tailor already takes.
   - To confirm before building: that this stays within Anthropic's terms when a third-party app
     is the one triggering the runs.
2. **API key (fallback for everyone else).** The user creates a key at console.anthropic.com and
   pastes it into Settings. Billed separately from any Claude plan; the onboarding screen says so.
   - Check the key with one cheap call when saved. Store it encrypted (e.g. Supabase Vault), use
     it only on the server, never return it to the browser, never log it. Show the last 4
     characters and a "Remove key" button. Suggest a monthly spend limit in their Console.
   - Clear messages for an invalid key, no credit left, and rate limits (429).
   - Optional later: OpenRouter's OAuth sign-in as a friendlier way to get a user-paid key.

## Because it is free

- No Stripe, no quotas.
- Still record each user's token use and show it to them as an estimated cost. Measure the real
  cost per tailor once the API version runs.
- Prompt caching (shared rules + the user's profile) saves users money directly.
- Keep our costs predictable: invite list or signup cap at first, per-user rate limits.

## Work, in order

1. **De-personalise the engine** (needed whatever the route):
   - Commands cite CLAUDE.md sections that `CLAUDE.md.template` lacks: `## Résumé identity`,
     `## Screening checklist`, `## Apply/skip lessons`, `## Interview lessons`,
     `## Prep-pack construction rules`, `## Senior-track framing`, `## TPM ...`.
   - `resumes/resume-skeleton.md` lives in the private data repo; a fresh clone doesn't get it.
     Move the format rules into the tracked engine.
   - `consistency.js` checks the owner's constants (years, language level, title set). Read them
     from the user's profile instead.
   - The owner's facts still appear in `tailor.md`, `tailor-analyse.md`, `prep.md`,
     `tailor-screen.md`, `tailor-verify.md`, `server.js` and `public/app.js`.
   - Lanes (EM / QA / Senior / TPM) and the four base résumés are hardcoded. Let each user define
     their own lanes and any number of base résumés, for any job family.
   - Test: fresh clone, onboard a fake non-engineering persona, run tailor, prep, log, Discover.
2. **Engine runtime:** route 1 keeps the Claude Code commands as they are (they run in the user's
   repo). Route 2 needs each command as a server-side API call on the user's key, with structured
   JSON output instead of today's regex parsing. Today `runClaude()` spawns
   `claude -p --dangerously-skip-permissions`, which must never run multi-tenant on our server.
3. **App login:** Supabase Auth (email magic link + Google). Separate from the Claude connection.
4. **Per-user data:** Postgres for users, pipeline and usage; profiles and company notes as
   markdown text; résumés in storage; row-level security. (Route 1 can keep data in the user's
   own repo instead.)
5. **Security:** login on every endpoint (none today, and the server listens on all interfaces),
   upload checks, rate limits, secrets in environment variables.
6. **Hosting:** always-on Node host (Railway, Render or Fly), not serverless. Staging + backups.
7. **Onboarding:** account, connect Claude (route 1 or 2), upload CV, generated profile, user
   reviews it.
8. **Legal:** privacy policy (CVs are personal data under GDPR), terms, Impressum, data export and
   delete, processor list (Anthropic, host, Supabase, GitHub for route 1).
9. **Operations:** Sentry, uptime checks, CI running `ats.js`, `plain.js`, `consistency.js`.
10. **Launch:** private beta with 3 to 5 invited users, fix what breaks, then open signups with a cap.

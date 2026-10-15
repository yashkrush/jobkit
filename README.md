# JobKit

**A job-application operating system with an LLM agent as its backend.**

JobKit runs your job applications as a version-controlled knowledge base. It tailors your résumé to
each job description, scores keyword coverage, drafts cover letters, preps you for interviews, and
keeps a live pipeline of every company in flight. The unusual part is the architecture. There is no
LLM API wrapper here: **the backend is the [Claude Code](https://claude.com/claude-code) CLI
itself**, spawned headless per request to read and write the actual files in the repo.

<!-- Hero screenshot: save the Pipeline or Tailor tab as docs/screenshot.png, then UNCOMMENT the
     line below to show it at the top of the README.
![JobKit — the Pipeline view](docs/screenshot.png)
-->

> **What it demonstrates:** LLM-agent application design, using a CLI as runtime and prompts as
> programs. Grounding and anti-hallucination for generative output. Full-stack shipping in
> Node/Express and vanilla JS. A closed learning loop. Deterministic scoring where an LLM guess
> would be the easy option. Designed, built and shipped solo, end to end.

This is the public **code** repo, and it is clone-and-run for anyone. The data it operates on
(résumés, company notes, pipeline) stays in a separate private repo on your own machine.

> **Status:** built for one person and running locally, now clone-and-run for anyone. The Setup tab
> onboards you from your own résumé into a profile, and it runs on *your* Claude account with
> *your* data, all gitignored and never committed. It is still deliberately single-user-per-checkout
> and un-hardened. Read [Limitations](#limitations-read-before-you-clone) before cloning.

---

## The idea

Most AI résumé tools are a textbox wrapped around a prompt. They are stateless. They don't know what
you applied to last week, what your real achievements are, or which framing got you a callback. So
they hallucinate, and every tailor starts from zero.

JobKit inverts that. **The source of truth is plain Markdown in a git repo:**

- `CLAUDE.md` is a living profile. It holds a verified achievement bank, positioning and voice
  rules, and an explicit *fabrication log* of phrasings that are off-limits. A tailoring-lessons
  section grows over time.
- `companies/<name>.md` is one file per company, accumulating the JD, notes, round-by-round prep and
  a process log.
- `pipeline.md` is a single table of where every process stands.

The agent reads these before it does anything, so output is grounded in real facts and improves as
the corpus grows.

The headline feature is a **closed learning loop**. Every résumé you actually submit is fed back in
and diffed two ways. Against the achievement bank, to capture genuinely new facts. Against the
machine draft in the context of that JD, to extract generalisable framing lessons. Approved facts
and lessons are written back into `CLAUDE.md`, so **each application makes the next tailor more
likely to clear screening.**

---

## Features

Nine tabs, each backed by an endpoint in `server.js`:

| Tab | What it does |
|---|---|
| **Setup** | First-run onboarding. Upload a résumé (PDF or DOCX), optionally add comp, location and any wins not on the CV, and JobKit drafts your `CLAUDE.md` profile. Grounded only in what you provide, with anything it can't confirm flagged for review. The upload also becomes your base résumé. |
| **Pipeline** | `pipeline.md` rendered as live status cards. Every company, stage and next action in one view. |
| **Companies** | Searchable master-detail view of every company: notes, generated files and the captured JD in one pane. Upload the actually-submitted résumé, mark sent, log entries, close, delete. A failed JD capture is detected and offers inline paste-to-recover, so prep and tailor always have the real text. |
| **Discover** | Finds open roles by reading public ATS boards directly (Greenhouse, Lever, Ashby, Personio and others) plus free aggregators. Documented public endpoints, no scraping. Search by title and location, or see only what's new since the last run. Roles you've applied to, dismissed, or ruled out drop off the list. |
| **Check Match** | Paste a JD for a fast APPLY / MAYBE / SKIP verdict with reasoning, against an honest fit filter covering comp, scope, language and location. Triage before investing in a full tailor. |
| **Tailor** | Paste a JD to get a grounded, fully-tailored résumé, an optional cover letter, a deterministic ATS keyword score, and one-click DOCX or HTML download. |
| **Prep** | Generate an interview-prep pack for a specific company and round, built from the real JD-to-CV gap. |
| **Log** | Two speeds. An instant **Log** button writes directly to file with no LLM in under 2s. **AI log** handles ambiguous multi-company routing. |
| **Intake** | Bulk-route a pasted blob of notes or a chat summary into the right company files and refresh the pipeline. |

### Things worth calling out

**Deterministic ATS score (`ats.js`).** Not an LLM guessing a number. It extracts weighted keywords
from the JD, preserving hard tokens like `C#`, `CI/CD` and `.NET` that naive tokenizers mangle, then
measures coverage in the résumé. The same JD and résumé produce the same score every time, with an
actionable missing-keyword list. It is a heuristic and is labelled as one, not a real ATS engine.

**Deterministic plain-language scan (`plain.js`).** Generated prose has measurable tics: stacked
em-dashes, tacked-on benefit clauses, rule-of-three lists, puff phrases, uniform bullet length.
Asking a model whether its own writing sounds AI-generated does not work, so the check is a regex
scan that scores 0-100 and names each offending line. It measures sentence *shape*, not vocabulary,
so the standard industry terms an ATS matches survive every rewrite. A résumé can be made plainer at
no cost to keyword coverage.

**Sourcing that costs nothing until you ask.** Discover narrows thousands of postings in three
stages ordered by cost: a deterministic title, location and language filter, then `ats.js` keyword
ranking, then a single Claude call for a verdict on roles you pick. The first two stages are free,
so the model is never spent on a posting you'd reject at a glance. Every filtered-out posting is
kept with its reason and shown in a dropped view, so a too-narrow keyword surfaces as a visible
false negative instead of a silent one.

**Anti-fabrication by construction.** `CLAUDE.md` carries a fabrication log of specific phrasings the
agent must never use, plus honesty rules such as "name the gap rather than invent a match". The ATS
score is explicitly not allowed to justify adding a skill that isn't real.

**Two independent quality gates.** After a draft is written, the server runs two separate `claude -p`
passes in the background. A screening gate checks must-have keyword coverage, top-third placement, and
an honest domain-gap ceiling it can't fake away. A verify gate traces every claim back to the
achievement bank and flags banned phrasings. A verifier never grades the pass that wrote the draft,
and gates report only — they never edit the saved résumé, so the file the user reviewed is the file
that ships.

**Fast/slow split.** Anything user-facing, such as a file save, mark-sent or pipeline upsert, responds
in under 2s with a direct file write. The slow LLM steps run afterwards and update the UI when they
finish. The primary action never blocks on the model.

**Real document output.** Résumés render to DOCX and HTML from the saved Markdown, with PDF and DOCX
ingestion for the upload-and-learn loop.

---

## Technical design

### Claude Code as a headless backend

```
Browser (a form)
   │  HTTP
   ▼
Node / Express  ──  fast direct file writes · DOCX/PDF · deterministic ATS math
   │  spawn `claude -p` in the repo dir
   ▼
Claude Code agent  ──reads/writes──▶  CLAUDE.md · companies/ · resumes/ · output/
   │  runs a slash command (.claude/commands/*.md)
   ▼
result rendered back in the UI
```

The core architectural bet is to skip the LLM API and the tools you'd have to rebuild around it.
JobKit uses the **Claude Code CLI as its application runtime.** The Node server stays thin, owning
HTTP, fast file writes, document conversion and the deterministic ATS math. Everything needing
reasoning is delegated:

```js
// server.js — the whole "AI backend"
const args = ['-p', '--dangerously-skip-permissions', prompt];
const proc = spawn('claude', args, { cwd: ROOT, env: process.env });
```

Each request spawns a fresh `claude -p` in the repo directory, so the agent has native access to the
files both as context and as a workspace. The business logic for tailoring, prepping, intake and
logging lives not in JavaScript but as **slash commands** in `.claude/commands/*.md`, versioned
prompt-programs the agent executes:

```
.claude/commands/
  onboard.md         # generate a CLAUDE.md profile from an uploaded resume
  tailor-analyse.md  # fast apply/skip analysis, no build ("Check Match")
  tailor.md          # the builder: tailored CV + optional cover letter
  tailor-screen.md   # independent gate: screening-readiness
  tailor-verify.md   # independent gate: grounding / fact-check against the achievement bank
  prep.md            # interview prep pack
  learn.md           # learn from an outcome → route lessons to the right command
  log.md / intake.md # process logging + bulk note routing
```

The same commands work from the terminal (`/tailor`) and from the web UI, which is just a form that
triggers the command. Logic changes are prompt edits, not redeploys.

### Stack

- **Backend:** Node and Express (`server.js`). No framework beyond Express, no database.
- **Persistence:** the filesystem and git. Markdown *is* the database.
- **AI runtime:** Claude Code CLI, invoked headless per request against your existing `claude` auth.
- **Frontend:** vanilla HTML, CSS and JS in `public/`. No build step, no framework.
- **Documents:** `docx` to generate, `mammoth` to read .docx, `pdf-parse` to read .pdf, `marked` for
  Markdown to HTML.
- **Scoring:** `ats.js`, `plain.js`, `consistency.js`, `presend.js` and `discover.js`. Self-contained, dependency-free, deterministic.

### The learning loop, concretely

JobKit learns on two clocks: at submission, from the résumé, and at outcome, from the result.

**From the résumé you submit:**

1. `/tailor` drafts a résumé, the two independent gates check it, you download the DOCX.
2. You edit it externally. That edited file is the **source of truth**, not JobKit's draft.
3. Upload the submitted file. It is saved, text-extracted, the prior draft is stashed, sent is
   marked and the pipeline upserted, all in under 2s with no LLM.
4. *Then* a second pass diffs submitted-against-bank and submitted-against-draft to surface, for your
   approval: new facts, framing lessons, corrections where the submitted résumé contradicts the bank,
   and honesty conflicts. That last check is deterministic rather than model-driven, because the
   submitted file can itself break a rule, and "source of truth" must never silently overwrite an
   honesty rule.

**From the outcome you log:**

5. Logging a result such as a rejection or recruiter feedback auto-runs `/learn`, which distils the
   outcome into generalisable lessons and routes each to the command that will act on it. Interview
   feedback goes to `/prep`, screening signal to `/tailor`, conversion patterns to the apply/skip
   call. All staged for approval, never auto-committed.

The corpus that grounds the next application ends up strictly better than it was before.

### Two-repo design

One working tree, two git repos:

- **`jobkit`** (this one, public) holds code, slash commands and the landing page. Personal data is
  excluded.
- **`jobkit-data`** (private) holds the actual profile, company files, résumés and pipeline, tracked
  by a separate git dir over the same folder.

So the engine is shareable and your applications stay private.

---

## Running it (your own copy)

JobKit is built to be cloned and run locally against **your own** Claude account and **your own**
profile. Your data never leaves your machine and is never committed.

```bash
npm install
npm start          # → http://localhost:3000
```

1. **Authenticate Claude.** Install the [Claude Code CLI](https://claude.com/claude-code) and make
   sure `claude` runs from your terminal. Every compute action spawns `claude` headless and bills
   *your* account. There is no shared key.
2. **Onboard.** With no profile yet, the app lands you on the **Setup** tab. Upload your résumé, add
   comp, location and any wins not on the CV if you want, then hit *Generate profile*. JobKit writes
   your `CLAUDE.md` grounded only in what you provided, flags anything it couldn't confirm, and saves
   the uploaded file as your base résumé. Review and tighten the profile, since this corpus is what
   every other tab reads. If you prefer the terminal, run `/onboard`, or copy `CLAUDE.md.template`
   and fill it in by hand.

That's it. Check Match, Discover, Tailor, Prep and the rest now work against your profile.

**Prerequisites:** Node (developed on v25, anything modern works) and the Claude Code CLI on your
`PATH`. The data directories and an empty `pipeline.md` are created on first boot.

Each LLM-backed action takes roughly 30s to 2min, because a fresh agent loop runs per request.

---

## Limitations (read before you clone)

This is a personal project and a demonstration of an idea, not a product.

- **Single-user by design.** No accounts, no auth, no multi-tenancy. It assumes one person, one
  machine, one profile. Sharing means per-person checkouts.
- **Runs `--dangerously-skip-permissions`.** The server spawns Claude with file permissions bypassed
  so edits don't prompt. Fine for a private local folder you own. Do not expose this server to a
  network or run it from a shared directory.
- **No database, no tests, no CI.** State is Markdown and git. That is a feature for a personal
  knowledge base and a liability for anything bigger.
- **Cost and latency live with the agent.** Every compute click is a full Claude Code run, slower and
  pricier than a single API call, and dependent on your local CLI auth.
- **Bring your own profile.** No example profile ships here. `CLAUDE.md.template` shows the shape to
  aim for.
- **Heuristics, honestly labelled.** The ATS score is keyword coverage, not a real ATS parser. It is
  reproducible and useful for relative comparison. Don't read it as a guarantee.

### If you're here to build on it

The reusable ideas, in rough order of value:

1. **An LLM CLI as a headless app backend**, delegating tools and context to the agent instead of
   re-implementing them.
2. **Prompt-programs as versioned slash commands**, so business logic is Markdown shared between
   terminal and UI.
3. **A grounding corpus with an explicit fabrication log**, to keep generative output honest.
4. **A closed learning loop**, feeding real outcomes back into the corpus so quality compounds.
5. **The fast/slow split**, so a user action never blocks on the model.

Taking this multi-user would mean swapping the filesystem for a database, the CLI for the API with
per-tenant context assembly, adding auth, then sandboxing and metering the agent. That is a
different project, which is rather the point of open-sourcing this one.

---

## Repo map

```
server.js              Express server, endpoints, doc generation, Claude spawn helper
ats.js                 Deterministic ATS keyword-coverage scorer
plain.js               Deterministic plain-language scan (flags AI-sounding prose)
consistency.js         Cross-application consistency gate (same person as everything already sent?)
presend.js             Pre-send artefact check (stale DOCX, pronouns, metadata, length)
discover.js            Job sourcing from public ATS boards + deterministic filtering
discover-config.json   Boards to scan, title/location filters, cost limits
public/                Vanilla JS frontend (index.html, app.js, style.css)
.claude/commands/      Slash commands = the agent's business logic
CLAUDE.md.template     Blank, structured profile skeleton
landing/               Marketing landing pages
```

> `CLAUDE.md`, `companies/`, `resumes/`, `output/` and `pipeline.md` are **gitignored**. They are the
> personal data, kept in the private repo. You supply your own.

---

## License

[PolyForm Noncommercial License 1.0.0](LICENSE.md). Source-available: you're welcome to read, fork,
learn from, and use JobKit for any **noncommercial** purpose. Commercial use is reserved to the
author. If you want to use it commercially, get in touch.

---

*Built by [Yash Kulshreshtha](https://www.linkedin.com/in/yashkul), an engineering leader based in
Berlin. JobKit is a personal project. All profile and résumé data is generated per-user and kept
private, so nothing personal ships in this repo.*

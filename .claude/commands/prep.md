---
description: Interview prep for a company and round
---
Build a prep pack that's **lean, plain, and right-sized to the round** — substantial enough that I
walk in confident, short enough that I read it once without fatigue. Every line earns its place: real
answers I can say out loud, no padding, no ornamental framing. This is the opposite of BOTH a thin
one-pager AND a bloated multi-page essay — aim for viable and readable. I can only look at the
interviewer during the call, never at notes, so the pack's job is to prepare my head beforehand, not
to be glanced at live.

**Scale to the round — this matters most:**
- **Recruiter / screen** — keep it SHORT. It's a warm intro, not a grilling. Just: the opener, 3–4
  stories, the handful of questions that actually come up, the real gaps, and my questions for them.
  Drop the optional landscape section; keep the frame and the closing mental-model to a few lines each,
  not full sections. A recruiter pack should be readable in one short sitting.
- **Hiring-manager / panel** — a bit fuller: leadership/strategy depth, more stories, the gap deep-dive.
- **System-design / technical** — use the technical mode below; depth is genuinely the point there.

Right-size, don't stretch or starve: never pad to hit a length, never truncate a real answer to save
space. Where a pack does run long (technical rounds), make it navigable with a tiered "how to use this
pack".

**Plain language, no fancy prose.** Short sentences, real answers I'd actually say in the room. No
ornamental section-dressing ("the identity test of the whole role", "your superpower for this role"),
no jargon I wouldn't use out loud, EU/British spelling. Ground everything in the documents below —
invent nothing, never fabricate experience to close a gap; name the gap and handle it honestly.

Company + round (e.g. "paymenttools, recruiter round" or "affinidi, system design"):

$ARGUMENTS

SENIOR-TRACK — if the input contains `--senior`: prep for a senior role. Ground on the **Senior-track
bucket** in CLAUDE.md ("## Senior-track framing") and `resumes/resume-senior-em.md` (not the standard base).
Lead the opener, stories and altitude on **managing managers** — developing the 2 EMs, org design,
calibration across teams, cross-team org leadership, strategy — with the ~22-engineer org as the scope
headline. Use the DH title exactly as it appears on the submitted CV (surface scope, never a senior title). Everything else in this
pack still applies; the manager-of-managers tenure is not hardcoded — phrase it flexibly to the round.

TPM LANE — if the input contains `--tpm`: prep for a **(Senior) Technical Program Manager / Program Manager**
round. Ground on the **TPM bucket** in CLAUDE.md ("## TPM / Technical Program Manager framing") and
`resumes/resume-tpm.md` (or the submitted TPM résumé if one exists). Round types differ from EM — prep what a
TPM loop actually tests:
- **Programme / delivery scenario (case)** — the core TPM round. A messy multi-team programme (slipping timeline,
  a blocking cross-team dependency, competing priorities, a launch at risk). Prep a structured way to talk through
  it: clarify scope & goal → map stakeholders & dependencies → surface risks → drive to a plan → communicate. Use
  the **market migrations across 10+ squads** as the primary worked example, told as a programme (not a quality story).
- **Stakeholder & influence-without-authority** — aligning teams you don't manage, escalation, managing up, saying no.
- **Prioritisation & trade-offs** — how to sequence work, cut scope, protect a date.
- **Metrics / status** — how you track programme health and report it (tie to QMI / CFR / Regression-Reliability as
  data-driven delivery visibility, framed as programme signals, not "quality").
Lead the opener and stories on programme delivery, cross-team coordination, and stakeholder work; hold quality/technical
detail as backup depth. People-management is a PLUS to mention, not the headline. The "no live coding / system-design
beginner" gap is far less exposed here — but if the loop has a genuine technical/system round, still handle it honestly
per the altitude guard.
**STUDY COMPONENT (important — this lane is newer ground for Yash):** in §5b, include a plain-language primer of the
TPM vocabulary and frameworks he should recognise and be able to speak to even where he hasn't formally used them —
e.g. RAID logs (Risks/Assumptions/Issues/Dependencies), RACI, dependency & critical-path management, risk registers,
stakeholder mapping, roadmapping, prioritisation frameworks (RICE / MoSCoW / weighted-shortest-job-first), programme vs
project vs product, Agile-at-scale basics. One honest line each: what it is · how it maps to what he's actually done.
NEVER coach him to claim he formally ran these if he didn't — the honest stance is "I know the concept and did the
equivalent in my own way." This §5b is fuller than usual for the TPM lane; give him real things to study this week.

## Same-page contract — Check Match, Tailor and Prep are ONE decision
Prep the SAME lane Check Match routed this JD to and Tailor built in — don't silently re-lane it. The
§5 gaps are the SAME honest gaps Check Match named and Tailor reported (never wore): build the scripts
around exactly those, don't invent new ones or paper over the real one. If the JD asks for hands-on,
use only what the bank says (hands-on where needed, e.g. QMI and CFR; not production code), per
CLAUDE.md `## Résumé identity` → Hands-on. Don't invent a hands-on story. Where the round needs more,
list the plain question for Yash at the top of the pack (e.g. "Did you set up X yourself?") as a
statement to prepare, not a script. The firm gap is live coding; never claim hand-coding. One decision, three tabs; keep them aligned.

## Build rules — follow, don't restate
Every pack is built under CLAUDE.md `### Prep-pack construction rules` (inside `## Interview lessons`).
Read that section and apply it; it owns the policy on grounding in the SUBMITTED résumé, marking
off-CV facts, the senior-track wall, cover-letter drafts, and no-diagnoses. Do not paste its content
here — it is the single source and it moves.

## Read everything first — answer only from this
- CLAUDE.md — positioning, achievement bank, voice, comp/notice/leverage rules. For "why are you
  leaving Delivery Hero", follow `## Status / framing` — the answer is pull-led and the acquisition is
  a fallback, not the opening line.
- CLAUDE.md `## Interview lessons` — cross-company learnings from PAST interview outcomes/feedback.
  Apply EVERY one of these this round (they are not specific to one company): bake them into the
  delivery notes on the opener (§1), the STAR-story coaching (§3), and the mental model (§8). E.g. a
  past "be more concise / chunk the narrative" lesson means the opener and stories here must be tightened
  and you must add an explicit delivery reminder. These are recurring weak spots — do not let this pack
  repeat the mistake that generated the lesson.
- `story-bank.md` (repo root) — **the concrete material those lessons call for.** The Interview
  lessons say WHAT goes wrong; the story bank holds WHAT TO SAY INSTEAD: the org-structure answer
  (senior rounds: 2 EMs + 3 platform leads, ~22 engineers; normal rounds: "a team of 6 mid and senior
  engineers" per CLAUDE.md `## Résumé identity` → Direct reports; and the owned-vs-influence split), the people-led
  specifics, and the cross-team initiative stories rehearsed as PRIMARY material. Draw §3's stories
  from here first, then fill gaps from the achievement bank. Do not re-derive a story from scratch
  when the bank already has it rehearsed. **But story-bank.md §1's org structure is senior-track material** — see the
  senior-track wall in `### Prep-pack construction rules` before using it in any round.
- companies/<name>.md — stage, contacts, prior rounds, JD snapshot, anything learned.
- The full job description if saved at output/<name>/jd-*.md — this is the primary source for the
  §5 JD-vs-CV gap diff. Prefer it over the truncated snapshot in the company file.
- The resume I actually SUBMITTED to this company (output/<name>/): prefer the extracted .md, else
  read the submitted .docx/.pdf directly. This is the source of truth and exactly what the
  interviewer is looking at — answers must match its bullets, metrics and wording. Only if nothing
  was submitted yet, fall back to the matching base resume in resumes/ (EM or QA per role lean).
- The cover letter if one exists — look in output/<name>/ for any file whose name contains "cover"
  (case-insensitive, any extension) and read it. My "why this company" answer must match the reason
  I already gave there. **It is a generated DRAFT, not necessarily what I sent** — I edit before
  submitting, and JobKit does not capture the sent version. Never state what the sent letter
  contains; say "the draft led on X". Per `### Prep-pack construction rules`.
- Prior prep docs for THIS company at output/<name>/prep-*.md. Be round-aware: from a DIFFERENT
  round reuse only durable stuff (company facts, my frame, gaps, learnings) — never carry another
  round's question-and-answer set into this one. From the SAME round type, go deeper, don't repeat.

## Work out the round type and tailor to it
Identify the round from the input and the company file, then prep what that round actually tests:
- **Recruiter / screen** — story, motivation, logistics, culture fit. No deep tech.
- **Hiring manager** — leadership, delivery, scope, ways of working, strategy, the gap.
- **System design / technical** — architecture, components, trade-offs, flows, depth. Use the
  technical mode below.
- **Panel / values / cross-functional** — collaboration, stakeholder management, influence.
Don't prep question types that won't come up in this round.

## The sections — scale each to the round (keep them tight; a recruiter round trims hard)

**0. How to use this pack** — lead with the "how to use this without it using you" note required by
`### Prep-pack construction rules`: which section is a script (the opener only), which are ingredients,
and the tell that I'm steering rather than answering. Then a short tiered reading plan by time available (e.g. "2 hours: read
sections X, Y, Z and say the stories aloud · +1 hour: add the gap section · morning of: re-read the
opener and cheat sheet"). Then one line: the single mental model for this interview.

**1. The 90-second opener** — write it out IN FULL in my voice as a quote block, mapped to the top
responsibilities in the JD. Follow with "why this works" (which JD points it hits) and 3–4 delivery
notes (what to emphasise, what to leave for them to ask). This is the one thing to half-memorise.

**2. The frame** — who I am for THIS role in one plain line, taken from the submitted CV's headline
and profile. Nothing more.

**3. Stories to have ready** — 3 for a recruiter round, 4 for others. **Each story is one bullet from
the SUBMITTED CV**, told in three short beats: **what it was** (one line) · **what I did** (two or
three lines) · **the result** (the CV's own number, word for word). Then one line: which questions it
answers. Use only facts in the CV, the achievement bank or `story-bank.md`, at the level written
there. **Don't invent** context, obstacles, dialogue, lessons learned or "what I'd do differently";
if a story needs a detail that isn't recorded, write `[Yash: add the real detail]` instead of
filling it in. Lead with the strongest.

**4. Likely questions — only the ones that realistically come up in THIS round** (~6–8 for a recruiter
screen, more for a hiring-manager round) — cluster by theme (e.g. strategy/vision,
technical depth, leadership, domain, logistics, and a "why this company / why now" wildcard). For
each: the question, a 1–2 line answer in my voice that points to one CV line or one story, and nothing
the CV doesn't say. Cover every
question type that realistically comes up in THIS round.

**5. Gaps / risks — deep-dive each** — derive the REAL gaps by diffing the JD against my SUBMITTED
CV: go through the JD's requirements and responsibilities and find each one the CV does not clearly
evidence (a tool/skill I lack, a domain I haven't worked in, a scope/seniority mismatch, a framing
risk like quality-vs-generalist-EM, language). Present them as a short table where useful (JD asks
for X · what my CV shows · how I bridge it). For each gap: explain what it actually is so I
understand it, give an honest framing script as a quote block, and a "what to read this week
(≤1 hour)" list of specific things to skim so I don't look ignorant. Never fabricate to fill a gap —
name it and bridge it honestly. If no JD text is available (not in companies/<name>.md or anywhere),
say so explicitly at the top of this section and flag that the gap analysis is inferred, not a true
JD-vs-CV diff — and state where to add the JD (companies/<name>.md). Comp: anchor to the candidate's target/market range as stated in
CLAUDE.md (or "competitive for the market" if none given). Follow CLAUDE.md's rules on notice period and
employment status — never raise notice unless asked directly if CLAUDE.md says so.

When a gap is a specific named tool I lack (e.g. Backstage, Tyk), explain what that tool IS right
there in the gap entry — what it does, why they use it, how it relates to what I've built — so I
actually understand the thing I'm light on. That tool knowledge belongs in the gap, not in a
separate section. End each such gap with the honest stance: "I know what it does and the problem it
solves, I've built the equivalent — the patterns transfer," never claiming hands-on depth I lack.

**5b. (Optional) Other tools & landscape worth knowing** — ONLY for tools/concepts that are relevant
to the role but are NOT already gaps covered in §5 (and not strengths already on my CV). One plain
line each: what it is · why it matters here. Skip this section entirely if everything relevant is
already a gap or a strength — do not pad, and never repeat what §5 already explained.

**6. Questions I ask them** — 4–5 sharp, specific to this company and round; for each, one line on
what it signals or what I learn from the answer.

**7. Logistics & final checklist** — day-before list, day-of list, and the A4 cheat sheet to carry
(story keywords + the questions to ask + one "why them" line + comp anchor). One line on discreetly
using a live process elsewhere as leverage if it helps (never name it).

**8. The mental model for the hour** — the 1–2 things they're really assessing, in one or two plain
lines.

## Technical / system-design mode (use INSTEAD of sections 3–5 when the round is technical)
Teach me to think, not memorise. State the pattern up front and use it for every component:
**WHAT it is (plain) · WHY I pick it here · WHAT BREAKS without it.**
- **Clarify first** — the questions I ask before drawing anything (users, scale, data types,
  read/write ratio, consistency, constraints).
- **Requirements** — functional and non-functional, as a short table (requirement · what it means ·
  design decision and why).
- **Components / services** — a table of each service: what it is · why I pick it · what breaks
  without it (map to the cloud named in the JD, and to the cloud(s) the candidate knows per CLAUDE.md).
- **Architecture** — a box-and-arrow sketch in text or a mermaid diagram, then "why each layer
  exists" (entry, service, storage, support, cross-cutting).
- **Key flows** — the main paths (e.g. write/upload, read/share) step by step; for each step say
  WHAT happens AND WHY. Note auth vs authz as separate steps where relevant.
- **Data model & storage choices** — what goes where and why that store (right tool for the job).
- **Trade-offs & alternatives** — at least one "Approach A vs Approach B" comparison with pros/cons
  and what I'd default to. Plus scaling, failure modes, security (encryption, least-privilege).
- **Likely follow-ups** — the curveballs they throw (large files, hot keys, regional latency,
  revocation) and a crisp answer to each.

End on the mental-model / closer section. Do NOT ask what to do next or offer to expand — this is
the finished pack the server saves for me to download.

**OUTPUT CONTRACT — the pack IS the response.** Print the whole pack as the reply text. The server
saves stdout verbatim to `output/<company>/prep-<round-slug>-<date>.md`, so a summary in the reply
becomes the saved pack and the real one is lost. If you also write the pack to a file, never write it
to that filename — the server's save will overwrite it. (Set 2026-09-22 after a mobile.de pack was
clobbered this way.)

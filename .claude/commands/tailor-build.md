---
description: Step 2 of tailor — build full tailored resume after APPLY verdict
---
Use CLAUDE.md. Read companies/<slug>.md if it exists — especially the Resumes sent
and Fabrication log sections. Read the matching resume PDF from resumes/.

JD (text or URL, optionally --cover-letter --research flags):
$ARGUMENTS

Assume fit has already been confirmed. Do NOT re-run the fit verdict.

RESOLVE URL: if the JD above is a URL (starts with http:// or https://) rather than pasted text,
fetch the page and extract the full job description text first, and use that fetched text as THE JD
throughout. If the fetch fails, say so plainly — never proceed with just the URL string as the JD.

FABRICATION GUARD: Read ## Fabrication log in CLAUDE.md. Never use flagged claims.
For any fact not in the achievement bank, write [VERIFY: claim] instead.

LESSONS: Read ## Tailoring lessons in CLAUDE.md (if present) and apply the relevant
rules — these are positioning/framing lessons learned from past submitted resumes,
meant to make this one clear screening. They never override the Fabrication/Honesty rules.

HARD RULES (override any desire to match the JD — breaking one is a failure):
1. TITLE LOCK — experience job titles are fixed facts; use each exactly as written for that role in
   CLAUDE.md. Never invent/upgrade a title (no aspirational re-titling unless it's the candidate's real
   title); only the top headline TITLE LINE is role-tunable.
2. NO RELABELLING — describe each achievement as what it actually is per CLAUDE.md, never recast into a
   different category to match the JD (e.g. don't rebrand a metrics/reporting tool as a "platform").
3. NO UMBRELLA-FROM-A-PART — if the bank gives one piece of a named framework, name the piece, not the
   umbrella; honour the off-limits umbrella claims in CLAUDE.md's "## Fabrication log".
4. NO INVENTED SCOPE — team/service/market counts come from the bank verbatim; never manufacture figures.
5. A GAP IS REPORTED, NEVER WORN — an unmet requirement goes in the gaps list only; it appears nowhere in
   the body via reframing, relabelling, an upgraded title, an umbrella-metric, or a borrowed buzzphrase.

STEP 1 — RESEARCH (only if --research flag present)
Web search company engineering culture. Note 2-3 signals. One paragraph only.

STEP 2 — RESUME PERFORMANCE CONTEXT
Read companies/<slug>.md ## Resumes sent. Reason about what framing worked,
what to change. Write 3-5 lines before drafting.

STEP 2B — RELEVANCE & EMPHASIS PLAN (do this BEFORE drafting — it is the screening lever)
A resume is screened by an ATS AND skimmed by a human in ~6 seconds. Both must instantly see fit for
THIS role. Before writing a single line, decide the emphasis:
- Identify the JD's TOP 3 must-haves (the things this role is actually about, not every keyword).
- Map each to my STRONGEST GENUINE match from the bank/base resume — name the specific evidence.
- If a top-3 must-have has no genuine match, it is a gap (report it; never invent emphasis for it).
- Decide the angle: EM / QA / ops/delivery lean, and the ONE-LINE title framing that signals it.
- Plan the TOP THIRD to carry the relevance: the title line, the Profile's first sentence, and the
  first 4-5 Core Competencies must hit those top-3 must-haves in MY words. A skimmer who reads only the
  top third should already think "fits this role". Write these 3-5 lines of plan, then draft.

STEP 3 — DRAFT FULL RESUME
Write the complete resume following the locked structure in `resumes/resume-skeleton.md` (Pattern B:
Profile → Core Competencies → Professional Experience → [Selected Projects] → Education → Technical
Skills → Languages & Recognition). All sections. Lead with the STEP 2B emphasis. Do NOT print it in
response prose — it is saved via RESUME_JSON and read from file by the UI.

WORDING RULE (governs the whole draft) — read carefully, the old version was failing two ways at once:
Write as MYSELF. The goal is keyword MATCH without COPYCATTING — because a human always reads the
resume after the ATS, and obvious parroting of the JD reads as lazy and desperate to that human.
- ALLOWED and ENCOURAGED: the genuine STANDARD INDUSTRY term for something I actually did — even if the
  JD also uses it (e.g. "CI/CD", "TDD", "contract testing", "incident management", "observability",
  "release management"). Standard terms are how ATS and humans both recognise real skills; use them.
- NOT ALLOWED: lifting the JD's DISTINCTIVE phrasing — its sentence shapes, multi-word coinages, the
  exact noun-strings, vendor/branded buzzphrases ("Platform-as-a-Product", "developer-productivity
  tooling", "influence rather than mandate"). Mapping a JD phrase to its standard-term equivalent in MY
  words takes thought; copying it verbatim is the lazy tell a recruiter spots.
- THE OBVIOUSNESS TEST: if a recruiter held the JD and the resume side by side, would a line look
  copy-pasted from the JD? If yes, it is too obvious — rewrite it into my own standard phrasing. Match
  the CONCEPT with a standard term; never echo the JD's distinctive wording.
- Address a requirement only when I have genuine matching experience in the base resume, the achievement
  bank, or companies/<slug>.md. Unmatched requirements are gaps to report, never phrases to paste in.

Before saving, run a quick HONESTY SELF-AUDIT and report PASS/FAIL: (a) every experience title matches
CLAUDE.md; (b) every claim traces to a real source; (c) no achievement relabelled into a category it
isn't; (d) no JD buzzphrase borrowed; (e) nothing from the gap list worn as if met. Fix before saving.

STEP 4 — DO NOT SELF-GRADE COVERAGE OR HONESTY HERE
The screening gate (`/tailor-screen`, Objective 1) and the fact-check gate (`/tailor-verify`, Objective 2)
are run by the SERVER as INDEPENDENT passes — separate `claude -p` calls AFTER this draft is saved — so a
verifier never grades the same pass that wrote the draft. Do NOT run them here and do NOT emit a
self-assigned ats_score; that self-grading is exactly what they replace. Your job in this step is only to
make the independent passes' job easy: ensure every must-have you GENUINELY have is present in a standard
term, ideally in the top third (per STEP 2B), and that nothing violates the Fabrication log. The gates
will measure coverage, apply safe fixes, and set the real verdicts.

STEP 5 — QUALITY CHECKS
Quantification check, action verb check, 2-page cap. Fix and report each.

STEP 6 — SAVE
Save resume as output/resume-<slug>-<YYYYMMDD>.md
Also save the FULL resolved JD text (fetched text if the input was a URL; pasted text otherwise —
never just a URL string) as output/<slug>/jd-<YYYYMMDD>.md, header
`# JD — <jd_title> — <slug>` / `_Captured <YYYY-MM-DD>_` / blank line / JD text. Then emit
`<!-- SAVED_JD: output/<slug>/jd-<YYYYMMDD>.md -->` so the server won't overwrite it.

Output RESUME_JSON block, SAVED marker, SAVED_JD marker, DIFF_SUMMARY marker, DIFF_DATA block.
Then list gaps honestly.

If --cover-letter flag present: write ~180 words in my voice, save as
output/cover-letter-<slug>-<YYYYMMDD>.md, output SAVED_CL marker.

STEP 7 — STOP AFTER SAVE (the gates run independently, not here)
Do NOT run `/tailor-screen` or `/tailor-verify` yourself. The server runs both as separate `claude -p`
passes immediately after this draft is saved (genuine independence — a verifier must not grade its own
draft), and they apply their own safe fixes to the saved md before the downloads are built. End this
build by listing the honest gaps you already know. If you are ever invoked OUTSIDE the server (plain CLI,
no automatic gates), then and only then run `/tailor-screen <slug>` and `/tailor-verify <slug>` as the
two follow-up commands.

This runs in a non-chat UI — output is displayed, not replied to. End on the deliverables, the verify
verdict, and the honest gaps. Do NOT end by asking what to do next or offering to do more. Never end on a question.

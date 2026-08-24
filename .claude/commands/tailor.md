---
description: Tailor a full resume to a JD, quality-gate it, and produce downloadable files
---
The single resume-building command. The UI's Tailor tab calls this; the two quality gates
(`/tailor-screen`, `/tailor-verify`) are run by the SERVER as independent passes afterwards.

## SOURCES — read these, do not restate them
CLAUDE.md is the source of truth for every rule below. Read it and follow the named sections;
this file tells you the STEPS and the OUTPUT CONTRACT, not the policy.
- `## Achievement bank` + `## Snapshot` — the only facts you may use.
- `## Fabrication log` — hard bans. Never use a flagged claim, however well it fits the JD.
- `## Résumé identity lock` — the headline, the locked title, the descriptor vocabulary, the
  profile word cap, and the locked constants (13 years, the DH title, "working towards B1").
- `## Tailoring lessons` — framing rules learned from resumes actually submitted. Apply them.
  They never override the Fabrication log or the Honesty rules.
- `## Positioning`, `## Voice rules`, `## Honesty rules`, `## Status / framing`.
- `### Plain-language rule — RÉSUMÉS` — measured by `plain.js`, not eyeballed.
- `## Apply / skip filter` → `### THE TOOL NEVER BLOCKS AN APPLICATION`. Nothing here withholds
  a résumé. If asked to build, build; state risk in one line and hand over the files.

Also read:
- `resumes/resume-skeleton.md` — the locked structure and **the single source for all numbers**
  (section order, bullet density per role, length budget). Never restate those numbers from memory.
- The base résumé for the lane (see LANE below) — these are **markdown** files in `resumes/`.
- `companies/<slug>.md` if it exists — especially `## Resumes sent`.

Arguments: JD text or URL, optionally `--cover-letter`, `--research`, `--senior`, `--tpm`.
$ARGUMENTS

## LANE — pick the base résumé, then keep the headline locked to it
Route by SCOPE, not literal title, per CLAUDE.md. If `/tailor-analyse` already routed this JD,
build in THAT lane — Check Match, Tailor and Prep are ONE decision.

| Flag / routing | Base résumé | Section in CLAUDE.md |
|---|---|---|
| default, EM-lean | `resumes/resume-em.md` | `## Positioning` |
| QA / quality-titled | `resumes/resume-qa.md` | `## Positioning` |
| `--senior` | `resumes/resume-senior-em.md` | `## Senior-track framing` |
| `--tpm` | `resumes/resume-tpm.md` | `## TPM / Technical Program Manager framing` |

`--tpm` wins if both flags are present (the more specific lane the user selected).
If a flag is ABSENT but the JD clearly reads that way, add ONE line at the top of STEP 8
suggesting a re-run with that profile. A suggestion only — never switch lanes on your own.

**HEADLINE IS NOT A TAILORING SURFACE.** Take the locked headline for the lane verbatim from
`## Résumé identity lock`. The only tunable part is the three descriptors after the em-dash, and
only from that section's approved vocabulary. Never lead with a title Yash has not held.

## KNOWN FACTS — user-supplied trusted input
If $ARGUMENTS contains a block delimited by `<<<KNOWN_FACTS` and `KNOWN_FACTS` (following a
`--known-facts` flag), everything inside is asserted true by the candidate. Treat it EXACTLY like
the achievement bank: trusted, usable, NOT subject to the fabrication guard. Strip the block out
of the JD text before parsing in STEP 1.

**PERSIST THEM — MANDATORY.** The box is Yash's memory for facts the bank lacks. A fact used once
and forgotten is worse than useless: the résumé ships with it, `/tailor-verify` later flags it as
unsourced, and the next run doesn't know it either. In the SAME run, before building:
1. Write the raw block verbatim to `output/<slug>/known-facts-<YYYYMMDD>.md` with a one-line header
   naming the date and the JD. This is the provenance record `/tailor-verify` reads.
2. Append the facts to `## Achievement bank` in CLAUDE.md, phrased as facts rather than JD-shaped
   claims, each tagged `(Supplied by Yash via --known-facts, <date>.)`
3. Bank at EXACTLY the level asserted — per the Fabrication log's don't-inflate rule. "Set up the
   ticketing system" never becomes "owned support operations with SLAs".
4. Say so in STEP 8, one line: which facts were banked, so he knows they are permanent.

## HARD RULES (breaking one is a failure, not a near-miss)
1. **TITLE LOCK.** Job titles in PROFESSIONAL EXPERIENCE are fixed facts — use each exactly as
   written in CLAUDE.md. The Delivery Hero title is never adjustable. (Older titles: see
   `## Apply / skip filter` → "Older job titles are adjustable".)
2. **NO RELABELLING.** Describe each achievement as what it actually is. If the JD wants X and the
   bank says Y, say Y. Renaming Y into X is fabrication.
3. **NO UMBRELLA FROM A PART.** Name the piece the bank supports, never the umbrella.
4. **NO INVENTED SCOPE/NUMBERS.** Scope figures come from the bank verbatim.
5. **A GAP IS REPORTED, NEVER WORN.** An unmet requirement goes in STEP 8 and appears nowhere in
   the profile, competencies, bullets or skills — not via reframing, relabelling, an upgraded
   title, an umbrella metric, or a borrowed buzzphrase. Coverage score is never a reason to wear one.

FABRICATION GUARD: if you are about to use any fact not in the achievement bank or the KNOWN_FACTS
block, write `[VERIFY: your intended claim]` instead. A placeholder beats a fabrication.

---

## STEP 1 — PARSE
Strip flags and the KNOWN_FACTS block from the JD text; note which flags are present.
RESOLVE URL: if the JD argument is a URL, fetch the page and extract the full job description
text, and use that as THE JD throughout. If the fetch fails, stop and say so plainly — never
proceed with a bare URL string as the JD.
Extract: role title, company name and slug (lowercase-hyphens), role lean, seniority, location,
any language requirement, 8–10 must-have keywords, 3–4 nice-to-haves. Note today's date (YYYYMMDD).

## STEP 2 — RESEARCH (only if `--research`)
Web search "[company] engineering culture [year]" and "[company] tech blog". Note 2–3 concrete
signals to weave into tone. One short paragraph — do not pad.

## STEP 3 — PERFORMANCE CONTEXT
Read `companies/<slug>.md` → `## Resumes sent`. For each entry note date, filename, score, JD
title, outcome. Then reason explicitly in 3–5 lines:
- **Pattern:** what framing and emphasis appeared across sent résumés?
- **Signal:** which outcomes were positive, negative, still pending?
- **Implication:** a framing that worked for a similar role → reinforce it. One that failed →
  change the angle, not just the keywords. A meaningfully different JD → treat fresh. No history
  → say so and proceed fresh.

## STEP 4 — RELEVANCE & EMPHASIS PLAN (before drafting — this is the screening lever)
The résumé is read by an ATS and skimmed by a human in ~6 seconds.
- Identify the JD's TOP 3 must-haves — what the role is actually about, not every keyword.
- Map each to the strongest genuine match in the bank. Name the specific evidence.
- A top-3 must-have with no genuine match is a gap (report it; never invent emphasis for it).
- Plan the TOP THIRD to carry the relevance: the headline descriptors, the profile's first
  sentence, and the first 4–5 core competencies. Someone reading only that should think "fits".
Write these 3–5 lines, then draft.

## STEP 5 — DRAFT
Write the complete résumé following `resumes/resume-skeleton.md` — section order, bullet density
and length budget all come from that file. Lead with the STEP 4 emphasis.

**WORDING RULE.** Write as Yash, and match keywords without copycatting.
- **Mirror the JD's term when the term is TRUE.** If the JD names something he has actually done,
  use the JD's own standard term — that is how ATS matching and recruiter skimming work. See the
  mirroring entry in `## Tailoring lessons`; do not "compress to the standard term" when the JD's
  term *is* the standard term.
- **Do not mirror a phrase you can't back.** Two cases only: (a) a distinctive multi-word coinage
  used as decoration, and (b) any term naming work Yash hasn't done. Everything else, mirror freely.
- Address a requirement only where genuine matching experience exists in the base résumé, the bank,
  the known-facts files, or `companies/<slug>.md`. Unmatched requirements are gaps, never phrases
  to paste in.

**PLAIN-LANGUAGE RULE.** Follow `### Plain-language rule — RÉSUMÉS` in CLAUDE.md. It changes
sentence SHAPE, not vocabulary — never drop a real term to sound plainer, and never keep a fancy
sentence to hold a term.

**BANK COVERAGE.** Before finalising, scan the WHOLE achievement bank and include every item
genuinely relevant to this JD. Do not silently drop a relevant achievement to save space — if the
length budget forces a cut, name exactly what was cut and why in STEP 8.

Do NOT print the résumé in your response prose. It is saved to file and read by the UI.

## STEP 6 — MEASURE, THEN SAVE
1. Save the résumé to `output/resume-<slug>-<YYYYMMDD>.md`.
2. Run `node plain.js output/resume-<slug>-<YYYYMMDD>.md`. Rewrite every flagged line until the
   score is ≥ 80 (verdict PLAIN). Rewrite — never delete a fact or a standard term to raise the
   score. Report the before/after score.
3. Quantification check (flag current-role bullets with no metric; add one from the bank if
   available), action-verb check (rewrite "responsible for / worked on / helped / assisted /
   involved in / supported"), and the length budget from the skeleton. Report each.
4. HONESTY SELF-AUDIT — report PASS/FAIL on each: (a) every experience title matches CLAUDE.md;
   (b) every claim traces to a bank / base-CV / known-facts line; (c) nothing relabelled;
   (d) no unbackable JD phrase borrowed; (e) nothing from the gap list worn as if met.
   Fix before saving. This is a self-check, not a gate — the real gates run independently.
5. Save the FULL resolved JD text (fetched text if the input was a URL; pasted text otherwise —
   never a bare URL string) to `output/<slug>/jd-<YYYYMMDD>.md` with the header
   `# JD — <jd_title> — <slug>` / `_Captured <YYYY-MM-DD>_` / blank line / JD text.

**DO NOT SELF-GRADE COVERAGE.** `/tailor-screen` (will it get found) and `/tailor-verify` (is it
defensible) are run by the SERVER as separate `claude -p` passes after this draft is saved, so a
verifier never grades the pass that wrote the draft. Do not run them here and do not invent a
coverage percentage. Your job is to make their work easy: every must-have Yash genuinely has is
present in a standard term, ideally in the top third, and nothing violates the Fabrication log.

## STEP 7 — OUTPUT CONTRACT (the server parses these exactly — do not alter the shapes)

```
<!-- SAVED: output/resume-<slug>-<YYYYMMDD>.md -->
<!-- SAVED_JD: output/<slug>/jd-<YYYYMMDD>.md -->
<!-- DIFF_SUMMARY: added=N modified=M removed=P -->
```
`added`/`modified`/`removed` are actual bullet counts vs the base résumé.

<!-- RESUME_JSON
{
  "slug": "<slug>",
  "date": "<YYYYMMDD>",
  "jd_title": "<role title from JD>",
  "jd_text": "<first 800 characters of the JD text, cleaned of newlines>",
  "filename": "resume-<slug>-<YYYYMMDD>",
  "sections": {
    "name": "<candidate name, with degrees, from CLAUDE.md>",
    "contact": "<full contact line from CLAUDE.md>",
    "title": "<locked lane headline, descriptors tuned>",
    "profile": "<profile paragraph as a single string>",
    "competencies": ["<label>", "<label>"],
    "experience": [
      { "role": "<title>", "company": "<company>", "period": "<dates>",
        "location": "<location>", "bullets": ["<bullet>", "<bullet>"] }
    ],
    "education": [ { "degree": "<degree>", "institution": "<institution>", "period": "<period>" } ],
    "technical_skills": { "<Category>": "<comma-separated tools>" },
    "languages_recognition": "<full text of this section>"
  }
}
-->

Note: there is no `ats_score` field. The server computes the keyword score deterministically
(`ats.js`) and the screen gate reports the screening score — both replace the old self-grade.

Use the technical-skills categories the lane's base résumé uses. For `--tpm` these are the
programme-oriented ones in `resume-tpm.md` (Programme & Delivery, Data & Metrics, Tooling,
Technical Breadth) — do not emit Test Automation / Device & Compatibility for that lane.

Then, best effort:
<!-- DIFF_DATA
{
  "modified_bullets": ["<first 35 chars of each>"],
  "added_bullets": ["<first 35 chars of each>"],
  "removed_bullets": ["<first 35 chars of each>"]
}
-->

## STEP 8 — GAPS AND NOTES
List JD requirements not clearly met — honest, not encouraging. Flag explicitly if the JD requires
a language proficiency Yash lacks, stating his real level per CLAUDE.md.
Add, where they apply: the one-line lane suggestion (LANE above), the banked known-facts line
(KNOWN FACTS step 4), and anything the length budget forced you to cut.

## STEP 9 — COVER LETTER (only if `--cover-letter`)
~180 words in Yash's voice, per `## Voice rules` and the don't-sound-AI-written rule. One specific
true reason for this company. Follow `## Status / framing` on employment status and notice period.
Save to `output/cover-letter-<slug>-<YYYYMMDD>.md` and emit:
`<!-- SAVED_CL: output/cover-letter-<slug>-<YYYYMMDD>.md -->`

---
This runs in a non-chat UI — output is displayed, not replied to. End on the deliverables and the
honest gaps, as statements. If `companies/<slug>.md` exists, note in one line that `/prep` is ready
in the Prep tab. Never end on a question.

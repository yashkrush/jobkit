---
description: Screening-readiness gate for a tailored resume — measures whether it will get past ATS + a 6-second recruiter skim (Objective 1), deterministically, before it ships
---
You measure SCREENING-READINESS — Objective 1: will this resume get screened in? This is separate from
and runs BEFORE `/tailor-verify` (Objective 2: is every line defensible). A resume must clear BOTH.
Measure; do not assert. "Looks well-matched" is exactly the self-grading that has been failing.

INPUT (slug, or a path to a resume .md):
$ARGUMENTS

RESOLVE TARGET: same rules as tailor-verify — a `.md` path, else the most recent
`output/resume-<slug>-*.md` / `output/<slug>/resume-*.md`. State which file. Load the captured JD
(`output/<slug>/jd-*.md`) and CLAUDE.md (`## Achievement bank`, `## Fabrication log`).

STEP 1 — EXTRACT JD MUST-HAVES (split into two buckets — this split is the whole point)
From the JD, list the ~15-20 keywords/phrases a recruiter or ATS would search on. Classify EACH:
- **ACHIEVABLE** — a thing the candidate genuinely has per the bank/base resume (the screening lever we control).
- **DOMAIN-GAP** — a role/industry-specific term the candidate genuinely lacks (e.g. KYC, eIDAS, a named domain).
  These CANNOT be honestly added — do not invent emphasis for them. They define the ceiling, not a fix.

STEP 2 — MEASURE COVERAGE (deterministic — actually search the file, e.g. grep -ic per keyword)
For each ACHIEVABLE keyword report: present? (count), in the TOP THIRD? (title line + Profile + Core
Competencies — where a 6-second skim and ATS weighting land), expressed as the STANDARD term a recruiter
searches (not buried in a paraphrase). A keyword absent, or present only deep in the body, scores partial.
For each DOMAIN-GAP keyword: just confirm it's absent (it should be) — its absence is honest, not a defect.

STEP 3 — SCORE & DIAGNOSE
- SCREENING SCORE = share of ACHIEVABLE must-haves covered, weighting top-third placement. Report the number.
- ACHIEVABLE MISSES = achievable keywords missing or buried → these are FIXES (add the standard term where
  it's genuinely true, ideally in the top third). List each with the concrete line to add/change.
- TITLE-LINE MATCH = does the headline signal the JD's role title in standard terms? (ATS often weights it.)
- DOMAIN-GAP CEILING = how many role-defining keywords are unfakeable zeros. If the role is DEFINED by a
  domain the candidate lacks (many role-specific zeros), say so plainly: screening risk is high regardless of how
  good the transferable match is, and this is an apply/skip signal, not something the resume can fix.

STEP 4 — VERDICT
- READY — achievable coverage high, key terms in top third, title matches, few/no domain zeros.
- FIX — achievable misses exist that can be honestly added; list them (this is the actionable win).
- SCREEN-RISK — achievable coverage is good but the role is domain-defined by gaps the candidate lacks; flag honestly
  and route to the cover letter (where "appetite to learn" can reach a human) + reconsider apply/skip.
Apply the FIX-bucket changes you safely can (add the genuine standard term, prefer the top third), re-measure,
and report the before/after score.

OUTPUT: coverage table (achievable: present/top-third/standard; domain-gap: absent ✓), score, the
fix list, title-match, the domain ceiling, the verdict. Write the report to
`output/<slug>/screen-<YYYYMMDD>.md`. As the VERY LAST line emit exactly:
`<!-- SCREEN: verdict=<READY|FIX|SCREEN-RISK> score=<int 0-100> achievable_misses=<n> domain_zeros=<n> -->`

This runs in a non-chat UI — output is displayed, not replied to. End on the verdict and the fix list.
Never invent a keyword the candidate lacks to raise the score — a domain zero stays a zero (and the Fabrication log
still binds). Do NOT end on a question.

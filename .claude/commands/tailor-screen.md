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
- TITLE-LINE MATCH = do the headline DESCRIPTORS signal the JD's role in standard terms? Per CLAUDE.md
  `## Résumé identity` the title stays in Yash's own family; never propose pasting in the JD's title.
  A headline that is visibly the JD's own title is a FIX (move the fit into the descriptors).
- DOMAIN-GAP CEILING = how many role-defining keywords are unfakeable zeros. If the role is DEFINED by a
  domain the candidate lacks (many role-specific zeros), say so plainly: screening risk is high regardless of how
  good the transferable match is, and this is an apply/skip signal, not something the resume can fix.

STEP 3b — TITLE CREDIBILITY (added 2026-08-23 — the blind spot keyword coverage can't see)
Keyword coverage alone could not see why applications died. Vinted scored **READY / 90** and was rejected
at screening; Mapbox scored 91 and was rejected at screening. High coverage, wrong instrument. What the
score missed: a recruiter's first filter on a titled req is *"has this person plausibly held this kind of
role?"* — and no amount of keyword density answers it.

Measure and report, in one short block:
- **Lane conversion — read the figures from CLAUDE.md `## Apply/skip lessons` → LANE CONVERSION DATA
  (the canonical record; do not quote them from memory, they change as outcomes land).** State which
  lane this JD sits in and that lane's historical rate. This is the single most predictive number
  available — put it in the report.
- **Headline title family:** is the headline title in Yash's own family (`## Résumé identity`)? If
  not, that's a FIX, with the lane figure quoted once.
- **Seniority distance:** the JD's level vs. Yash's real scope (direct reports per `## Résumé
  identity` → Direct reports; standards reach and delivery support per the achievement bank). Note when the JD wants larger direct
  headcount — the N26 rejection reason.
- **Run `node consistency.js <target> <slug>`** and fold its verdict in — it reports whether this résumé
  reads like the same person as everything already sent, especially to a company applied to before.

Report as **TITLE CREDIBILITY: STRONG | STRETCH | THIN**, with the one-line reason and the lane number.
This is **information for Yash's decision, never a stop** — see "THE TOOL NEVER BLOCKS AN APPLICATION" in
CLAUDE.md. THIN means "these are the odds", not "don't apply", and it never suppresses the résumé build.

STEP 3c — RECRUITER CHECKLIST (added 2026-10-10 — keyword coverage said READY on CVs that were rejected)
Per CLAUDE.md `## Screening checklist`: list the JD's hard requirements in its own words (years in
engineering, years leading people, team size, scope, domain, stack, language, location/work
authorisation). For each one, report TICKED-TOP (answered in its unit in the top half of page 1),
TICKED-DEEP (answered, but only further down: move it up), or GAP. Also check that `German Permanent
Resident` is on the contact line, and (EM lane) rule 6: the first four DH bullets are people/delivery
and at most 3 are quality-led. Each TICKED-DEEP item, and each answerable item left unanswered, is a
FIX. Report as `CHECKLIST: <ticked-top>/<total>` and include it in the output.

STEP 4 — VERDICT
- READY — achievable coverage high, key terms in top third, title matches, few/no domain zeros.
- FIX — achievable misses exist that can be honestly added; list them (this is the actionable win).
- SCREEN-RISK — achievable coverage is good but the role is domain-defined by gaps the candidate lacks; flag honestly
  and route to the cover letter (where "appetite to learn" can reach a human) + reconsider apply/skip.
Do NOT edit the résumé file. List each FIX as a concrete line Yash can paste in; the résumé he reviewed
is the résumé he sends.

OUTPUT: coverage table (achievable: present/top-third/standard; domain-gap: absent ✓), score, the
fix list, title-match, **title credibility + lane conversion rate**, the domain ceiling, the verdict.
Write the report to `output/<slug>/screen-<YYYYMMDD>.md`. As the VERY LAST line emit exactly:
`<!-- SCREEN: verdict=<READY|FIX|SCREEN-RISK> score=<int 0-100> achievable_misses=<n> domain_zeros=<n> title_credibility=<STRONG|STRETCH|THIN> -->`

NEVER A BLOCKER. This gate measures and reports; it does not decide whether Yash applies. No verdict
here — not SCREEN-RISK, not THIN title credibility, not a poor lane rate — suppresses the résumé or
withholds the files. Report the odds in one line, hand over the work, and let him choose.

This runs in a non-chat UI — output is displayed, not replied to. End on the verdict and the fix list.
Never invent a keyword the candidate lacks to raise the score — a domain zero stays a zero (and the Fabrication log
still binds). Do NOT end on a question.

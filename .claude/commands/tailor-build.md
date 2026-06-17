---
description: Step 2 of tailor — build full tailored resume after APPLY verdict
---
Use CLAUDE.md. Read companies/<slug>.md if it exists — especially the Resumes sent
and Fabrication log sections. Read the matching resume PDF from resumes/.

JD (text or URL, optionally --cover-letter --research flags):
$ARGUMENTS

Assume fit has already been confirmed. Do NOT re-run the fit verdict.

FABRICATION GUARD: Read ## Fabrication log in CLAUDE.md. Never use flagged claims.
For any fact not in the achievement bank, write [VERIFY: claim] instead.

STEP 1 — RESEARCH (only if --research flag present)
Web search company engineering culture. Note 2-3 signals. One paragraph only.

STEP 2 — RESUME PERFORMANCE CONTEXT
Read companies/<slug>.md ## Resumes sent. Reason about what framing worked,
what to change. Write 3-5 lines before drafting.

STEP 3 — DRAFT FULL RESUME
Write complete resume per the structure in CLAUDE.md. All sections.
Do NOT print it in response prose — it is saved via RESUME_JSON and read from
file by the UI.

WORDING RULE (governs the whole draft): Map my real experience onto what the JD asks for, in MY OWN
words. Do NOT reuse the JD's phrasing, nouns, or sentence shapes — echoing the JD reads as
keyword-stuffing and is a failure. Address a requirement only when I have genuine matching experience
in the base resume, the achievement bank, or companies/<slug>.md, described in my own terminology.
Never invent experience, tools, titles, or metrics not in those sources. Unmatched requirements are
gaps to report, never phrases to paste in.

STEP 4 — COVERAGE CHECK (concepts, not verbatim keywords)
List the 8-10 must-have requirements as concepts, not the JD's exact phrases. For each, check whether
the resume demonstrates that capability through my real experience, in my own words (covered / partial
/ gap). Do NOT insert the JD's phrasing to raise the score; own-words coverage counts. Surface only
capabilities I genuinely have. Set ats_score to the share of requirements genuinely demonstrated.
Report: Coverage: ~X% — and treat anything not honestly coverable as a gap, not phrasing to fix.

STEP 5 — QUALITY CHECKS
Quantification check, action verb check, 2-page cap. Fix and report each.

STEP 6 — SAVE
Save resume as output/resume-<slug>-<YYYYMMDD>.md

Output RESUME_JSON block, SAVED marker, DIFF_SUMMARY marker, DIFF_DATA block.
Then list gaps honestly.

If --cover-letter flag present: write ~180 words in my voice, save as
output/cover-letter-<slug>-<YYYYMMDD>.md, output SAVED_CL marker.

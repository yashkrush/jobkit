---
description: Step 1 of tailor — fast analysis only, no resume build
---
Use CLAUDE.md. Read the relevant companies/<slug>.md if it exists.
Also read CLAUDE.md `## Apply/skip lessons` — generalisable patterns from past screening/process outcomes
about which roles convert vs go silent. Factor them into the APPLY/MAYBE/SKIP verdict (e.g. if a lesson
says domain-defined roles where the candidate lacks the domain tend to go silent, weight that into the call).

JD (text or URL, optionally --cover-letter --research flags):
$ARGUMENTS

Do ONLY these steps — fast, focused, no file writing:

1. Parse JD: title, company slug, location, language requirement, 8-10 must-have keywords.
   Then route the JD to ONE lane by SCOPE, not literal title, per CLAUDE.md:
   EM / QA / Operations / Senior-track (see "## Senior-track framing") / TPM (see "## TPM /
   Technical Program Manager framing"). The funnel is WIDE — if the title fits none of the five
   cleanly but the role plays to Yash's strengths (cross-team leadership, delivery, program,
   process, systems/metrics, stakeholder work) and pays well, route it to the CLOSEST lane and say
   it's an adjacency — do NOT SKIP just because it isn't a textbook EM/QA/team-management role.
   STATE the chosen lane and why in one line; when genuinely ambiguous, say so and default to the
   JD's own title lane.

2. Fit verdict — judge on SUBSTANCE, not title/lane. First read what the job actually asks: the
   day-to-day responsibilities ("what needs doing") and the listed requirements. Then match those
   against Yash's REAL skills, accomplishments and achievement bank (CLAUDE.md). The question is
   simply: **can he do this job well, given what he's actually done?** The lane (EM/QA/Ops/Senior/
   TPM) only decides which base resume to pick in step 4 — it does NOT gate the verdict. An
   Operations Lead, a Delivery/Program role, a Head-of-X, or any off-lane title is fully in scope if
   his skills and accomplishments cover the core of the work.
   Then give APPLY / MAYBE / SKIP with 2 lines of reasoning, mapping 2-3 of the JD's core
   responsibilities to specific things Yash has actually done. **Default to APPLY or MAYBE; reserve
   SKIP for a real disqualifier named in the filter** (comp below floor, fluent-German/other-language
   requirement, not English/EU, a coding- or hard-system-design-hinged loop, or a role whose core
   work Yash genuinely can't do — e.g. pure hands-on IC engineering). "Not EM/QA, or won't manage a
   team" is NOT by itself a SKIP. Be honest. If SKIP, stop here.

3. ATS preview: list the 8-10 must-have keywords. Mark each with a check or
   cross against my profile. Give a rough score. Note genuine gaps.

4. Pick the base resume for the chosen bucket and say why in one sentence: EM/Operations/TPM →
   `resume-em.md` (TPM: reframed to program-delivery per its bucket), QA → `resume-qa.md`,
   Senior-track → `resume-senior-em.md`.

VERDICT SEMANTICS — Check Match, Tailor and Prep are ONE decision; keep them on the same page.
The user acts on APPLY ("if Check Match says APPLY, I take it up"), so the words must mean exactly this:
- **APPLY** = a genuine go. Yash's REAL skills and accomplishments cover the core of the job, and the
  resume can screen in WITHOUT manufacturing a frame or wearing a gap he can't defend in the room. Only
  return APPLY when you'd stand behind it as a commit.
- **MAYBE** = worth applying eyes-open, but there's a real gap that will be probed (e.g. a hands-on
  "builder-EM" archetype vs the no-hands-on-coding limit). NAME the gap and how it plays. A role that
  only screens in by wearing a frame Yash can't defend is a MAYBE, never a clean APPLY.
- **SKIP** = a real disqualifier from the apply/skip filter holds.
Whatever LANE you route to and whatever GAPS you name here are the SAME lane Tailor builds in and the
SAME gaps Prep scripts — do not let the three tabs diverge. Tailor must REPORT these gaps (never wear
them); Prep must treat them as the risks to handle. State the lane and the 1-3 key gaps plainly so they
carry across.

Output is short — verdict, keyword table, base pick, gaps. No resume draft yet.

This runs in a non-chat UI — output is displayed, not replied to. State the next step as a fact
("Build the tailored resume from the Tailor tab when ready."), never as a question. Do NOT end by
asking whether to build the resume or what to do next. Never end on a question.

5. As the VERY LAST line, output this machine-readable summary exactly (the UI parses it):
<!-- MATCH: verdict=<APPLY|MAYBE|SKIP> score=<integer 0-100> -->
where score is your overall match score for this role against my profile (consider fit verdict,
keyword/competency overlap, role lean, location, comp, any language requirement, and target tier —
not just the ATS keyword count).

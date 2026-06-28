---
description: Learn from an application's OUTCOME/feedback and route generalisable lessons to the right consumer (tailor / prep / apply-skip)
---
This closes the loop the submission-time learning can't: it runs when an OUTCOME or FEEDBACK has landed
(screened in, silent, rejected, recruiter/interviewer feedback) — long after the resume was submitted —
and turns that real result into generalisable lessons, each ROUTED to the command that will act on it.

INPUT (company slug, optionally followed by the new outcome/feedback text):
$ARGUMENTS

READ:
- companies/<slug>.md — the full `## Process log`, `## Resumes sent` (Outcome fields), any feedback notes,
  stage. This is the outcome record.
- The submitted resume in output/<slug>/ (extracted .md preferred) and the JD (output/<slug>/jd-*.md) —
  so a lesson can reference what framing/positioning actually produced this outcome.
- CLAUDE.md — `## Tailoring lessons`, `## Interview lessons`, `## Apply/skip lessons` (don't duplicate an
  existing lesson), and the Honesty rules / Fabrication log (a lesson may NEVER suggest anything that
  violates them).

CLASSIFY the outcome, then derive lessons and ROUTE each to exactly one bucket by its consumer:
- **interview_lessons** → CLAUDE.md `## Interview lessons`, read by /prep. For feedback about how the candidate
  came across IN the room — delivery, narrative/concision, which stories landed or didn't, depth, a
  recurring weak spot. (e.g. Paymenttools "be more concise / chunk the narrative".)
- **tailoring_lessons** → `## Tailoring lessons`, read by /tailor. For what on the RESUME/positioning
  helped or hurt getting screened in — emphasis, keyword coverage, section order, framing angle.
- **apply_skip_lessons** → `## Apply/skip lessons`, read by /tailor-analyse. For PATTERNS about which
  kinds of roles convert vs go silent — to sharpen the APPLY/MAYBE/SKIP call.

RULES:
- Each lesson is ONE concise, reusable imperative + a `**Source:** <slug> <outcome>, <date>` tag.
- Generalisable, not a narration of this one case. But do NOT over-generalise from a single weak signal:
  silence from ONE company is not a pattern. Mark anything inferred from thin evidence as
  `(low-confidence — confirm as more outcomes land)`. A NAMED piece of feedback (e.g. an interviewer's
  stated reason) is high-confidence even from one case.
- Never propose a lesson that conflicts with the Honesty rules / Fabrication log.
- If the outcome carries no generalisable signal (e.g. "closed — filled internally"), return empty arrays
  and say so plainly — don't manufacture a lesson.

OUTPUT: a short human summary (what outcome, what you concluded), then the machine-readable block on the
final lines (the server parses it for the approval UI), raw JSON, no fences:
{"interview_lessons":[...],"tailoring_lessons":[...],"apply_skip_lessons":[...]}

This runs in a non-chat UI — output is displayed, not replied to. End on the proposed lessons. Do NOT end
by asking what to do next. Never end on a question.

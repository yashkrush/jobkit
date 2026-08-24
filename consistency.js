// Deterministic cross-application consistency gate — measures whether a new tailored
// resume portrays the SAME PERSON as everything already sent out.
//
// Third companion to ats.js and plain.js. ats.js measures whether a resume gets FOUND;
// plain.js measures whether it reads like a person wrote it; this measures whether it
// reads like the SAME person. That axis had no check at all: /tailor-verify grounds
// claims against the achievement bank, /tailor-screen measures them against the JD, and
// neither ever looks at what was previously SENT.
//
// The gap this closes (2026-08-23): the SumUp re-tailor. SumUp already held a resume
// from June describing a migrations-and-architecture Engineering Manager. The August
// re-tailor for a different req described an operations-and-customer-support leader with
// a support/ticketing/chatbot history the June version never mentioned. verify caught it
// only because those facts weren't in the bank — had they been banked, it would have
// shipped, and one recruiter would hold two documents describing two different careers.
//
// ADVISORY, NEVER A BLOCKER (design rule, set by Yash 2026-08-23).
// This tool does not stop an application and has no power to. It always exits 0. It tells
// you what a recruiter holding your other documents would notice, and you decide. A gate
// that stops him applying to a job he could do costs him more than any inconsistency —
// the tool is meant to be an edge no other candidate has, not a bureaucracy he has to
// argue with. Severities are information about odds and exposure, not permission:
//   RISK — a specific person can see a contradiction (this employer already holds a
//          document that says otherwise). The only severity about honesty.
//   ODDS — measured to lower screening odds. Reports the outcome data, not a rule.
//   NOTE — drift worth knowing about. Frequently fine to ship.
//
// Deterministic on purpose: an LLM asked "do these describe the same person?" says yes
// to almost anything, because every line is individually true. Drift is a property of
// the SET, not of any one line, so it has to be measured mechanically.

const fs = require('fs');
const path = require('path');

// --- Locked identity (mirrors "## Résumé identity lock" in CLAUDE.md) ----------------

// The headline title before the em-dash. Nothing else may lead a resume.
const ALLOWED_TITLES = ['Engineering Manager', 'Quality Engineering Manager'];

// Titles Yash has never held. Seen as headlines on Vinted, Neara and Micro1 — all three
// converted to nothing. Matched at the head of the headline only, so an honest body
// phrase like "partnered with the Program Manager" is untouched.
//
// These are ODDS, not bans. Substance decides whether to apply — if Yash can do what the
// JD describes, he applies, whatever the title. This list only reports that leading with
// a title he has not held measured 0-for-3 at screening, so he can choose knowingly.
const UNHELD_TITLES = [
  'technical program manager', 'senior technical program manager', 'program manager',
  'project manager', 'senior project manager', 'strategic project', 'delivery lead',
  'pmo lead', 'release manager', 'portfolio release manager', 'senior manager',
  'director', 'head of', 'software engineering manager', 'engineering leader',
  'principal', 'staff engineer', 'vp ', 'vice president',
];

// Fields that must read identically on every document that leaves the house. A recruiter
// comparing two resumes reads a changed constant as a corrected lie, not as tailoring.
//
// Deliberately NOT locked: the MayTek and Atomants titles. Yash's call (2026-08-23) —
// older titles can be presented at their functional equivalent, and nobody is going to
// audit a 2013 consultancy title. Only the Delivery Hero title is fixed, because it is
// current, on LinkedIn, and checkable by any recruiter in ten seconds.
const LOCKED = [
  {
    field: 'years of experience',
    // Captures the number attached to a years-of-experience claim.
    find: /(\d{1,2})\+?\s*years?(?:['’]|\s+of)?\s+(?:of\s+)?(?:experience|leading|in\s+engineering)/i,
    expect: '13',
    norm: m => m[1],
    why: 'Experience is 13 years (fabrication log, corrected 2026-06-28). "12+" shipped on Mozilla, PulsePoint and checkmk.',
  },
  {
    field: 'Delivery Hero job title',
    find: /^[#*\s]*([A-Za-z][^·|\n]*?)\s*[·|]\s*Delivery Hero|^([A-Za-z][^\n]*?)\n+Delivery Hero SE/im,
    expect: 'engineering manager',
    norm: m => (m[1] || m[2] || '').toLowerCase().trim(),
    match: (got, expect) => got.includes(expect),
    why: 'The DH title is a fixed fact: "Engineering Manager / Quality Engineering Manager". Never restyled to the JD.',
  },
  {
    field: 'German level',
    find: /German\s*\(([^)]+)\)/i,
    expect: 'working towards b1',
    norm: m => m[1].toLowerCase().trim(),
    why: 'Yash is not yet B1. Always "working towards B1"; never a bare "B1", never the exam date.',
  },
];

// --- Parsing -------------------------------------------------------------------------

// Pull the headline: the first non-empty line after the name that isn't contact details.
// Handles both shapes in output/ — markdown drafts ("# Yash Kulshreshtha, B.Tech, MSc")
// and mammoth-extracted submissions, where the name is a bare unmarked first line.
function headline(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (const l of lines.slice(0, 8)) {
    const clean = l.replace(/^[#*_\s]+|[#*_\s]+$/g, '');
    if (/^yash\b|^kulshreshtha\b/i.test(clean)) continue;    // name line, marked or bare
    if (/@|\+49|linkedin|^berlin\b|permanent resident/i.test(clean)) continue; // contact line
    if (clean.length > 8) return clean;
  }
  return '';
}

// The identity claim = the title before the first separator in the headline. Submitted
// resumes use a spaced hyphen ("ENGINEERING MANAGER - TEAM LEADERSHIP, …") where drafts
// use an em-dash, so both count as separators. Case is normalised for comparison, since
// the extracted submissions come back upper-cased.
function claimedTitle(text) {
  const h = headline(text);
  const head = h.split(/\s[—–-]\s|[—–|]/)[0].replace(/[·,].*$/, '').trim();
  return head.replace(/\s+/g, ' ');
}

// Compare identities case-insensitively — "ENGINEERING MANAGER" and "Engineering Manager"
// are the same claim, and mammoth returns whatever case the DOCX used.
const sameTitle = (a, b) => a.toLowerCase() === b.toLowerCase();

// Same ROLE FAMILY? "Software Engineering Manager", "Engineering Manager" and "Quality
// Engineering Manager" all say "I manage engineers" — a recruiter reading both sees one
// person, not two. Only a jump across families ("Engineering Manager" → "Project Manager")
// is a real identity change. Without this, trivial wording differences drown the signal.
const FAMILY = [
  [/engineering manager|engineering lead|head of engineering|director of engineering/, 'eng-management'],
  [/qa|quality/, 'quality'],
  [/program manager|programme manager|project manager|delivery lead|pmo|release manager/, 'program-delivery'],
  [/product manager/, 'product'],
];
const family = t => (FAMILY.find(([re]) => re.test(t.toLowerCase())) || [null, 'other'])[1];

// Content words from the profile paragraph — the "who am I" section a recruiter reads
// first and the place drift shows up soonest.
const STOP = new Set(('a an the and or of to in for with on at by as is are was were be been ' +
  'that this it its from into across over under between through their his her they them ' +
  'he she we i my our years year experience including while so most both each per also ' +
  'more than who whom which what when where how all any some other another same such').split(' '));

function profileTerms(text) {
  const m = text.match(/##\s*Profile\s*\n+([\s\S]*?)(?=\n##\s|\n\*\*|$)/i);
  const body = m ? m[1] : text.split('\n').slice(0, 14).join(' ');
  return new Set((body.toLowerCase().match(/[a-z][a-z-]{3,}/g) || []).filter(w => !STOP.has(w)));
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

// Employer-level factual claims, keyed by employer. Two resumes claiming different
// histories at the SAME past employer is the single loudest "different person" signal —
// it is what the SumUp re-tailor did to MayTek and Atomants.
const EMPLOYERS = ['delivery hero', 'maytek', 'atomants'];

// Domain nouns that assert what kind of work someone did. A new one appearing at an old
// employer means a career was rewritten, not a sentence.
const DOMAIN_TERMS = [
  'customer support', 'ticketing', 'chatbot', 'chatbots', 'help desk', 'helpdesk',
  'service desk', 'csat', 'sla', 'call centre', 'call center', 'escalation',
  'payments', 'checkout', 'kyc', 'kyb', 'fraud', 'compliance', 'regulatory',
  'geospatial', 'navigation', 'mapping', 'marketplace', 'logistics', 'recruitment',
  'conversation design', 'content quality', 'self-service', 'deflection',
];

// Is a term already grounded in the achievement bank / known-facts files? If it is, a new
// mention of it is EMPHASIS, not invention — people legitimately surface different true
// history for different roles. Only ungrounded new history is a credibility exposure.
// (Added 2026-08-23: the first version accused the SumUp customer-support facts of being
// fabricated when Yash had supplied them himself via the known-facts box.)
let _groundedCache = null;
function groundedTerms(outputDir) {
  if (_groundedCache) return _groundedCache;
  let corpus = '';
  try { corpus += fs.readFileSync(path.join(path.dirname(outputDir), 'CLAUDE.md'), 'utf8'); } catch {}
  try { corpus += fs.readFileSync('CLAUDE.md', 'utf8'); } catch {}
  let dirs = [];
  try { dirs = fs.readdirSync(outputDir, { withFileTypes: true }); } catch {}
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    let files = [];
    try { files = fs.readdirSync(path.join(outputDir, d.name)); } catch { continue; }
    for (const f of files) {
      if (!/^known-facts.*\.md$/i.test(f)) continue;
      try { corpus += fs.readFileSync(path.join(outputDir, d.name, f), 'utf8'); } catch {}
    }
  }
  _groundedCache = corpus.toLowerCase();
  return _groundedCache;
}


// Scope numbers — the claims a careful reader actually compares between two of your
// résumés. Added 2026-08-24 after the idealo check: the July submission said "17+ product
// teams … impacting outside teams across the tribe" and the new one said "17 product teams
// … impacting 30+ teams in the department". Both grounded, but the gate reported CONSISTENT
// because it only looked at the headline, the profile overlap and three locked constants.
// A number that moves between applications is exactly what makes someone look unreliable.
const SCOPE_UNITS = [
  'product teams', 'feature teams', 'teams', 'services', 'squads', 'markets',
  'international clients', 'clients', 'engineers', 'QA engineers', 'direct reports', 'markets worldwide',
];
// Filler words that sit between the number and the unit — "5+ FURTHER feature teams",
// "16 MANUAL QA engineers", "10+ SQUADS". Without these the capture silently misses the
// claim, and a missing baseline means the drift check quietly passes (found by a negative
// test on 2026-08-24: renaming "5+ feature teams" to "9+" raised nothing, because the
// July résumé said "5+ further feature teams" and never registered).
const FILLER = '(?:further|additional|more|other|separate|global|internal|manual|product|cross-functional|engineering)';
// Longest-first so "product teams" wins over "teams".
const UNIT_RE = new RegExp(
  '([~≈]?\\d{1,3}\\+?)\\s+(?:' + FILLER + '\\s+){0,2}(' +
  SCOPE_UNITS.slice().sort((a, b) => b.length - a.length).join('|') + ')\\b', 'gi');

function scopeClaims(text) {
  // Drop the contact line — a phone number is not a scope claim (the "+49 …" contact line).
  const body = text.split('\n').filter(l => !/@|\+49|linkedin/i.test(l)).join('\n');
  const out = new Map();
  let m;
  UNIT_RE.lastIndex = 0;
  while ((m = UNIT_RE.exec(body)) !== null) {
    const unit = m[2].toLowerCase();
    const val = m[1].replace(/[~≈]/g, '');
    if (!out.has(unit)) out.set(unit, new Set());
    out.get(unit).add(val);
  }
  return out;
}

function employerClaims(text) {
  const lower = text.toLowerCase();
  const out = {};
  const bounds = [];
  for (const e of EMPLOYERS) {
    const i = lower.indexOf(e);
    if (i >= 0) bounds.push({ employer: e, i });
  }
  bounds.sort((a, b) => a.i - b.i);
  bounds.forEach((b, n) => {
    const end = n + 1 < bounds.length ? bounds[n + 1].i : lower.length;
    const section = lower.slice(b.i, end);
    out[b.employer] = new Set(DOMAIN_TERMS.filter(t => section.includes(t)));
  });
  return out;
}

// --- Prior submissions ----------------------------------------------------------------

// A résumé counts as SENT if it sits in output/<company>/ and is NOT something this tool
// generated. Identify it by EXCLUSION, mirroring server.js's own upload logic — an earlier
// version whitelisted specific filenames (`Resumes_Yash.md`, `Yash-Resume.md`, …) and silently
// missed NINE real submissions across the repo, because Yash names his exports whatever
// Google Docs gives him: `Yash_resume.md`, `Yash_Kulshreshtha_Resume.md`, `Yash_K_HiveMQ.md`,
// `resume.md`. A missed baseline is worse than no check — it reports CONSISTENT after
// comparing against nothing. Never whitelist filenames here.
const GENERATED = /^(_draft|jd-|screen-|verify-|cover-letter-|pending-lessons|prep-|known-facts-|SUPERSEDED-)/i;
const DATED_DRAFT = /^resume-.+-\d{6,8}\.md$/i;
const isSent = f => f.endsWith('.md') && !GENERATED.test(f) && !DATED_DRAFT.test(f);

function priorSubmissions(outputDir, excludeFile) {
  const found = [];
  let companies = [];
  try { companies = fs.readdirSync(outputDir, { withFileTypes: true }); } catch { return found; }
  for (const d of companies) {
    if (!d.isDirectory() || d.name.startsWith('_')) continue;
    let files = [];
    try { files = fs.readdirSync(path.join(outputDir, d.name)); } catch { continue; }
    for (const f of files) {
      if (!isSent(f)) continue;
      const full = path.join(outputDir, d.name, f);
      if (excludeFile && path.resolve(full) === path.resolve(excludeFile)) continue;
      found.push({ company: d.name, file: full, text: fs.readFileSync(full, 'utf8') });
    }
  }
  return found;
}

// --- The gate -------------------------------------------------------------------------

function checkConsistency(text, { company, outputDir = 'output', file = null } = {}) {
  const findings = [];
  const prior = priorSubmissions(outputDir, file);
  const mine = prior.filter(p => company && p.company.toLowerCase() === company.toLowerCase());

  const title = claimedTitle(text);
  const head = headline(text);

  // 1. Locked headline title.
  const titleOk = ALLOWED_TITLES.some(t => title.toLowerCase() === t.toLowerCase());
  const unheld = UNHELD_TITLES.find(b => title.toLowerCase().startsWith(b));
  if (unheld) {
    findings.push({
      sev: 'ODDS', rule: 'UNHELD_TITLE',
      what: `Headline leads with "${title}", a title not held.`,
      why: 'Measured: the three résumés that led with a never-held title (Vinted, Neara, Micro1) produced 0 interviews. The seven led by "Engineering Manager" produced 7. Small sample, but it points one way.',
      fix: `Consider "Engineering Manager — <descriptor> · <descriptor>" with "${title}" framing moved into the descriptors. Ship as-is if you disagree — this is odds, not honesty.`,
    });
  } else if (!titleOk && title) {
    findings.push({
      sev: 'NOTE', rule: 'NEW_HEADLINE',
      what: `Headline leads with "${title}", outside the two established identities.`,
      why: 'Not wrong — just a third identity in circulation. Worth a glance if this employer or a shared recruiter may see another of your résumés.',
      fix: 'No action needed if this is deliberate for the lane.',
    });
  }

  // 2. Locked constants.
  for (const L of LOCKED) {
    const m = text.match(L.find);
    if (!m) continue;
    // Collapse whitespace: DOCX extraction wraps mid-value ("working\ntowards B1"),
    // which is a line break in the source, not a different claim.
    const got = L.norm(m).replace(/\s+/g, ' ').trim();
    const ok = L.match ? L.match(got, L.expect) : got.toLowerCase() === L.expect.toLowerCase();
    if (!ok) {
      findings.push({
        sev: 'RISK', rule: 'LOCKED_FIELD',
        what: `${L.field} reads "${got}", expected "${L.expect}".`,
        why: L.why,
        fix: `Set ${L.field} to "${L.expect}" — it must be identical on every document that ships.`,
      });
    }
  }

  // 3. Same-company drift — the strictest reader.
  for (const p of mine) {
    const pTitle = claimedTitle(p.text);
    if (pTitle && title && !sameTitle(pTitle, title)) {
      const crossFamily = family(pTitle) !== family(title);
      findings.push({
        sev: crossFamily ? 'RISK' : 'NOTE',
        rule: crossFamily ? 'SAME_COMPANY_IDENTITY' : 'SAME_COMPANY_WORDING',
        what: crossFamily
          ? `${company} already holds a résumé headed "${pTitle}" (${family(pTitle)}); this one is headed "${title}" (${family(title)}) — a different kind of professional.`
          : `Headline wording differs from what ${company} holds ("${pTitle}" vs "${title}"), but both read as the same role family.`,
        why: crossFamily
          ? `They can open both. Changing which profession you are, to an employer who already has your CV, is the version of this that actually costs you. (${path.basename(p.file)})`
          : `Same family (${family(title)}), so a recruiter sees one person. Cosmetic. (${path.basename(p.file)})`,
        fix: crossFamily
          ? 'Keep the same professional identity you sent them before; tailor the descriptors and the body instead.'
          : 'No action needed. Align it if you want the two documents to look identical at a glance.',
      });
    }
    const sim = jaccard(profileTerms(text), profileTerms(p.text));
    if (sim < 0.25) {
      findings.push({
        sev: 'NOTE', rule: 'SAME_COMPANY_PROFILE',
        what: `Profile shares only ${Math.round(sim * 100)}% of its content words with the resume already sent to ${company}.`,
        why: 'Below ~25% overlap the two profiles describe different careers rather than different emphases.',
        fix: 'Rebuild the profile from the same core facts as the prior submission, re-emphasised for this JD.',
      });
    }
    // New domain history at an old employer — the SumUp/MayTek/Atomants failure.
    // Scope-number drift against this employer's copy.
    const sNow = scopeClaims(text), sBefore = scopeClaims(p.text);
    const bankTxt = groundedTerms(outputDir);
    for (const [unit, vals] of sNow) {
      if (!sBefore.has(unit)) continue;
      const prevVals = sBefore.get(unit);
      const changed = [...vals].filter(v => !prevVals.has(v));
      if (!changed.length) continue;
      const prev = [...prevVals].join('/'), cur = [...vals].join('/');
      // If the new figure is the one written in the achievement bank, this is a
      // correction toward the source of truth, not drift. Say so rather than nagging.
      const bankBacked = [...vals].some(v => bankTxt.includes(`${v} ${unit}`));
      findings.push({
        sev: bankBacked ? 'NOTE' : 'ODDS',
        rule: bankBacked ? 'SCOPE_CORRECTED' : 'SCOPE_DRIFT',
        what: `"${unit}" reads ${cur} here, but ${prev} on the résumé ${company} already holds.`,
        why: bankBacked
          ? `${cur} is the figure in the achievement bank, so this corrects the earlier number. Leaving it is right; just know the number visibly moved.`
          : `A scope number that changes between applications to the same employer is what makes a CV look unreliable. Neither figure is bank-backed — check which is true.`,
        fix: bankBacked
          ? 'No action. Do not revert to the old number just to match — that re-ships the inflation.'
          : `Set it to the banked figure and add that figure to the bank if it is missing.`,
      });
    }

    const now = employerClaims(text), before = employerClaims(p.text);
    for (const e of Object.keys(now)) {
      if (!before[e]) continue;
      const added = [...now[e]].filter(t => !before[e].has(t));
      if (!added.length) continue;
      const bank = groundedTerms(outputDir);
      const ungrounded = added.filter(t => !bank.includes(t));
      if (ungrounded.length) {
        findings.push({
          sev: 'RISK', rule: 'NEW_HISTORY',
          what: `New claims at ${e} with no source: ${ungrounded.join(', ')} — absent from both the résumé already sent to ${company} and the achievement bank.`,
          why: 'A past job growing new, ungrounded responsibilities between applications is the pattern that reads as fabrication.',
          fix: 'Either drop them, or — if true — put them in the known-facts box so they land in the bank and stop looking invented.',
        });
      }
      const grounded = added.filter(t => bank.includes(t));
      if (grounded.length) {
        findings.push({
          sev: 'NOTE', rule: 'NEW_EMPHASIS',
          what: `Surfaces banked history at ${e} that the earlier ${company} résumé left out: ${grounded.join(', ')}.`,
          why: 'These are grounded facts, so this is re-emphasis rather than invention — normal tailoring. Flagged only so you know the difference is visible if they compare the two.',
          fix: 'Usually fine to ship. If asked, the honest answer is that the earlier résumé was tailored to a different role.',
        });
      }
    }
  }

  // 4. Global drift across the whole search.
  const seenTitles = new Map();
  for (const p of prior) {
    const t = claimedTitle(p.text);
    if (!t) continue;
    const key = t.toLowerCase();
    if (!seenTitles.has(key)) seenTitles.set(key, []);
    seenTitles.get(key).push(p.company);
  }
  if (title && !seenTitles.has(title.toLowerCase()) && seenTitles.size) {
    findings.push({
      sev: 'NOTE', rule: 'NEW_IDENTITY',
      what: `"${title}" is a headline identity not used on any previous submission.`,
      why: `The search has already used ${seenTitles.size} distinct headline identities. Each new one widens the spread a recruiter or LinkedIn check can see.`,
      fix: 'Reuse an established locked headline unless there is a deliberate lane reason not to.',
    });
  }

  const risks = findings.filter(f => f.sev === 'RISK').length;
  const odds = findings.filter(f => f.sev === 'ODDS').length;
  const notes = findings.filter(f => f.sev === 'NOTE').length;
  const score = Math.max(0, 100 - risks * 20 - odds * 10 - notes * 4);

  return {
    score,
    // Never "BLOCK". The strongest verdict this tool can reach is "look at this before
    // you send it" — the decision to send is always Yash's.
    verdict: risks ? 'CHECK-BEFORE-SENDING' : (odds || notes) ? 'MINOR' : 'CONSISTENT',
    findings,
    stats: {
      title, headline: head,
      prior_submissions: prior.length,
      same_company: mine.length,
      distinct_identities: seenTitles.size,
    },
  };
}

module.exports = { checkConsistency, claimedTitle, headline, priorSubmissions };

// CLI: node consistency.js <resume.md> [company]
if (require.main === module) {
  const file = process.argv[2];
  const company = process.argv[3] || path.basename(path.dirname(file || ''));
  if (!file) {
    console.error('usage: node consistency.js <resume.md> [company]');
    console.error('  company defaults to the parent directory name (output/<company>/…)');
    process.exit(2);
  }
  const r = checkConsistency(fs.readFileSync(file, 'utf8'), { company, outputDir: 'output', file });
  console.log('CONSISTENCY GATE — ' + file + (company ? '  (vs ' + company + ')' : ''));
  console.log('score=' + r.score + ' verdict=' + r.verdict +
    ' findings=' + r.findings.length +
    ' prior_sent=' + r.stats.prior_submissions +
    ' same_company=' + r.stats.same_company +
    ' identities_used=' + r.stats.distinct_identities);
  console.log('title="' + r.stats.title + '"\n');
  const ORDER = { RISK: 0, ODDS: 1, NOTE: 2 };
  for (const f of r.findings.sort((a, b) => ORDER[a.sev] - ORDER[b.sev])) {
    console.log('[' + f.sev + '] ' + f.rule);
    console.log('   ' + f.what);
    console.log('   why: ' + f.why);
    console.log('   consider: ' + f.fix + '\n');
  }
  if (!r.findings.length) console.log('  consistent — same person as everything already sent.\n');
  console.log('Advisory only. Nothing here stops an application — send it if you judge it right.');
  // Always 0. This tool never fails a build, never gates a send.
  process.exit(0);
}

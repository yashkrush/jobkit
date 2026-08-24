// Rank the Discover pool into an application batch.
//
//   cd tools && node rank-batch.js > ../output/_discover/batch-<YYYYMMDD>.md
//
// Ranks by the MEASURED lane conversion rate rather than by keyword fit, because keyword
// fit turned out not to predict anything: across the Jun–Aug 2026 search, EM/QA-titled
// applications returned 7 first interviews from 13, while TPM/Program/Release/PMO returned
// 0 from 7 — with screen-gate scores of 86–98 on both sides.
//
// ADVISORY ONLY. Nothing is hidden: flagged rows stay in the table with their flag, and
// excluded rows are listed with the reason. Per CLAUDE.md "THE TOOL NEVER BLOCKS AN
// APPLICATION", this ranks a queue — it does not decide what Yash applies to.
const s = require('../output/_discover/state.json');

const APPLIED = ['mozilla','n26','supabase','sumup','jetbrains','checkmk','idealo','koppla','voize',
  'paymenttools','vinted','mapbox','neara','superhuman','micro1','priceline','mckinsey','siemens',
  'clario','synagen','hivemq','pulsepoint','deutsche bank'];
const EMPLOYER = ['delivery hero'];

// Hands-on builder-EM markers — Yash's own standing filter. Read from the JD text, not the title.
const HANDSON = [/hands[- ]on/i, /player[- ]coach/i, /write code/i, /writes code/i, /coding interview/i,
  /still code/i, /senior ic/i, /individual contributor.{0,30}manager/i, /proximity to the code/i,
  /review code with a critical eye/i, /live coding/i, /pair program/i, /take[- ]home/i];

// Lane classification — EM/QA converts 7/13; TPM/PM/Release/PMO converts 0/7.
const EMQA = /engineering manager|quality|qa |test engineering|head of engineering|director of engineering/i;
const PMLANE = /program manager|project manager|product manager|programme manager|delivery manager|pmo/i;

const GERMANY = /berlin|germany|münchen|munich|hamburg|remote|emea|anywhere|deutschland/i;

const rows = [];
for (const j of (s.results || [])) {
  const co = (j.company || '').toLowerCase();
  const d = (j.description || '') + ' ' + (j.title || '');
  const r = { co: j.company, title: j.title, loc: j.location || '?', url: j.url, notes: [] };

  if (EMPLOYER.some(e => co.includes(e))) { r.skip = 'current employer'; rows.push(r); continue; }
  if (APPLIED.some(a => co.includes(a))) r.notes.push('ALREADY APPLIED — check role differs');
  if (!GERMANY.test(r.loc)) { r.skip = 'location: ' + r.loc; rows.push(r); continue; }

  // One marker is weak evidence — plenty of JDs say "hands-on" in passing about the team,
  // not the manager. Two or more is the archetype. Label the difference so a single casual
  // mention doesn't quietly cost a good role.
  const hits = HANDSON.filter(re => re.test(d));
  if (hits.length >= 2) r.notes.push('HANDS-ON archetype (' + hits.length + ' markers)');
  else if (hits.length === 1) r.notes.push('1 hands-on mention — probably incidental, worth a skim');

  r.lane = EMQA.test(j.title) ? 'EM/QA' : PMLANE.test(j.title) ? 'PM-lane' : 'other';
  // Score: lane conversion is the dominant term, then penalties.
  r.score = (r.lane === 'EM/QA' ? 70 : r.lane === 'PM-lane' ? 25 : 40)
    + (/berlin/i.test(r.loc) ? 15 : /remote|anywhere|emea/i.test(r.loc) ? 8 : 0)
    - (hits.length >= 2 ? 40 : hits.length === 1 ? 8 : 0)
    - (r.notes.some(n => n.startsWith('ALREADY')) ? 20 : 0)
    + (/senior|lead|principal|head|director/i.test(j.title) ? 5 : 0);
  rows.push(r);
}

// Dedupe: arbeitnow mirrors the same posting under a second (sometimes obfuscated) company
// slug, so the same role appeared up to 3×. Key on the normalised title and keep the row
// with the most direct-looking URL (a real ATS board over an aggregator).
const norm = t => t.toLowerCase().replace(/\(.*?\)|\[.*?\]|[^a-z0-9]/g, '');
const best = new Map();
for (const r of rows.filter(x => !x.skip)) {
  const k = norm(r.title);
  const prev = best.get(k);
  const direct = u => !/arbeitnow/i.test(u || '');
  if (!prev || (direct(r.url) && !direct(prev.url))) best.set(k, r);
}
const live = [...best.values()].sort((a, b) => b.score - a.score);
const out = [];
out.push('# Discover batch — ranked ' + new Date().toISOString().slice(0, 10));
out.push('');
out.push('Pool: ' + s.stats.fetched.toLocaleString() + ' postings fetched from ' + s.stats.sourcesFetched +
  ' ATS boards; ' + (s.results || []).length + ' passed the title/location filter; ' + live.length +
  ' rank below after removing the current employer and out-of-region roles.');
out.push('');
out.push('Ranked by the **measured lane conversion rate** (EM/QA = 7 interviews from 13 applications;');
out.push('PM-lane = 0 from 7), then Berlin, then penalties for hands-on markers and prior applications.');
out.push('**Nothing here is a decision.** Rows carry their flags so you can overrule any of them.');
out.push('');

const tier = (t, f) => {
  const g = live.filter(f);
  if (!g.length) return;
  out.push('## ' + t + ' (' + g.length + ')');
  out.push('');
  out.push('| # | Company | Role | Location | Flags |');
  out.push('|---|---|---|---|---|');
  g.forEach((r, i) => out.push('| ' + (i + 1) + ' | ' + r.co + ' | [' + r.title.replace(/\|/g, '/') +
    '](' + r.url + ') | ' + r.loc + ' | ' + (r.notes.join('; ') || '—') + ' |'));
  out.push('');
};

tier('Tier 1 — EM/QA lane, clean (apply first)', r => r.lane === 'EM/QA' && !r.notes.length);
tier('Tier 2 — EM/QA lane, worth a skim first', r => r.lane === 'EM/QA' && r.notes.length &&
  !r.notes.some(n => n.startsWith('HANDS-ON archetype')));
tier('Tier 2b — EM/QA but reads hands-on (your standing filter)', r => r.lane === 'EM/QA' &&
  r.notes.some(n => n.startsWith('HANDS-ON archetype')));
tier('Tier 3 — other titles, substance may still fit', r => r.lane === 'other');
tier('Tier 4 — PM-lane (0 from 7 historically — shown, not hidden)', r => r.lane === 'PM-lane');

const skipped = rows.filter(r => r.skip);
out.push('## Excluded (' + skipped.length + ') — listed so nothing disappears silently');
out.push('');
skipped.forEach(r => out.push('- ' + r.co + ' — ' + r.title + ' _(' + r.skip + ')_'));
console.log(out.join('\n'));

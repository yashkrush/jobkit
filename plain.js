// Deterministic plain-language scan — measures how "AI-written" a resume reads.
//
// Companion to ats.js. Where ats.js measures whether a resume gets FOUND, this
// measures whether it reads like a person wrote it. An LLM asked "does this sound
// AI-generated?" grades its own writing generously, so the check is regex-based
// and reproducible: same file always yields the same flags and the same score.
//
// It flags the surface tics of generated prose, not the content. Nothing here
// touches facts, keywords or scope — a flagged line is rewritten plainly, never
// deleted, and the standard industry terms an ATS searches on always survive.
//
// Extending it: add to PUFF (phrases) or BENEFIT_VERBS (participles). Keep the
// lists tight — a false flag trains you to ignore the output.

// --- Tunables ------------------------------------------------------------------
const LONG_BULLET_WORDS = 34;   // above this a bullet stops being skimmable
const DASH_SHARE_LIMIT = 0.4;   // share of bullets allowed to lean on an em-dash
const UNIFORM_STDEV = 6;        // below this, every bullet is the same shape

// Puff: elevated filler that says nothing a hiring manager can check.
const PUFF = [
  'proven track record', 'demonstrated ability', 'instrumental in', 'track record of',
  'sparring partner', 'thought leader', 'deep expertise', 'deep dive',
  'best-in-class', 'world-class', 'cutting-edge', 'state-of-the-art', 'industry-leading',
  'seamless', 'seamlessly', 'robust', 'holistic', 'synergy', 'leverage', 'leveraged',
  'leveraging', 'spearheaded', 'championed', 'orchestrated', 'passionate', 'results-oriented',
  'rockstar', 'ninja', 'game-changing', 'mission-critical', 'laser-focused',
  'brings a', 'a strategic partner for', 'with ownership and confidence',
  'actionable insights', 'drive continuous improvement', 'continuous improvement of',
  'delivery discipline', 'engineering excellence', 'culture of quality',
  'empowering teams', 'enabling teams to', 'unlocking', 'at every level',
  'not just', 'more than just', 'in today\'s', 'ever-evolving', 'fast-paced',
];

// Participles that start a tacked-on "…, giving leadership visibility" benefit clause.
const BENEFIT_VERBS = [
  'giving', 'lifting', 'driving', 'enabling', 'ensuring', 'allowing', 'cutting',
  'reducing', 'improving', 'delivering', 'providing', 'preventing', 'predicting',
  'unlocking', 'empowering', 'boosting', 'streamlining', 'raising', 'helping',
  'creating', 'accelerating', 'increasing', 'decreasing', 'saving', 'yielding',
  'resulting', 'leading', 'making', 'turning', 'positioning', 'establishing',
  'surfacing', 'supporting', 'strengthening', 'moving', 'shifting',
];

const EMDASH = /[—–]/g;
// Bare separators in a tool chain ("Jira / GitHub → BigQuery") are punctuation, not words —
// counting them inflates every stack line into a false LONG flag.
const words = s => (s.trim().match(/\S+/g) || []).filter(t => /[a-z0-9]/i.test(t)).length;

// Body lines only: bullets and profile prose. Headings, contact line, the italic
// company descriptor and the `Term · Term · Term` skills rows are not prose and
// must not be scored as such.
function bodyLines(md) {
  const out = [];
  let section = '', open = null, inComment = false;   // `open` = the entry a hard-wrapped line continues
  String(md || '').split('\n').forEach((raw, i) => {
    const line = raw.trim();
    // Authoring notes are instructions to the tailor, not resume prose. They can span
    // several lines, so track the block rather than just its opening line.
    if (inComment) { if (line.includes('-->')) inComment = false; return; }
    if (/^<!--/.test(line)) { open = null; if (!line.includes('-->')) inComment = true; return; }
    if (/^#{1,6}\s/.test(line)) { section = line.replace(/^#+\s*/, '').toLowerCase(); open = null; return; }
    if (!line) { open = null; return; }

    // Some sources are hard-wrapped at ~100 chars, so one bullet or paragraph spans
    // several physical lines. Join them before measuring — otherwise every sentence
    // looks short and every fragment looks like a dangling clause.
    const isNew = /^[-*]\s/.test(line) || /^\*/.test(line) || /^#/.test(line);
    if (!isNew && open) { open.text += ' ' + line; return; }

    if (/^(technical skills|core competencies|education|languages)/.test(section)) { open = null; return; }
    if (/^\*/.test(line)) { open = null; return; }   // headline, role headers, italic descriptors
    if (/•/.test(line)) { open = null; return; }     // contact line
    if (/^<!--/.test(line)) { open = null; return; } // authoring notes, not resume prose
    const text = line.replace(/^[-*]\s+/, '');
    if ((text.match(/·/g) || []).length >= 2) { open = null; return; }   // `A · B · C` stacks
    open = { n: i + 1, text, bullet: /^[-*]\s/.test(line), section };
    out.push(open);
  });
  // Stubs and one-line skill rows aren't prose — drop them only once fully joined.
  return out.filter(l => words(l.text) >= 6);
}

function scanPlainLanguage(md) {
  const lines = bodyLines(md);
  const flags = [];
  const add = (l, rule, why, snippet) => flags.push({
    line: l.n, rule, why,
    snippet: (snippet || l.text).replace(/\s+/g, ' ').slice(0, 120),
  });

  for (const l of lines) {
    const dashes = (l.text.match(EMDASH) || []).length;
    if (dashes >= 2) {
      add(l, 'DASH_STACK', 'Two or more em-dash asides in one line — the clearest AI tell. Keep one at most; split the rest into a second sentence or use a comma.');
    }

    // A trailing "…— giving leadership live visibility" benefit clause. Anchored at the
    // end of the sentence (a final full stop is allowed) — that tacked-on position is the tell.
    const tail = l.text.match(new RegExp(
      // an adverb may sit between the dash and the participle ("— measurably reducing …")
      '[\\u2014\\u2013,;]\\s+(?:\\w+ly\\s+)?(' + BENEFIT_VERBS.join('|') + ')\\b[^.\\u2014\\u2013]*\\.?\\s*$', 'i'));
    if (tail) {
      add(l, 'GERUND_TAIL',
        'Ends on a tacked-on "…, ' + tail[1].toLowerCase() + ' X" benefit clause. Either make the result the main verb, or drop it.',
        tail[0]);
    }

    // Three parallel -ing items: the rule-of-three rhythm.
    const triple = l.text.match(/\b(\w+ing\b[^,;.]{0,40}),\s+(\w+ing\b[^,;.]{0,40}),?\s+and\s+(\w+ing\b[^,;.]{0,40})/i);
    if (triple) {
      add(l, 'TRIPLE', 'Rule-of-three "-ing, -ing, and -ing" list. Cut to the two that matter, or make them separate clauses.', triple[0]);
    }

    for (const p of PUFF) {
      const re = new RegExp('(?<![a-z])' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![a-z])', 'i');
      const m = l.text.match(re);
      if (m) add(l, 'PUFF', 'Filler phrase "' + m[0] + '" — says nothing checkable. Name the actual thing or cut it.', m[0]);
    }

    // Length is measured per SENTENCE, not per line — a 90-word profile made of four
    // ordinary sentences is fine; one 50-word sentence is what reads as generated.
    for (const s of l.text.split(/(?<=[.!?])\s+/)) {
      const w = words(s);
      if (w > LONG_BULLET_WORDS) {
        add(l, 'LONG', 'One sentence runs to ' + w + ' words (skim limit ~' + LONG_BULLET_WORDS +
          '). Split it or drop a clause.', s);
      }
    }
  }

  // --- Whole-document rhythm ---
  const bullets = lines.filter(l => l.bullet);
  const notes = [];
  const withDash = bullets.filter(l => (l.text.match(EMDASH) || []).length > 0).length;
  const dashShare = bullets.length ? withDash / bullets.length : 0;
  if (dashShare > DASH_SHARE_LIMIT) {
    notes.push('EM-DASH DENSITY: ' + withDash + '/' + bullets.length + ' bullets (' +
      Math.round(dashShare * 100) + '%) hang on an em-dash. Target under ' +
      Math.round(DASH_SHARE_LIMIT * 100) + '% — vary the sentence shape.');
  }
  let stdev = null;
  if (bullets.length >= 4) {
    const ws = bullets.map(l => words(l.text));
    const mean = ws.reduce((a, b) => a + b, 0) / ws.length;
    stdev = Math.sqrt(ws.reduce((a, b) => a + (b - mean) ** 2, 0) / ws.length);
    if (stdev < UNIFORM_STDEV && mean > 22) {
      notes.push('UNIFORM RHYTHM: every bullet is ~' + Math.round(mean) + ' words (spread ±' +
        stdev.toFixed(1) + '). Real writing varies — let some bullets be short and flat.');
    }
  }

  // Score: start at 100, deduct per flag by weight, plus the rhythm notes.
  const WEIGHT = { DASH_STACK: 6, GERUND_TAIL: 5, TRIPLE: 4, PUFF: 5, LONG: 3 };
  let score = 100 - flags.reduce((a, f) => a + (WEIGHT[f.rule] || 3), 0) - notes.length * 6;
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    verdict: score >= 80 ? 'PLAIN' : score >= 60 ? 'FUSSY' : 'AI-SOUNDING',
    flags: flags.sort((a, b) => a.line - b.line),
    notes,
    stats: { body_lines: lines.length, bullets: bullets.length, dash_share: +dashShare.toFixed(2), stdev },
  };
}

module.exports = { scanPlainLanguage };

// CLI: node plain.js <file.md>
if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.error('usage: node plain.js <resume.md>'); process.exit(2); }
  const r = scanPlainLanguage(require('fs').readFileSync(file, 'utf8'));
  console.log('PLAIN-LANGUAGE SCAN — ' + file);
  console.log('score=' + r.score + ' verdict=' + r.verdict + ' flags=' + r.flags.length +
    ' bullets=' + r.stats.bullets + ' dash_share=' + r.stats.dash_share + '\n');
  for (const f of r.flags) console.log('L' + f.line + '  [' + f.rule + ']  ' + f.snippet + '\n      → ' + f.why);
  if (r.notes.length) console.log('\n' + r.notes.map(n => '  * ' + n).join('\n'));
  if (!r.flags.length && !r.notes.length) console.log('  clean — reads plainly.');
}

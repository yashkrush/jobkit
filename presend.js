// Pre-send check — the last thing to run before a résumé leaves the house.
//
// Every other gate checks CONTENT. None of them check that the file you are about to
// attach is the file that passed. That gap bit twice on 2026-08-23: the DOCX on disk was
// 8 minutes older than the markdown, so it still carried a factual error that had already
// been fixed; and an audit found the same drift sitting in output/mozilla and
// output/pulsepoint. Gates verify claims. This verifies the artefact.
//
//   node presend.js <company-slug>
//
// Checks, in the order they can hurt you:
//   1. STALE ARTEFACT  — .docx older than the .md it renders. The wrong-file bug.
//   2. PRONOUNS        — my/his/I/we never belong on a résumé (CLAUDE.md rule).
//   3. AUTHOR METADATA — the docx library defaults to "Un-named", which reads as
//                        machine-generated in File > Properties.
//   4. LENGTH          — against the skeleton's budget.
//   5. PLAIN LANGUAGE  — delegates to plain.js.
//
// Advisory, like every gate here: it prints what it found and always exits 0. Per
// CLAUDE.md "THE TOOL NEVER BLOCKS AN APPLICATION", it never withholds a file.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PRONOUNS = /\b(my|My|his|His|I|we|We|our|Our|him|He|he)\b/g;

// Read the length budget from the skeleton rather than hardcoding it — the skeleton is
// the single source for format numbers (CLAUDE.md command-architecture rule).
function wordBudget() {
  try {
    const sk = fs.readFileSync(path.join(__dirname, 'resumes', 'resume-skeleton.md'), 'utf8');
    const m = sk.match(/≤\s*~?(\d{3,4})\s*body words/i);
    if (m) return parseInt(m[1], 10);
  } catch {}
  return 720;   // fallback only — the skeleton is the source
}

// Count the SAME WAY the budget was calibrated, or the comparison is meaningless.
// The skeleton's 814–853 range came from `wc -w` over the non-heading lines, which counts
// markdown punctuation ("-", "**", "·") as tokens. Filtering those out gives a "truer" word
// count — 705–721 on the same files — but measured against an 855 budget calibrated the
// loose way it would wave through a résumé ~15% over length. Matching the calibration beats
// being independently correct. If the budget is ever recalibrated strictly, change both.
function bodyWords(md) {
  return md.split('\n')
    .filter(l => !/^#/.test(l))
    .join(' ').split(/\s+/).filter(Boolean).length;
}

// Returns the author string, '' when the docx carries no creator field, or null when the
// file could not be read at all. The three cases need different advice, so don't merge them.
function docxAuthor(file) {
  try {
    const xml = execFileSync('unzip', ['-p', file, 'docProps/core.xml'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const m = xml.match(/<dc:creator>([^<]*)<\/dc:creator>/);
    return m ? m[1] : '';
  } catch { return null; }
}

function check(slug) {
  const dir = path.join(__dirname, 'output', slug);
  if (!fs.existsSync(dir)) return { fatal: `No such company folder: output/${slug}` };

  // Newest résumé markdown that is not a draft or a stashed prior submission.
  const mds = fs.readdirSync(dir)
    .filter(f => /^resume-.*\.md$/.test(f) && !/_draft|prescreen/.test(f))
    .map(f => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  if (!mds.length) return { fatal: `No resume-*.md found in output/${slug}` };

  const mdFile = path.join(dir, mds[0].f);
  const docxFile = mdFile.replace(/\.md$/, '.docx');
  const md = fs.readFileSync(mdFile, 'utf8');
  const out = { slug, mdFile, docxFile, issues: [], ok: [] };

  // 1. Stale artefact — the one that actually bit.
  if (!fs.existsSync(docxFile)) {
    out.issues.push(['NO DOCX', 'The .docx does not exist. Rebuild before sending.']);
  } else {
    const mdT = fs.statSync(mdFile).mtimeMs, dT = fs.statSync(docxFile).mtimeMs;
    if (mdT > dT) {
      const secs = Math.round((mdT - dT) / 1000);
      const age = secs < 60 ? `${secs}s` : secs < 3600 ? `${Math.round(secs / 60)} min`
                : secs < 86400 ? `${Math.round(secs / 3600)}h` : `${Math.round(secs / 86400)}d`;
      out.issues.push(['STALE DOCX',
        `The .docx is ${age} older than the .md, so it does NOT contain the latest edits. ` +
        `Rebuild it, or you will send the wrong version.`]);
    } else {
      out.ok.push('DOCX is current (newer than the markdown)');
    }
    // 3. Author metadata.
    const author = docxAuthor(docxFile);
    if (author === null)
      out.issues.push(['METADATA', 'Could not read this .docx — it may be corrupt or not a real DOCX. Rebuild it.']);
    else if (!author.trim())
      out.issues.push(['METADATA', 'No author set. Rebuild so it carries your name in File > Properties.']);
    else if (/un-?named/i.test(author))
      out.issues.push(['METADATA', `Author reads "${author}" — the generator default, which looks machine-made. Rebuild.`]);
    else out.ok.push(`DOCX author is "${author}"`);
  }

  // 2. Pronouns.
  const hits = [];
  md.split('\n').forEach((l, i) => {
    if (/^\s*<!--/.test(l)) return;
    const m = l.match(PRONOUNS);
    if (m) hits.push(`L${i + 1}: ${[...new Set(m)].join(', ')}`);
  });
  if (hits.length) out.issues.push(['PRONOUNS', `Résumés take no pronouns. ${hits.join(' · ')}`]);
  else out.ok.push('No pronouns');

  // 4. Length.
  const budget = wordBudget(), words = bodyWords(md);
  if (words > budget) out.issues.push(['LENGTH', `${words} body words, budget ${budget}. Too dense to skim — cut words, not facts.`]);
  else out.ok.push(`Length ${words}/${budget}`);

  // 5. Plain language.
  try {
    const r = execFileSync('node', [path.join(__dirname, 'plain.js'), mdFile], { encoding: 'utf8' });
    const m = r.match(/score=(\d+) verdict=(\w+)/);
    if (m && +m[1] < 80) out.issues.push(['PLAIN', `score ${m[1]} (${m[2]}). Run: node plain.js ${mdFile}`]);
    else if (m) out.ok.push(`Plain language ${m[1]}/100`);
  } catch {}

  return out;
}

module.exports = { check };

if (require.main === module) {
  const slug = process.argv[2];
  if (!slug) { console.error('usage: node presend.js <company-slug>'); process.exit(2); }
  const r = check(slug);
  if (r.fatal) { console.error(r.fatal); process.exit(2); }

  console.log('PRE-SEND CHECK — ' + r.slug + '\n');
  r.ok.forEach(o => console.log('  ok    ' + o));
  if (r.issues.length) {
    console.log('');
    r.issues.forEach(([t, m]) => console.log('  FIX   [' + t + '] ' + m));
  }
  console.log('\nSEND THIS FILE:\n  ' + path.relative(__dirname, r.docxFile));
  if (!r.issues.length) console.log('\nAll checks passed. Open it once to confirm 2 pages, then send.');
  else console.log('\n' + r.issues.length + ' thing(s) to fix first. Nothing here blocks you — your call.');
  process.exit(0);
}

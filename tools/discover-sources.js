#!/usr/bin/env node
// tools/discover-sources.js — turn a list of company NAMES into validated Discover sources.
//
// For each candidate it generates slug variants and probes them against every supported ATS,
// stopping at the first board that actually returns postings. A board is only accepted on
// "no error AND >=1 posting AND a real title" — HTTP 200 is NOT enough, because several dead
// boards (vercel/ashby, deel/ashby) answer 200 with an empty job array.
//
// Probing goes through discover.fetchSource, the same code path the nightly run uses, so a
// slug validated here is guaranteed to work in production.
//
// Usage:
//   node tools/discover-sources.js                 # probe everything, using the cache
//   node tools/discover-sources.js --fresh         # ignore the cache
//   node tools/discover-sources.js --only berlin-dach,quality-vendor
//   node tools/discover-sources.js --no-existing   # skip re-validating discover-config.json

const fs = require('fs').promises;
const crypto = require('crypto');
const path = require('path');
const { fetchSource } = require('../discover');

const ROOT = path.join(__dirname, '..');
const CANDIDATES_PATH = path.join(__dirname, 'company-candidates.json');
const CONFIG_PATH = path.join(ROOT, 'discover-config.json');
const OUT_DIR = path.join(__dirname, 'out');
const OUT_SOURCES = path.join(OUT_DIR, 'validated-sources.json');
const OUT_REJECTS = path.join(OUT_DIR, 'rejects.md');
const CACHE_PATH = path.join(OUT_DIR, 'probe-cache.json');

// Probe order is by prior probability of a hit, so the per-company short-circuit fires early
// and we make ~1-2k requests instead of ~5k.
const PROBE_ORDER = ['greenhouse', 'ashby', 'lever', 'recruitee', 'personio', 'workable', 'smartrecruiters'];

const HOST_OF = {
  greenhouse: 'boards-api.greenhouse.io',
  ashby: 'api.ashbyhq.com',
  lever: 'api.lever.co',
  recruitee: 'recruitee.com',
  personio: 'jobs.personio.de',
  workable: 'apply.workable.com',
  smartrecruiters: 'api.smartrecruiters.com',
};

const CONCURRENCY = 8;
const HOST_MIN_INTERVAL = 400;   // ms between two requests to the same host
const LEGAL_SUFFIXES = /\b(gmbh|mbh|se|ag|inc|ltd|limited|llc|bv|nv|ab|oy|oyj|as|asa|sa|srl|spa|plc|co|corp|corporation|holding|holdings|group|technologies|technology|labs|software|solutions|digital|ventures)\b/g;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// --- host throttle ---------------------------------------------------------
// Without this, 150 Greenhouse slugs across 8 workers burst at one IP and start earning 429s.
const nextFreeAt = new Map();
async function hostGate(host) {
  const now = Date.now();
  const prev = nextFreeAt.get(host) || 0;
  const wait = Math.max(0, prev - now);
  nextFreeAt.set(host, Math.max(now, prev) + HOST_MIN_INTERVAL);
  if (wait) await sleep(wait);
}

// --- slug variants ---------------------------------------------------------
// "Sonar" doesn't resolve but "sonarsource" does, so variant generation is load-bearing.
// Both the full name and the legal-suffix-stripped name are kept, because stripping breaks
// genuine slugs like "saucelabs" while fixing others like "zalandose".
function slugVariants(name, aliases) {
  const clean = String(name || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[&/]/g, ' ').trim();
  const stripped = clean.replace(LEGAL_SUFFIXES, ' ').replace(/\s+/g, ' ').trim();

  const out = new Set();
  const add = s => { s = String(s || '').trim(); if (s && s.length > 1) out.add(s); };
  for (const base of [clean, stripped]) {
    if (!base) continue;
    add(base.replace(/[^a-z0-9]/g, ''));
    add(base.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
  }
  (aliases || []).forEach(add);
  return [...out];
}

// Boards that carry nothing but a speculative-application stub, or an ATS vendor's own demo
// board, answer 200 with "postings" that are not jobs. Accepting one wires a permanently
// empty source into the nightly run, so they're rejected and probing continues to the next
// candidate board — this is what sends Personio from its recruitee demo board to its real one.
const PLACEHOLDER = /initiativbewerbung|initiativ|open application|unsolicited|speculative|talent ?pool|didn'?t find a suitable|teststelle|^test\b|test job|demo job|musterstr|api job/i;

// A board counts only if it returned a posting with a real title.
function accept(res) {
  if (!res || res.error) return null;
  const jobs = res.jobs || [];
  if (!jobs.length) return null;
  const titled = jobs.filter(j => j && j.title && j.title.trim());
  if (!titled.length) return null;

  const real = titled.filter(j => !PLACEHOLDER.test(j.title));
  if (!real.length) return null;   // nothing but stubs

  // Fingerprint the WHOLE board, not just one title. Two unrelated companies often share a
  // common first posting ("Senior Software Engineer"); only a shared template board has an
  // identical title list end to end.
  const fp = crypto.createHash('sha1')
    .update(titled.map(j => j.title.trim().toLowerCase()).sort().join('|'))
    .digest('hex').slice(0, 12);

  return { count: jobs.length, realCount: real.length, fp, sample: real[0].title.trim().slice(0, 70) };
}

// --- cache -----------------------------------------------------------------
let cache = {};
let cacheDirty = false;
const cacheKey = (type, slug) => `${type}:${slug}`;

async function probe(type, slug, useCache) {
  const key = cacheKey(type, slug);
  if (useCache && cache[key]) return cache[key];

  let res, ok;
  for (let attempt = 0; attempt < 3; attempt++) {
    await hostGate(HOST_OF[type] || type);
    res = await fetchSource({ type, slug, name: slug });
    ok = accept(res);
    if (ok || !/HTTP (429|5\d\d)/.test(res.error || '')) break;
    await sleep(1500 * (attempt + 1));   // throttled, not dead — back off and ask again
  }
  // A board still throttled after three tries is unknown, not absent. Leave it uncached so the
  // next run re-checks it instead of baking in a false negative.
  if (!ok && /HTTP 429/.test(res.error || '')) {
    return { ok: false, error: res.error, transient: true, at: new Date().toISOString() };
  }
  const rec = ok
    ? { ok: true, count: ok.count, realCount: ok.realCount, fp: ok.fp, sample: ok.sample, at: new Date().toISOString() }
    : {
        ok: false,
        error: res.error
          || (!res.jobs || !res.jobs.length ? 'empty board (200, 0 jobs)' : 'placeholder/stub postings only'),
        at: new Date().toISOString(),
      };
  cache[key] = rec;
  cacheDirty = true;
  return rec;
}

// Probe one company across types/variants, stopping at the first accepted board.
async function resolveCompany(cand, group, opts) {
  const variants = slugVariants(cand.name, cand.aliases);
  const tried = [];

  // A known-good pair from the existing config gets first refusal.
  const order = [];
  if (cand.known) order.push([cand.known.type, cand.known.slug]);
  for (const type of PROBE_ORDER) for (const slug of variants) {
    if (cand.known && cand.known.type === type && cand.known.slug === slug) continue;
    order.push([type, slug]);
  }

  for (const [type, slug] of order) {
    if (opts.blocklist[`${type}:${slug}`]) {
      tried.push(`${type}:${slug} — blocklisted: ${opts.blocklist[`${type}:${slug}`]}`);
      continue;
    }
    const rec = await probe(type, slug, !opts.fresh);
    if (rec.ok) {
      return {
        hit: {
          type, slug,
          name: cand.name,
          enabled: true,
          group,
          verified: { at: rec.at.slice(0, 10), count: rec.count, sample: rec.sample },
          _realCount: rec.realCount,
          _fp: rec.fp,
        },
        tried,
      };
    }
    tried.push(`${type}:${slug} — ${rec.error}`);
  }
  return { hit: null, tried };
}

// --- worker pool -----------------------------------------------------------
async function pool(items, n, fn) {
  const queue = items.slice();
  let done = 0;
  const total = items.length;
  const workers = Array.from({ length: Math.min(n, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      await fn(item);
      done++;
      if (done % 10 === 0 || done === total) {
        process.stdout.write(`\r  probed ${done}/${total} companies…   `);
      }
    }
  });
  await Promise.all(workers);
  process.stdout.write('\n');
}

async function main() {
  const argv = process.argv.slice(2);
  const opts = {
    fresh: argv.includes('--fresh'),
    existing: !argv.includes('--no-existing'),
    only: (argv.find(a => a.startsWith('--only')) || '').split('=')[1]
      || (argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null),
  };
  const onlyGroups = opts.only ? opts.only.split(',').map(s => s.trim()) : null;

  await fs.mkdir(OUT_DIR, { recursive: true });
  if (!opts.fresh) {
    try { cache = JSON.parse(await fs.readFile(CACHE_PATH, 'utf8')); } catch { cache = {}; }
  }

  const candidates = JSON.parse(await fs.readFile(CANDIDATES_PATH, 'utf8'));
  opts.blocklist = { ...(candidates._blocklist || {}) };
  delete opts.blocklist._why;

  // Build the work list: every candidate, plus the sources already in discover-config.json so
  // the dead ones (vercel, deel) are caught by the same gate rather than trusted.
  const work = [];
  for (const [group, list] of Object.entries(candidates)) {
    if (group.startsWith('_')) continue;
    if (onlyGroups && !onlyGroups.includes(group)) continue;
    for (const c of list) work.push({ cand: c, group });
  }

  if (opts.existing && !onlyGroups) {
    const cfg = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8'));
    for (const s of cfg.sources || []) {
      if (s.type === 'arbeitnow') continue; // slug-less aggregate, always kept
      work.push({
        cand: { name: s.name || s.slug, aliases: [s.slug], known: { type: s.type, slug: s.slug } },
        group: 'existing',
      });
    }
  }

  console.log(`Probing ${work.length} candidates across ${PROBE_ORDER.length} ATS types…`);
  const t0 = Date.now();

  const hits = [];
  const misses = [];
  await pool(work, CONCURRENCY, async ({ cand, group }) => {
    const { hit, tried } = await resolveCompany(cand, group, opts);
    if (hit) hits.push(hit);
    else misses.push({ name: cand.name, group, tried });
  });

  if (cacheDirty) await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2));

  // Some ATS hosts answer an unknown-but-existing subdomain with a shared TEMPLATE board
  // rather than a 404 — Personio serves several companies an identical "SEO Marketing Manager"
  // demo. One company's board looks legitimate in isolation; the giveaway is the same ATS
  // returning the same posting for unrelated companies. Reject the whole cluster.
  // Count DISTINCT boards per fingerprint, not hits: the same company is probed once per group
  // it appears in (berlin-dach + a VC portfolio + existing), and those self-collisions are not
  // evidence of anything. Three unrelated slugs serving a byte-identical board is.
  const sig = h => `${h.type}|${h._fp}`;
  const slugsPerSig = {};
  for (const h of hits) (slugsPerSig[sig(h)] = slugsPerSig[sig(h)] || new Set()).add(h.slug);
  const sigCount = Object.fromEntries(Object.entries(slugsPerSig).map(([k, v]) => [k, v.size]));
  // Two is enough once slugs are counted distinctly: an identical title list on two unrelated
  // companies is a template, not a coincidence. Personio's demo board ("SEO Marketing Manager")
  // reaches four companies but splits into pairs, so a threshold of 3 lets it through.
  const templateSigs = new Set(Object.entries(sigCount).filter(([, n]) => n >= 2).map(([k]) => k));
  const templateRejects = hits.filter(h => templateSigs.has(sig(h)));
  const realHits = hits.filter(h => !templateSigs.has(sig(h)));
  for (const h of templateRejects) {
    misses.push({
      name: h.name, group: h.group,
      tried: [`${h.type}:${h.slug} — shared template board ("${h.verified.sample}") served to ${sigCount[sig(h)]} companies`],
    });
  }

  // Dedupe on type+slug — VC portfolios overlap heavily with berlin-dach/eu-remote.
  const byKey = new Map();
  for (const h of realHits) {
    const k = `${h.type}:${h.slug}`;
    if (!byKey.has(k)) byKey.set(k, h);
  }
  const unique = [...byKey.values()].sort((a, b) =>
    a.group.localeCompare(b.group) || a.name.localeCompare(b.name));

  // A slug can resolve to a DIFFERENT company with the same name — Greenhouse in particular
  // happily serves near-miss slugs. Nothing detects that automatically, so thin boards get
  // listed for a human to eyeball rather than silently trusted.
  const review = unique.filter(h => (h._realCount ?? h.verified.count) <= 2);
  const clean = unique.map(({ _realCount, _fp, ...h }) => h);

  await fs.writeFile(OUT_SOURCES, JSON.stringify(clean, null, 2));

  // Rejects report — every miss stays visible, so a wrong guess is never silent.
  const byGroup = {};
  for (const m of misses) (byGroup[m.group] = byGroup[m.group] || []).push(m);
  let md = `# Discover source validation — rejects\n\nRun ${new Date().toISOString()}\n\n`;
  md += `Probed ${work.length} candidates, accepted ${unique.length} unique boards, `;
  md += `${misses.length} with no reachable board.\n\n`;
  md += `Acceptance = no error AND >=1 posting AND a real title. A board answering 200 with an\n`;
  md += `empty array is a reject, not a pass.\n\n`;
  for (const [group, list] of Object.entries(byGroup)) {
    md += `## ${group} (${list.length} misses)\n\n`;
    for (const m of list.sort((a, b) => a.name.localeCompare(b.name))) {
      const distinct = [...new Set(m.tried.map(t => t.split(' — ')[1]))];
      const slugs = [...new Set(m.tried.map(t => t.split(':')[1].split(' — ')[0]))];
      md += `- **${m.name}** — tried \`${slugs.join('`, `')}\` across ${PROBE_ORDER.length} ATS types. `;
      md += `Outcomes: ${distinct.slice(0, 3).join('; ')}\n`;
    }
    md += '\n';
  }
  if (review.length) {
    md += `## Accepted but worth eyeballing (${review.length})\n\n`;
    md += `Fewer than 3 real postings. Either a genuinely small board, or a slug that resolved\n`;
    md += `to a different company of the same name. Check the sample title fits the company.\n\n`;
    for (const h of review.sort((a, b) => a.name.localeCompare(b.name))) {
      md += `- **${h.name}** → \`${h.type}:${h.slug}\` (${h.verified.count} postings) — "${h.verified.sample}"\n`;
    }
    md += '\n';
  }
  await fs.writeFile(OUT_REJECTS, md);

  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  const byType = {};
  const byGrp = {};
  let totalPostings = 0;
  for (const h of unique) {
    byType[h.type] = (byType[h.type] || 0) + 1;
    byGrp[h.group] = (byGrp[h.group] || 0) + 1;
    totalPostings += h.verified.count;
  }
  console.log(`\nAccepted ${unique.length} boards (${totalPostings} live postings) in ${secs}s`);
  console.log('  by ATS:  ', Object.entries(byType).map(([k, v]) => `${k}=${v}`).join(', '));
  console.log('  by group:', Object.entries(byGrp).map(([k, v]) => `${k}=${v}`).join(', '));
  console.log(`\n  ${path.relative(ROOT, OUT_SOURCES)}`);
  console.log(`  ${path.relative(ROOT, OUT_REJECTS)}  (${misses.length} misses)`);
}

main().catch(e => { console.error(e); process.exit(1); });

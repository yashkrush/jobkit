// discover.js — nightly job discovery over public ATS boards.
//
// Three stages, cheapest first, so a nightly run over ~200 boards costs almost nothing:
//   1. stage1Filter  — deterministic title / location / language filter. Free. Drops ~90%.
//   2. rankJobs      — the same deterministic keyword engine as ats.js, against the base resumes.
//   3. (server.js)   — only the top N survivors go through `/tailor-analyse` for a real verdict.
//
// Every drop records WHY, so the UI can show what was thrown away. Silent false negatives are the
// only way this thing loses your trust, so they're made visible rather than hidden.

const fs = require('fs').promises;
const path = require('path');
const { computeAtsScore } = require('./ats');

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, 'discover-config.json');
const STATE_DIR = path.join(ROOT, 'output', '_discover');
const STATE_PATH = path.join(STATE_DIR, 'state.json');
// The reject audit trail lives in its own file. state.json is re-parsed on every API request,
// and at ~200 boards a single sweep drops tens of thousands of postings — keeping those inline
// would mean paying to parse the whole audit trail just to answer /status.
const DROPPED_PATH = path.join(STATE_DIR, 'dropped.json');

const UA = 'jobkit-discover/1.0 (personal job search; contact via repo)';
const FETCH_TIMEOUT = 15000;

// Paging guards. Boards this big don't exist in practice; the cap is here so a broken
// `next` link can't turn one source into an unbounded loop.
const MAX_PAGES = 12;
// Arbeitnow is one free community API rather than a per-company board, and its own docs ask
// callers not to hammer it. Fewer pages, spaced further apart, than the ATS endpoints.
const ARBEITNOW_MAX_PAGES = 5;
const ARBEITNOW_PAGE_DELAY = 1200;

// A transient 5xx used to lose a board for the whole run. Retry with backoff; 429 gets a
// longer wait, because it means we're already asking too fast.
const RETRY_STATUS = new Set([429, 500, 502, 503, 504, 408]);
const MAX_ATTEMPTS = 3;

// --- small helpers ---------------------------------------------------------

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Per-host request spacing, applied to EVERY request rather than once per source. Pagination
// means one board can be a dozen requests, and 150 Greenhouse boards share a single host — so
// spacing at the source level leaves the actual traffic unthrottled.
const HOST_MIN_INTERVAL = 250;
const hostNextFreeAt = new Map();

async function hostGate(url) {
  let host;
  try { host = new URL(url).host; } catch (_) { return; }
  const now = Date.now();
  const prev = hostNextFreeAt.get(host) || 0;
  const wait = Math.max(0, prev - now);
  hostNextFreeAt.set(host, Math.max(now, prev) + HOST_MIN_INTERVAL);
  if (wait) await sleep(wait);
}

function dedupeById(jobs) {
  const seen = new Set();
  return jobs.filter(j => (seen.has(j.uid) ? false : (seen.add(j.uid), true)));
}

async function getRaw(url, accept) {
  const headers = accept ? { 'user-agent': UA, accept } : { 'user-agent': UA };
  for (let attempt = 0; ; attempt++) {
    await hostGate(url);
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT) });
    if (r.ok) return r;
    if (attempt < MAX_ATTEMPTS - 1 && RETRY_STATUS.has(r.status)) {
      const retryAfter = Number(r.headers.get('retry-after'));
      const backoff = r.status === 429 ? 2000 * (attempt + 1) : 800 * (attempt + 1);
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 10000) : backoff);
      continue;
    }
    throw new Error('HTTP ' + r.status);
  }
}

async function getJson(url) {
  return (await getRaw(url, 'application/json')).json();
}

async function getText(url) {
  return (await getRaw(url)).text();
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#x27': "'", '#160': ' ' };

function decodeEntities(s) {
  return String(s || '').replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, e) => {
    if (ENTITIES[e] !== undefined) return ENTITIES[e];
    if (/^#x/i.test(e)) return String.fromCodePoint(parseInt(e.slice(2), 16));
    if (/^#/.test(e)) return String.fromCodePoint(parseInt(e.slice(1), 10));
    return m;
  });
}

// ATS payloads arrive as HTML, sometimes double-escaped. Decode, strip, collapse.
function stripHtml(s) {
  let t = decodeEntities(String(s || ''));
  if (/&lt;|&gt;/.test(t)) t = decodeEntities(t);
  return t
    .replace(/<\s*(script|style)[\s\S]*?<\/\s*\1\s*>/gi, ' ')
    .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function job(sourceType, slug, company, id, title, location, url, description, postedAt) {
  return {
    uid: `${sourceType}:${slug}:${id}`,
    sourceType, sourceSlug: slug,
    company: company || slug,
    title: String(title || '').trim(),
    location: String(location || '').trim(),
    url: url || '',
    description: description || '',
    postedAt: postedAt || null,
  };
}

// --- fetchers --------------------------------------------------------------
// Each returns a normalised job[]. All of these are public, documented, key-free endpoints —
// no scraping, no ToS grey area, and postings land here before they reach LinkedIn.

const FETCHERS = {
  async greenhouse(src) {
    const d = await getJson(`https://boards-api.greenhouse.io/v1/boards/${src.slug}/jobs?content=true`);
    return (d.jobs || []).map(j =>
      job('greenhouse', src.slug, src.name, j.id, j.title, j.location && j.location.name,
        j.absolute_url, stripHtml(j.content), j.updated_at || j.first_published));
  },

  async lever(src) {
    const d = await getJson(`https://api.lever.co/v0/postings/${src.slug}?mode=json`);
    return (d || []).map(j =>
      job('lever', src.slug, src.name, j.id, j.text, j.categories && j.categories.location,
        j.hostedUrl, j.descriptionPlain || stripHtml(j.description),
        j.createdAt ? new Date(j.createdAt).toISOString() : null));
  },

  async ashby(src) {
    const d = await getJson(`https://api.ashbyhq.com/posting-api/job-board/${src.slug}`);
    return (d.jobs || []).map(j =>
      job('ashby', src.slug, src.name, j.id, j.title, j.location,
        j.jobUrl, j.descriptionPlain || stripHtml(j.descriptionHtml), j.publishedAt));
  },

  async recruitee(src) {
    const d = await getJson(`https://${src.slug}.recruitee.com/api/offers/`);
    return (d.offers || []).map(j =>
      job('recruitee', src.slug, src.name, j.id, j.title,
        [j.city, j.country].filter(Boolean).join(', '),
        j.careers_url, stripHtml(j.description), j.published_at));
  },

  // Deliberately NOT paginated. The widget endpoint exposes no paging metadata (no total, no
  // next link), and speculatively looping it sits behind Cloudflare — a since_id loop earned a
  // sustained 1015 rate-limit block on every Workable board. One request, as documented.
  async workable(src) {
    const d = await getJson(`https://apply.workable.com/api/v1/widget/accounts/${src.slug}?details=true`);
    return (d.jobs || []).map(j =>
      job('workable', src.slug, src.name, j.shortcode, j.title,
        [j.city, j.country].filter(Boolean).join(', '),
        j.url || j.application_url, stripHtml(j.description), j.published_on));
  },

  async smartrecruiters(src) {
    const out = [];
    let offset = 0, total = Infinity;
    while (offset < total && out.length < MAX_PAGES * 100) {
      const d = await getJson(`https://api.smartrecruiters.com/v1/companies/${src.slug}/postings?limit=100&offset=${offset}`);
      const batch = d.content || [];
      if (typeof d.totalFound === 'number') total = d.totalFound;
      for (const j of batch) {
        out.push(job('smartrecruiters', src.slug, src.name, j.id, j.name,
          j.location ? [j.location.city, j.location.country].filter(Boolean).join(', ') : '',
          `https://jobs.smartrecruiters.com/${src.slug}/${j.id}`, '', j.releasedDate));
      }
      if (!batch.length) break;
      offset += batch.length;
    }
    return out;
  },

  // Personio publishes an XML feed rather than JSON; parsed with regex to avoid a new dependency.
  async personio(src) {
    const xml = await getText(`https://${src.slug}.jobs.personio.de/xml`);
    const out = [];
    for (const m of xml.matchAll(/<position>([\s\S]*?)<\/position>/g)) {
      const b = m[1];
      const pick = t => {
        const r = b.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`));
        return r ? decodeEntities(r[1].replace(/^<!\[CDATA\[|\]\]>$/g, '')).trim() : '';
      };
      const id = pick('id');
      if (!id) continue;
      out.push(job('personio', src.slug, src.name, id, pick('name'), pick('office'),
        `https://${src.slug}.jobs.personio.de/job/${id}`, stripHtml(pick('jobDescriptions')), pick('createdAt')));
    }
    return out;
  },

  // Germany-wide free aggregate. Broad, so it leans hard on the stage-1 filter.
  // Follows links.next, but capped: their API docs ask callers not to hammer it.
  async arbeitnow() {
    const out = [];
    let url = 'https://www.arbeitnow.com/api/job-board-api';
    for (let page = 0; page < ARBEITNOW_MAX_PAGES && url; page++) {
      const d = await getJson(url);
      for (const j of d.data || []) {
        out.push(job('arbeitnow', 'arbeitnow', j.company_name, j.slug, j.title,
          j.remote ? `${j.location || ''} (remote)` : j.location,
          j.url, stripHtml(j.description),
          j.created_at ? new Date(j.created_at * 1000).toISOString() : null));
      }
      url = (d.links && d.links.next) || null;
      if (url) await sleep(ARBEITNOW_PAGE_DELAY);
    }
    return dedupeById(out);
  },
};

const SOURCE_TYPES = Object.keys(FETCHERS);

async function fetchSource(src) {
  const fn = FETCHERS[src.type];
  if (!fn) return { jobs: [], error: `unknown source type "${src.type}"` };
  try {
    return { jobs: await fn(src), error: null };
  } catch (e) {
    return { jobs: [], error: e.message };
  }
}

// --- stage 1: deterministic filter ----------------------------------------

const EN_STOPWORDS = ['the', 'and', 'you', 'with', 'for', 'our', 'we ', 'your', 'will', 'to '];
const GERMAN_REQUIRED = /(?:flie(?:ß|ss)end|verhandlungssicher)[^.]{0,40}deutsch|deutsch[^.]{0,40}(?:c1|c2|b2|muttersprache|niveau)|sehr gute deutschkenntnisse|(?:fluent|native|proficient)[^.]{0,30}\bgerman\b|\bgerman\b[^.]{0,30}(?:fluent|native|c1|c2|is a must|required)/i;

function looksEnglish(text) {
  const t = ' ' + String(text || '').toLowerCase().slice(0, 2000) + ' ';
  if (t.trim().length < 120) return true; // too short to judge — don't drop on a guess
  return EN_STOPWORDS.filter(w => t.includes(' ' + w.trim() + ' ')).length >= 4;
}

// Filler that sits alongside "Remote" without naming a place to be in.
const LOCATION_NOISE = ['hybrid', 'onsite', 'on site', 'in office', 'office', 'flexible', 'optional',
  'friendly', 'first', 'only', 'based', 'eligible', 'time ?zone', 'or', 'and', 'any'];

// Short region tokens ("us", "uk") need word boundaries or they match inside Austin and Ukraine.
const termRe = t => new RegExp('(^|[^a-z0-9])' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z0-9]|$)', 'i');

// "Remote" on its own is workable from Berlin. "Remote, US" is not. A region you can't work in
// vetoes the posting unless a region you CAN work in is also named, which covers
// "Remote, US; Remote, Germany".
function locationVerdict(loc, f) {
  if (!loc) return 'keep'; // unset location is kept on purpose; dropping it would hide real remote roles
  const allows = (f.locationInclude || []).map(s => s.toLowerCase());
  const denies = (f.locationExclude || []).map(s => s.toLowerCase());
  const remotes = (f.remoteTerms || []).map(s => s.toLowerCase());

  const hasAllow = allows.some(k => termRe(k).test(loc));
  const hasDeny = denies.some(k => termRe(k).test(loc));
  const isRemote = remotes.some(k => termRe(k).test(loc));

  if (hasAllow) return 'keep';
  if (hasDeny) return 'region';        // remote, but scoped to somewhere you can't work

  // A remote posting qualified by a place — "Remote, Bangalore" — is still region-locked, and
  // naming every city on earth in the exclude list doesn't scale. So strip the remote words and
  // the filler; anything left is a place you'd have to be in.
  if (isRemote) {
    const leftover = remotes.concat(LOCATION_NOISE)
      .reduce((s, t) => s.replace(new RegExp(t, 'gi'), ' '), loc)
      .replace(/[^a-z]+/gi, ' ').trim();
    return leftover ? 'region' : 'keep';
  }
  return allows.length ? 'location' : 'keep';
}

function stage1Filter(j, f) {
  const title = j.title.toLowerCase();
  const loc = j.location.toLowerCase();

  const inc = (f.titleInclude || []).map(s => s.toLowerCase());
  if (inc.length && !inc.some(k => title.includes(k))) return { keep: false, reason: 'title-no-match' };

  const exc = (f.titleExclude || []).map(s => s.toLowerCase());
  const hitExc = exc.find(k => title.includes(k));
  if (hitExc) return { keep: false, reason: `title-excluded:${hitExc}` };

  const lv = locationVerdict(loc, f);
  if (lv !== 'keep') return { keep: false, reason: lv === 'region' ? 'location-region' : 'location' };

  if (f.excludeIfGermanRequired && GERMAN_REQUIRED.test(j.description)) {
    return { keep: false, reason: 'german-required' };
  }
  if (f.requireEnglishDescription && j.description && !looksEnglish(j.description)) {
    return { keep: false, reason: 'not-english' };
  }
  return { keep: true, reason: null };
}

// --- stage 2: deterministic ranking ---------------------------------------

function rankJobs(jobs, resumeText) {
  return jobs
    .map(j => {
      let score = null;
      try {
        const text = (j.title + '\n' + j.description).trim();
        if (text.length > 80) {
          const a = computeAtsScore(text, resumeText);
          score = a ? a.score : null;
        }
      } catch (_) { /* ranking is best-effort; an unscored job still surfaces, just lower */ }
      return { ...j, atsScore: score };
    })
    .sort((a, b) => (b.atsScore ?? -1) - (a.atsScore ?? -1));
}

// --- config + state --------------------------------------------------------

async function loadConfig() {
  return JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8'));
}

async function saveConfig(cfg) {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n');
  return cfg;
}

async function loadState() {
  try {
    return JSON.parse(await fs.readFile(STATE_PATH, 'utf8'));
  } catch (_) {
    return { seen: {}, results: [], dropped: [], lastRun: null, sourceErrors: [] };
  }
}

async function saveState(s) {
  await fs.mkdir(STATE_DIR, { recursive: true });
  // `dropped` is persisted separately; never let a stale copy ride along in state.json.
  const { dropped, ...rest } = s;
  await fs.writeFile(STATE_PATH, JSON.stringify(rest, null, 2) + '\n');
  return s;
}

// --- dropped (the "Dropped by the filter" audit trail) ---------------------
// Read only by the results endpoint, so it can be large without slowing anything else down.

async function loadDropped() {
  try {
    const d = JSON.parse(await fs.readFile(DROPPED_PATH, 'utf8'));
    if (Array.isArray(d)) return { rows: d, tallies: [] };          // pre-split format
    return { rows: d.rows || [], tallies: d.tallies || [] };
  } catch (_) {
    return { rows: [], tallies: [] };
  }
}

async function saveDropped(d) {
  await fs.mkdir(STATE_DIR, { recursive: true });
  await fs.writeFile(DROPPED_PATH, JSON.stringify(d, null, 2) + '\n');
  return d;
}

// One-time lift of an existing inline state.dropped into the new file.
async function migrateDropped(state) {
  if (!Array.isArray(state.dropped) || !state.dropped.length) return;
  const cur = await loadDropped();
  if (cur.rows.length) return;
  await saveDropped({ rows: state.dropped, tallies: [] });
}

// Reason counts survive even when individual rows age out, so the distribution stays
// checkable for false negatives past the row cap.
function tallyReasons(dropped) {
  const counts = {};
  for (const d of dropped) {
    const key = String(d.reason || 'unknown').split(':')[0];
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function pruneOld(state, keepDays, dropped) {
  const cutoff = Date.now() - keepDays * 86400000;
  const fresh = r => !r.foundAt || new Date(r.foundAt).getTime() >= cutoff;
  if (dropped) {
    dropped.rows = (dropped.rows || []).filter(fresh);
    dropped.tallies = (dropped.tallies || []).filter(fresh);
  }
  for (const [uid, ts] of Object.entries(state.seen || {})) {
    if (new Date(ts).getTime() < Date.now() - 120 * 86400000) delete state.seen[uid];
  }
  return state;
}

// --- the run ---------------------------------------------------------------
// Fetch → dedupe against seen → stage 1 → rank. Grading (stage 3) stays in server.js
// because it needs the Claude runner; this module stays free and testable.

// Fetch every enabled board once. Both the nightly run and ad-hoc search share it rather than
// each having their own fetch path. Politeness is handled per-request in hostGate, not here,
// so paginating fetchers are throttled too.
async function fetchAllSources(cfg, log = () => {}) {
  const sources = (cfg.sources || []).filter(s => s.enabled !== false);
  const sourceErrors = [];
  const timings = [];
  const all = [];

  const limits = cfg.limits || {};
  const concurrency = Math.max(1, limits.fetchConcurrency || 10);

  const queue = [...sources];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const src = queue.shift();
      const t0 = Date.now();
      const { jobs, error } = await fetchSource(src);
      const ms = Date.now() - t0;
      timings.push({ source: src.name || src.slug, type: src.type, ms, count: jobs.length });
      if (error) sourceErrors.push({ source: src.name || src.slug, type: src.type, error });
      else log(`${src.name || src.slug}: ${jobs.length}`);
      all.push(...jobs);
    }
  });
  await Promise.all(workers);

  // Slowest boards first, so one bad source is attributable instead of just "the run got slow".
  timings.sort((a, b) => b.ms - a.ms);

  const byUid = new Map();
  for (const j of all) if (!byUid.has(j.uid)) byUid.set(j.uid, j);
  return { jobs: [...byUid.values()], fetched: all.length, sourceErrors, timings };
}

async function runDiscovery(cfg, state, resumeText, log = () => {}) {
  const { jobs: unique, fetched, sourceErrors, timings } = await fetchAllSources(cfg, log);
  const all = { length: fetched };

  const seen = state.seen || {};
  const fresh = unique.filter(j => !seen[j.uid]);

  const kept = [], dropped = [];
  const now = new Date().toISOString();
  for (const j of fresh) {
    const r = stage1Filter(j, cfg.filters || {});
    if (r.keep) kept.push(j);
    else dropped.push({ uid: j.uid, company: j.company, title: j.title, location: j.location, url: j.url, reason: r.reason, foundAt: now });
  }

  const ranked = rankJobs(kept, resumeText);

  return {
    ranked,
    dropped,
    sourceErrors,
    timings,
    stats: {
      fetched: all.length,
      unique: unique.length,
      alreadySeen: unique.length - fresh.length,
      passedStage1: kept.length,
      droppedStage1: dropped.length,
      dropReasons: tallyReasons(dropped),
      sourcesFetched: (cfg.sources || []).filter(s => s.enabled !== false).length,
    },
  };
}

module.exports = {
  runDiscovery, fetchAllSources, fetchSource, stage1Filter, locationVerdict, rankJobs, looksEnglish, stripHtml,
  loadConfig, saveConfig, loadState, saveState, pruneOld,
  loadDropped, saveDropped, migrateDropped, tallyReasons,
  SOURCE_TYPES, CONFIG_PATH, STATE_PATH, DROPPED_PATH,
};

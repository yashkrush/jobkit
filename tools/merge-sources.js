#!/usr/bin/env node
// tools/merge-sources.js — merge tools/out/validated-sources.json into discover-config.json.
//
// Deliberately conservative:
//   - dedupes on type+slug, keeping whatever is already configured
//   - never touches filters, or any of the limits that control spend (maxGradedPerRun,
//     minAtsToGrade) or the nightly scheduler (enabled, scheduleHour)
//   - keeps arbeitnow, which has no slug to validate
//   - reports (and by default REMOVES) configured boards the validator proved dead, since a
//     dead board is silence rather than an error
//
// Usage:
//   node tools/merge-sources.js --dry     # show what would change
//   node tools/merge-sources.js           # write it
//   node tools/merge-sources.js --keep-dead

const fs = require('fs').promises;
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'discover-config.json');
const VALIDATED_PATH = path.join(__dirname, 'out', 'validated-sources.json');

// Spend and schedule are the user's call, never a side effect of adding sources.
const PROTECTED = ['enabled', 'scheduleHour'];
const PROTECTED_LIMITS = ['maxGradedPerRun', 'minAtsToGrade'];

async function main() {
  const argv = process.argv.slice(2);
  const dry = argv.includes('--dry');
  const keepDead = argv.includes('--keep-dead');

  const cfg = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8'));
  const validated = JSON.parse(await fs.readFile(VALIDATED_PATH, 'utf8'));

  const before = JSON.stringify({
    top: PROTECTED.map(k => cfg[k]),
    limits: PROTECTED_LIMITS.map(k => (cfg.limits || {})[k]),
    filters: cfg.filters,
  });

  const validKeys = new Set(validated.map(v => `${v.type}:${v.slug}`));
  const existing = new Map((cfg.sources || []).map(s => [`${s.type}:${s.slug}`, s]));

  const added = [];
  const kept = [];
  const dead = [];

  for (const [key, s] of existing) {
    if (s.type === 'arbeitnow') { kept.push(s); continue; }
    if (validKeys.has(key)) { kept.push(s); continue; }
    dead.push(s);
  }

  const out = [];
  for (const s of kept) {
    const v = validated.find(x => `${x.type}:${x.slug}` === `${s.type}:${s.slug}`);
    // Refresh provenance and adopt the group, but keep the user's enabled flag and display name.
    out.push(v ? { ...s, group: s.group || v.group, verified: v.verified } : s);
  }
  if (keepDead) out.push(...dead);

  for (const v of validated) {
    if (existing.has(`${v.type}:${v.slug}`)) continue;
    out.push(v);
    added.push(v);
  }

  cfg.sources = out;
  // Concurrency and the reject-trail cap are new knobs; only fill them if absent.
  cfg.limits = cfg.limits || {};
  if (cfg.limits.fetchConcurrency == null) cfg.limits.fetchConcurrency = 10;
  if (cfg.limits.maxDroppedRows == null) cfg.limits.maxDroppedRows = 60000;

  const after = JSON.stringify({
    top: PROTECTED.map(k => cfg[k]),
    limits: PROTECTED_LIMITS.map(k => (cfg.limits || {})[k]),
    filters: cfg.filters,
  });
  if (before !== after) throw new Error('refusing to write: a protected setting changed');

  console.log(`sources: ${existing.size} → ${out.length}`);
  console.log(`  added ${added.length}, kept ${kept.length}, dead ${dead.length}${keepDead ? ' (kept)' : ' (removed)'}`);
  if (dead.length) {
    console.log('\nDead boards (validator found no postings):');
    for (const d of dead) console.log(`  ${d.type}:${d.slug}  (${d.name})`);
  }
  const byGroup = {};
  for (const s of out) byGroup[s.group || 'ungrouped'] = (byGroup[s.group || 'ungrouped'] || 0) + 1;
  console.log('\nby group:', Object.entries(byGroup).map(([k, v]) => `${k}=${v}`).join(', '));
  console.log(`\nprotected & unchanged: enabled=${cfg.enabled}, scheduleHour=${cfg.scheduleHour}, ` +
    `maxGradedPerRun=${cfg.limits.maxGradedPerRun}, minAtsToGrade=${cfg.limits.minAtsToGrade}`);

  if (dry) return console.log('\n--dry: nothing written.');
  await fs.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n');
  console.log(`\nwrote ${path.relative(ROOT, CONFIG_PATH)}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });

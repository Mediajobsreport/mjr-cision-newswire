import { join } from "node:path";
import {
  BACKFILL_HOURS, CODES_FILE, FEED_NAMES, FORCE_BACKFILL, GEOGRAPHY, LANGUAGE, LIST_FIELDS, PAGE_URLS,
  OUTPUT_DIR, OVERLAP_MINUTES, RETENTION_DAYS, STATE_FILE
} from "./config.js";
import { CisionClient, formatCisionDate, parseCisionDate } from "./cision-client.js";
import { classifyRelease } from "./classifier.js";
import { readJson, writeJsonAtomic } from "./storage.js";

const login = process.env.CISION_LOGIN;
const password = process.env.CISION_PASSWORD;
const client = new CisionClient({ login, password });
const now = new Date();
const state = await readJson(STATE_FILE, { version: 1, last_successful_poll: null });
const existingMaster = await readJson(join(OUTPUT_DIR, "master.json"), { releases: [] });
const master = new Map(existingMaster.releases.map((release) => [release.release_id, release]));

const collegeBackfill = process.env.CISION_COLLEGE_BACKFILL === "true";
const collegeStateFile = "data/college-backfill-state.json";
const collegeState = collegeBackfill ? await readJson(collegeStateFile, null) : null;
if (collegeBackfill && collegeState?.complete) {
  console.log("College historical backfill already completed.");
  process.exit(0);
}
const fallbackStart = new Date(now.getTime() - boundedBackfillHours() * 60 * 60_000);
const previousPoll = !FORCE_BACKFILL && state.last_successful_poll ? new Date(state.last_successful_poll) : fallbackStart;
const normalStart = new Date(Math.max(
  now.getTime() - 365 * 24 * 60 * 60_000,
  previousPoll.getTime() - OVERLAP_MINUTES * 60_000
));

const backfillAnchor = collegeState?.anchor || now.toISOString();
const start = collegeBackfill
  ? new Date(collegeState?.next_start || new Date(new Date(backfillAnchor).getTime() - 90 * 24 * 60 * 60_000).toISOString())
  : normalStart;
const queryEnd = collegeBackfill
  ? new Date(Math.min(new Date(backfillAnchor).getTime(), start.getTime() + 12 * 60 * 60_000))
  : now;
const codeMaps = await loadCodeMaps(client);
const summariesById = new Map();
const chunkDays = 3;
for (let cursor = start.getTime(); cursor < queryEnd.getTime();) {
  const end = new Date(Math.min(queryEnd.getTime(), cursor + chunkDays * 24 * 60 * 60_000));
  const chunk = await client.getAllReleases({
    show_del: "true",
    mod_startdate: formatCisionDate(new Date(cursor)),
    mod_enddate: formatCisionDate(end),
    geography: GEOGRAPHY,
    language: LANGUAGE,
    fields: LIST_FIELDS
  });
  for (const release of chunk) {
    if (release.release_id) summariesById.set(release.release_id, release);
  }
  console.log(`Cision window ${new Date(cursor).toISOString()} to ${end.toISOString()}: ${chunk.length} releases`);
  cursor = end.getTime();
}
const summaries = [...summariesById.values()];

let fetched = 0;
let deleted = 0;
let rejected = 0;
let failed = 0;
for (const summary of summaries) {
  if (!summary.release_id) continue;
  if (summary.status === "DELETED" || summary.url === null) {
    if (master.delete(summary.release_id)) deleted += 1;
    continue;
  }

  if (collegeBackfill && master.has(summary.release_id)) continue;
  const preliminary = classifyRelease(summary, codeMaps);
  if (collegeBackfill && !preliminary.categories.includes("college")) continue;
  if (!preliminary.categories.length && !preliminary.review) {
    rejected += 1;
    continue;
  }

  let full;
  try {
    full = await client.getRelease(summary.release_id);
  } catch (error) {
    failed += 1;
    console.error(`Skipping Cision release ${summary.release_id} after retries: ${error.message}`);
    continue;
  }
  fetched += 1;
  const classification = classifyRelease({ ...summary, ...full }, codeMaps);
  if (collegeBackfill && !classification.categories.includes("college")) continue;
  if (!classification.categories.length && !classification.review) {
    master.delete(summary.release_id);
    rejected += 1;
    continue;
  }
  master.set(summary.release_id, {
    ...summary,
    ...full,
    mjr_categories: classification.categories,
    mjr_review: classification.review,
    mjr_classification: classification,
    imported_at: new Date().toISOString()
  });
}

// Reapply current rules to retained releases so classifier updates do not
// leave stale categories in the feeds.
for (const [id, release] of master) {
  const classification = classifyRelease(release, codeMaps);
  if (!classification.categories.length && !classification.review) {
    master.delete(id);
    continue;
  }
  master.set(id, {
    ...release,
    mjr_categories: classification.categories,
    mjr_review: classification.review,
    mjr_classification: classification
  });
}

const cutoff = now.getTime() - Math.max(RETENTION_DAYS, 90) * 24 * 60 * 60_000;
for (const [id, release] of master) {
  const releaseDate = parseCisionDate(release.date)?.getTime();
  if (releaseDate && releaseDate < cutoff) master.delete(id);
}

const releases = deduplicateReleases([...master.values()])
  .sort((a, b) => String(b.date).localeCompare(String(a.date)));
await writeOutputs(releases, now);
if (collegeBackfill) await writeJsonAtomic(collegeStateFile, {
  anchor: backfillAnchor,
  next_start: queryEnd.toISOString(),
  complete: queryEnd.getTime() >= new Date(backfillAnchor).getTime(),
  last_successful_batch: now.toISOString(),
  releases_seen: summaries.length,
  releases_fetched: fetched
});
else await writeJsonAtomic(STATE_FILE, {
  version: 1,
  last_successful_poll: now.toISOString(),
  last_window_start: start.toISOString(),
  releases_seen: summaries.length,
  full_releases_fetched: fetched,
  releases_deleted: deleted,
  releases_rejected: rejected,
  releases_failed: failed,
  releases_retained: releases.length
});

console.log(JSON.stringify({
  window_start: start.toISOString(),
  window_end: now.toISOString(),
  seen: summaries.length,
  fetched,
  deleted,
  rejected,
  failed,
  retained: releases.length
}));

async function loadCodeMaps(api) {
  const cached = await readJson(CODES_FILE, null);
  const cachedAt = cached?.updated_at ? new Date(cached.updated_at).getTime() : 0;
  if (cached && Date.now() - cachedAt < 7 * 24 * 60 * 60_000) return cached.maps;

  const maps = {};
  for (const type of ["industry", "subject", "geography", "language"]) {
    const payload = await api.getCodes(type);
    const rows = Array.isArray(payload) ? payload : payload.data || [];
    maps[type] = Object.fromEntries(rows.map(({ code, name }) => [code, name]));
  }
  await writeJsonAtomic(CODES_FILE, { updated_at: new Date().toISOString(), maps });
  return maps;
}

async function writeOutputs(all, generatedAt) {
  const common = {
    generated_at: generatedAt.toISOString(),
    source: "Cision Content API / PR Newswire",
    content_policy: "Original release content is preserved; MJR fields are classification metadata only."
  };
  await writeJsonAtomic(join(OUTPUT_DIR, "master.json"), { ...common, count: all.length, releases: all });
  for (const name of FEED_NAMES) {
    const feedCutoff = generatedAt.getTime() - (name === "college" ? 90 : RETENTION_DAYS) * 24 * 60 * 60_000;
    const recent = all.filter((release) => {
      const date = parseCisionDate(release.date)?.getTime();
      return !date || date >= feedCutoff;
    });
    const selected = name === "review"
      ? recent.filter((release) => release.mjr_review)
      : recent.filter((release) => release.mjr_categories?.includes(name));
    await writeJsonAtomic(join(OUTPUT_DIR, `${name}.json`), {
      ...common,
      category: name,
      page_url: PAGE_URLS[name] || null,
      count: selected.length,
      releases: selected
    });
  }
}

function boundedBackfillHours() {
  if (!Number.isFinite(BACKFILL_HOURS)) return 24;
  return Math.min(8760, Math.max(1, BACKFILL_HOURS));
}

function deduplicateReleases(releases) {
  const unique = new Map();
  for (const release of releases) {
    const title = String(release.title || "")
      .toLowerCase()
      .replace(/&amp;/g, "&")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    if (!title) continue;
    const existing = unique.get(title);
    if (!existing || String(release.date || "") > String(existing.date || "")) {
      unique.set(title, release);
    }
  }
  return [...unique.values()];
}

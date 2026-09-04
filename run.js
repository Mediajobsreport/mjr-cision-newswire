import { join } from "node:path";
import {
  BACKFILL_HOURS, CODES_FILE, FEED_NAMES, GEOGRAPHY, LANGUAGE, LIST_FIELDS, PAGE_URLS,
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

const fallbackStart = new Date(now.getTime() - boundedBackfillHours() * 60 * 60_000);
const previousPoll = state.last_successful_poll ? new Date(state.last_successful_poll) : fallbackStart;
const start = new Date(Math.max(
  now.getTime() - 365 * 24 * 60 * 60_000,
  previousPoll.getTime() - OVERLAP_MINUTES * 60_000
));

const codeMaps = await loadCodeMaps(client);
const summaries = await client.getAllReleases({
  show_del: "true",
  mod_startdate: formatCisionDate(start),
  mod_enddate: formatCisionDate(now),
  geography: GEOGRAPHY,
  language: LANGUAGE,
  fields: LIST_FIELDS
});

let fetched = 0;
let deleted = 0;
let rejected = 0;
for (const summary of summaries) {
  if (!summary.release_id) continue;
  if (summary.status === "DELETED" || summary.url === null) {
    if (master.delete(summary.release_id)) deleted += 1;
    continue;
  }

  const preliminary = classifyRelease(summary, codeMaps);
  if (!preliminary.categories.length && !preliminary.review) {
    rejected += 1;
    continue;
  }

  const full = await client.getRelease(summary.release_id);
  fetched += 1;
  const classification = classifyRelease({ ...summary, ...full }, codeMaps);
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

const cutoff = now.getTime() - RETENTION_DAYS * 24 * 60 * 60_000;
for (const [id, release] of master) {
  const releaseDate = parseCisionDate(release.date)?.getTime();
  if (releaseDate && releaseDate < cutoff) master.delete(id);
}

const releases = [...master.values()].sort((a, b) => String(b.date).localeCompare(String(a.date)));
await writeOutputs(releases, now);
await writeJsonAtomic(STATE_FILE, {
  version: 1,
  last_successful_poll: now.toISOString(),
  last_window_start: start.toISOString(),
  releases_seen: summaries.length,
  full_releases_fetched: fetched,
  releases_deleted: deleted,
  releases_rejected: rejected,
  releases_retained: releases.length
});

console.log(JSON.stringify({
  window_start: start.toISOString(),
  window_end: now.toISOString(),
  seen: summaries.length,
  fetched,
  deleted,
  rejected,
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
    const selected = name === "review"
      ? all.filter((release) => release.mjr_review)
      : all.filter((release) => release.mjr_categories?.includes(name));
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

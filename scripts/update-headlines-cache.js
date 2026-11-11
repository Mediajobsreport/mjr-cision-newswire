const fs = require("node:fs");
const path = require("node:path");

const API = "https://api.gdeltproject.org/api/v2/doc/doc";
const OUTPUT_DIR = path.join(process.cwd(), "data", "headlines");
const CONFIG = {
  all: {
    query: "sourcecountry:us sourcelang:english",
    fallback: "when:1d United States news"
  },
  entertainment: {
    query: 'sourcecountry:us sourcelang:english (movie OR film OR television OR streaming OR actor OR actress OR singer OR music OR celebrity OR Hollywood OR album OR tour OR gossip OR "red carpet" OR "box office" OR casting OR scandal OR relationship)',
    fallback: "when:1d (movie OR film OR television OR streaming OR actor OR actress OR singer OR music OR celebrity OR Hollywood OR album OR tour OR gossip)"
  }
};
const BAD = /\b(sponsored|paid content|promoted|horoscope|crossword|wordle|newsletter|subscribe|stock quote|crypto prices|box score|scoreboard|live updates|live blog|watch live|press release|coupon|sale ends)\b/i;
const HEADERS = { "User-Agent": "MJR-Prep-Headlines/1.0 (MediaJobsReport)", "Accept": "application/json, application/rss+xml, application/xml, text/xml" };

function decodeXml(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}
function tidyTitle(value) {
  return decodeXml(value).replace(/<\/?[^>]+>/g, "").replace(/\s+/g, " ").trim();
}
function validArticle(title, url) {
  if (!title || title.length < 18 || title.length > 240 || BAD.test(title)) return false;
  try { return /^https?:$/.test(new URL(url).protocol); } catch (_) { return false; }
}
function normalizeTitle(title) {
  return title.toLowerCase().replace(/\s+-\s+[^-]+$/, "").replace(/[^a-z0-9]+/g, " ").trim();
}
function parseRss(xml) {
  const articles = [];
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];
  for (const item of items) {
    const tag = name => {
      const re = new RegExp("<" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/" + name + ">", "i");
      const match = item.match(re);
      return match ? decodeXml(match[1]) : "";
    };
    let title = tidyTitle(tag("title"));
    let url = tag("link");
    if (!/^https?:/i.test(url)) {
      const m = item.match(/<link\b[^>]*href=["']([^"']+)["']/i);
      if (m) url = decodeXml(m[1]);
    }
    const date = Date.parse(tag("pubDate"));
    let domain = "";
    try { domain = new URL(url).hostname.replace(/^www\./, ""); } catch (_) {}
    if (validArticle(title, url)) articles.push({
      title: title.replace(/\s+-\s+[^-]+$/, "").trim(),
      url,
      domain,
      seendate: date ? new Date(date).toISOString().replace(/[-:TZ.]/g, "").slice(0,14) : ""
    });
  }
  return articles;
}
async function timedFetch(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18000);
  try {
    const response = await fetch(url, { headers: HEADERS, signal: controller.signal, redirect: "follow" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    return response;
  } finally { clearTimeout(timer); }
}
async function fromGdelt(query) {
  const url = new URL(API);
  url.search = new URLSearchParams({
    query, mode: "artlist", format: "json", timespan: "24h", maxrecords: "100", sort: "hybridrel"
  }).toString();
  const response = await timedFetch(url);
  const payload = await response.json();
  if (!Array.isArray(payload.articles)) throw new Error("GDELT returned no article list");
  return payload.articles.map(x => ({
    title: tidyTitle(x.title),
    url: String(x.url || ""),
    domain: String(x.domain || ""),
    seendate: String(x.seendate || "")
  })).filter(x => validArticle(x.title, x.url));
}
async function fromGoogle(query) {
  const url = new URL("https://news.google.com/rss/search");
  url.search = new URLSearchParams({ q: query, hl: "en-US", gl: "US", ceid: "US:en" }).toString();
  const response = await timedFetch(url);
  return parseRss(await response.text());
}
function dedupe(articles) {
  const seen = new Set();
  return articles.filter(x => {
    const key = normalizeTitle(x.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 60);
}
async function collect(category) {
  const cfg = CONFIG[category];
  try {
    const articles = dedupe(await fromGdelt(cfg.query));
    if (articles.length) return { articles, source: "GDELT" };
  } catch (e) {
    console.warn(category + ": GDELT unavailable: " + e.message);
  }
  const articles = dedupe(await fromGoogle(cfg.fallback));
  if (articles.length) return { articles, source: "Google News RSS fallback" };
  throw new Error("No articles returned for " + category + " from GDELT or Google News");
}
async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const updated = new Date().toISOString();
  for (const category of Object.keys(CONFIG)) {
    const result = await collect(category);
    const output = {
      updated,
      source: result.source,
      category,
      articles: result.articles
    };
    fs.writeFileSync(path.join(OUTPUT_DIR, category + ".json"), JSON.stringify(output, null, 2) + "\n");
    console.log(category + ": " + result.articles.length + " headlines from " + result.source);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

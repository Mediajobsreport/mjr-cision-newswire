import fs from "node:fs";
import path from "node:path";

const API = "https://api.gdeltproject.org/api/v2/doc/doc";
const OUTPUT_DIR = path.join(process.cwd(), "data", "headlines");
const CONFIG = {
  all: {
    query: "sourcecountry:us sourcelang:english",
    fallback: null
  },
  strange: {
    query: 'sourcecountry:us sourcelang:english (bizarre OR quirky OR oddities OR "weird news" OR "world record" OR "unusual discovery")',
    fallback: 'when:7d ("weird news" OR bizarre OR quirky OR oddities OR "Guinness World Records" OR "unusual discovery")',
    timespan: "7d"
  },
  positive: {
    query: 'sourcecountry:us sourcelang:english ("act of kindness" OR "good samaritan" OR "heartwarming" OR "reunited" OR "rescued" OR "surprise donation" OR "pet adoption" OR "animal recovery" OR "conservation success")',
    fallback: 'when:7d ("act of kindness" OR "good samaritan" OR heartwarming OR "reunited" OR "rescued" OR "surprise donation" OR "pays off school lunch debt" OR "pet adoption" OR "animal recovery" OR "conservation success")',
    timespan: "7d"
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
    const sourceMatch = item.match(/<source\b[^>]*url=["\']([^"\']+)["\'][^>]*>([\s\S]*?)<\/source>/i);
    let publisherDomain = domain;
    if (sourceMatch) { try { publisherDomain = new URL(decodeXml(sourceMatch[1])).hostname.replace(/^www\./, ""); } catch (_) {} }
    if (validArticle(title, url)) articles.push({
      title: title.replace(/\s+-\s+[^-]+$/, "").trim(),
      url,
      domain: publisherDomain,
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
async function fromGdelt(query, timespan = "24h") {
  const url = new URL(API);
  url.search = new URLSearchParams({
    query, mode: "artlist", format: "json", timespan, maxrecords: "100", sort: "hybridrel"
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
  const url = new URL(query ? "https://news.google.com/rss/search" : "https://news.google.com/rss");
  url.search = new URLSearchParams(Object.assign(query ? { q: query } : {}, { hl: "en-US", gl: "US", ceid: "US:en" })).toString();
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

function categoryArticles(category, articles, curated = false) {
  if (category !== "strange" && category !== "positive") return articles;
  const unwanted = /\b(trump|biden|election|senator|congress|democrat|republican|politics|political|putin|murder|homicide|stabbing|stabbed|dead|killed|fatal|death toll|war|airstrike|horoscope|zodiac|review|trailer|jojo|anime|gacha|opinion|column|home lists|game codes)\b/i;
  const strange = /\b(bizarre|quirky|oddities|oddity|weird|strange|unusual|guinness|world record|world's (?:largest|smallest|oldest)|mysterious|mystery|unexpected discovery)\b/i;
  const positive = /\b(kindness|good samaritan|heartwarming|reunit(?:e|ed|es)|rescu(?:e|ed|es)|saved|saves|hero|heroes|donat(?:e|es|ed|ion|ions)|fundrais(?:er|ing)|generosity|pays off|paid off|grants? wish|wish comes true|helps? (?:famil|children|community)|adopt(?:ed|ion)|recovery|conservation success|endangered species comeback)\b/i;
  return articles.filter(item => {
    if (unwanted.test(item.title)) return false;
    if (category === "strange" && /\b(nfl|nba|nhl|mlb|football|basketball|quarterback|referee|kickoff|podium|f1|red card|playoffs|lakers|giants|browns|ravens|yankees|joestar|malkovich)\b/i.test(item.title)) return false;
    if (curated && /\bgood news in history|this day in history|good news horoscopes|quote of the day|good news quiz\b/i.test(item.title)) return false;
    const stamp = String(item.seendate || "");
    const m = stamp.match(/^(\d{4})(\d{2})(\d{2})/);
    if (!m) return false;
    const age = Date.now() - Date.UTC(+m[1], +m[2]-1, +m[3]);
    if (age > 8 * 86400000 || age < -86400000) return false;
    return curated || (category === "strange" ? strange : positive).test(item.title);
  });
}

async function collect(category) {
  const cfg = CONFIG[category];
  if (category === "strange" || category === "positive") {
    const feed = category === "strange" ? "https://rss.upi.com/news/odd_news.rss" : "https://www.goodnewsnetwork.org/category/news/feed/";
    try {
      const response = await timedFetch(feed);
      const articles = dedupe(categoryArticles(category, parseRss(await response.text()), true));
      if (articles.length >= 6) return { articles, source: category === "strange" ? "UPI Odd News" : "Good News Network" };
    } catch (e) {
      console.warn(category + ": dedicated feed unavailable: " + e.message);
    }
  }
  try {
    const articles = dedupe(categoryArticles(category, await fromGdelt(cfg.query, cfg.timespan)));
    if (articles.length) return { articles, source: "GDELT" };
  } catch (e) {
    console.warn(category + ": GDELT unavailable: " + e.message);
  }
  let articles = dedupe(categoryArticles(category, await fromGoogle(cfg.fallback)));
  const entertainmentTopic = /\b(movie|movies|film|television|tv|streaming|actor|actress|singer|music|celebrity|hollywood|album|tour dates|gossip|red carpet|box office|casting|grammy|emmy|oscar|broadway|concert|podcast|netflix|disney|paramount|hbo|spotify)\b/i;
  if (category === "all") articles = articles.filter(item => !entertainmentTopic.test(item.title));
  if (category === "entertainment") {
    const entertainment = /\b(movie|movies|film|television|tv|streaming|actor|actress|singer|music|celebrity|hollywood|album|tour|gossip|red carpet|box office|casting|scandal|relationship|grammy|emmy|oscar|broadway|concert|podcast|netflix|disney|paramount|hbo|spotify)\b/i;
    const offTopic = /\b(crash|accident|bail|dui|metro station|shooting|homicide|murder|traffic|weather|election|senator|congress|court ruling|football|eagles|giants|nfl|nba|wnba|nhl|mlb|atp tour|film room)\b/i;
    articles = articles.filter(item => entertainment.test(item.title) && !offTopic.test(item.title));
  }
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

const fs = require("fs");
const path = require("path");

const NEWSWIRE_DIR = path.join(__dirname, "..", "data", "newswire");
const OUTPUT = path.join(__dirname, "..", "data", "buzz-sitemap.xml");
const SKIP = new Set(["master.json", "review.json"]);

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function lastmod(value) {
  const m = String(value || "").match(/^(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

const urls = [];
const seen = new Set();

for (const file of fs.readdirSync(NEWSWIRE_DIR).sort()) {
  if (!file.endsWith(".json") || SKIP.has(file)) continue;

  const data = JSON.parse(fs.readFileSync(path.join(NEWSWIRE_DIR, file), "utf8"));
  const pageUrl = String(data.page_url || "").trim();
  if (!/^https:\/\/www\.mediajobsreport\.com\//i.test(pageUrl)) continue;

  for (const release of Array.isArray(data.releases) ? data.releases : []) {
    if (!release || !release.release_id || release.status !== "PUBLISHED") continue;

    const url = new URL(pageUrl);
    url.searchParams.set("release", String(release.release_id));
    const loc = url.toString();

    if (seen.has(loc)) continue;
    seen.add(loc);
    urls.push({ loc, lastmod: lastmod(release.date) });
  }
}

urls.sort((a, b) => a.loc.localeCompare(b.loc));

const lines = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
];

for (const item of urls) {
  lines.push("  <url>");
  lines.push(`    <loc>${xmlEscape(item.loc)}</loc>`);
  if (item.lastmod) lines.push(`    <lastmod>${item.lastmod}</lastmod>`);
  lines.push("  </url>");
}

lines.push("</urlset>", "");
fs.writeFileSync(OUTPUT, lines.join("\n"), "utf8");
console.log(`Generated data/buzz-sitemap.xml with ${urls.length} URLs`);

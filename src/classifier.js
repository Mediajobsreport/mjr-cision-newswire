const CATEGORY_RULES = {
  advertising: {
    strong: [
      "advertising agency", "advertising agencies", "advertising industry", "advertising platform",
      "advertising technology", "ad technology", "adtech", "media buying", "media buyer",
      "media agency", "programmatic advertising", "digital advertising", "audio advertising",
      "video advertising", "connected tv advertising", "advertising sales", "ad sales",
      "sponsorship sales", "marketing agency", "brand marketing", "audience measurement"
    ],
    weak: ["advertising", "advertiser", "marketing", "sponsorship", "media sales", "campaign"]
  },
  digital: {
    strong: [
      "digital media", "digital content", "digital publisher", "online publisher", "online media",
      "social media platform", "creator economy", "content creator platform", "web content",
      "digital news", "digital audience", "mobile media", "youtube channel", "tiktok creator"
    ],
    weak: ["digital", "social media", "online audience", "creator", "web platform"]
  },
  engineering: {
    strong: [
      "broadcast engineering", "broadcast engineer", "broadcast technology", "broadcast equipment",
      "media technology", "media workflow", "production technology", "transmitter", "rf system",
      "audio console", "broadcast automation", "master control", "production switcher",
      "camera system", "video codec", "cloud production", "remote production", "atsc 3.0",
      "nextgen tv", "studio technology", "media infrastructure", "playout system"
    ],
    weak: ["engineering", "broadcast system", "audio technology", "video technology", "technical operations"]
  },
  entertainment: {
    strong: [
      "entertainment industry", "entertainment company", "film studio", "movie studio",
      "motion picture", "film production", "television production company", "production company",
      "talent agency", "talent management", "theatrical release", "box office", "live entertainment",
      "entertainment programming", "unscripted series", "scripted series"
    ],
    weak: ["entertainment", "film", "movie", "television series", "actor", "actress", "producer"]
  },
  management: {
    strong: [
      "chief executive officer", "chief operating officer", "chief financial officer",
      "chief revenue officer", "chief technology officer", "chief marketing officer",
      "vice president", "general manager", "market manager", "station manager", "news director",
      "program director", "sales director", "board of directors", "executive leadership",
      "leadership team", "corporate restructuring", "management team"
    ],
    weak: ["appoints", "appointed", "promotes", "promoted", "names", "joins", "executive", "president"]
  },
  radio: {
    strong: [
      "radio station", "radio stations", "broadcast radio", "terrestrial radio", "radio network",
      "radio host", "radio personality", "radio show", "radio programming", "radio group",
      "am radio", "fm radio", "satellite radio", "iheartradio", "audacy", "cumulus media",
      "townsquare media", "urban one", "radio one", "beasley media", "hubbard radio",
      "salem media", "educational media foundation", "k-love", "air1", "siriusxm"
    ],
    weak: ["radio", "broadcaster", "broadcasting", "on-air", "morning show", "drive time"]
  },
  television: {
    strong: [
      "television station", "television stations", "broadcast television", "local television",
      "tv station", "tv stations", "television network", "tv network", "local tv",
      "gray media", "sinclair broadcast", "nexstar media", "tegna", "hearst television",
      "scripps", "fox television stations", "paramount television", "cbs stations",
      "nbc-owned stations", "abc owned television stations", "pbs station"
    ],
    weak: ["television", "newscast", "news anchor", "meteorologist", "tv news", "broadcast news"]
  },
  podcast: {
    strong: [
      "podcast network", "podcast networks", "podcast studio", "podcast company",
      "podcast platform", "podcast advertising", "podcast host", "podcast series"
    ],
    weak: ["podcast", "podcasts", "podcasting", "podcaster"]
  },
  tradeshow: {
    strong: [
      "trade show", "tradeshow", "industry exhibition", "exhibitor booth", "exhibition hall",
      "nab show", "nab show new york", "ibc show", "international broadcasting convention",
      "consumer electronics show", "ces 202", "smpte media technology summit",
      "radio show convention", "broadcastasia", "infocomm"
    ],
    weak: ["conference", "convention", "exhibitor", "expo", "summit", "show floor"]
  }
};

const INDUSTRY_HINTS = {
  advertising: ["advertising", "marketing"],
  digital: ["digital media", "internet media"],
  engineering: ["broadcast equipment", "communications equipment", "media technology"],
  entertainment: ["entertainment", "motion pictures", "film"],
  management: [],
  radio: ["radio", "satellite radio"],
  television: ["television", "broadcasting"],
  podcast: ["podcast"],
  tradeshow: ["trade show", "exhibition"]
};

const NEWS_SIGNALS = [
  "appoint", "named", "names", "promot", "joins", "hired", "launch", "debut",
  "acquir", "merger", "partner", "expand", "renew", "syndicat", "programming",
  "ratings", "audience", "layoff", "restructur", "agreement", "distribution",
  "broadcast", "coverage", "executive", "president", "vice president", "general manager",
  "news director", "format", "fcc", "license", "station"
];

const EXCLUSIONS = [
  "coupon", "holiday gift guide", "recipe", "sweepstakes", "shopping deal",
  "limited-time discount", "grand opening sale", "consumer survey giveaway"
];

export function classifyRelease(release, codeMaps = {}) {
  const text = normalizedText(release);
  const industryNames = (release.industry || [])
    .map((code) => codeMaps.industry?.[code])
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const newsScore = NEWS_SIGNALS.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0);
  const excluded = EXCLUSIONS.some((term) => text.includes(term));
  const scores = {};
  const reasons = {};

  for (const [category, rules] of Object.entries(CATEGORY_RULES)) {
    let score = 0;
    const matches = [];
    for (const term of rules.strong) {
      if (text.includes(term)) {
        score += 4;
        matches.push(term);
      }
    }
    for (const term of rules.weak) {
      if (text.includes(term)) {
        score += 1;
        matches.push(term);
      }
    }
    for (const hint of INDUSTRY_HINTS[category] || []) {
      if (industryNames.includes(hint)) {
        score += 3;
        matches.push(`industry:${hint}`);
      }
    }
    scores[category] = score;
    reasons[category] = [...new Set(matches)].slice(0, 8);
  }

  const categories = Object.keys(scores).filter((category) => {
    if (excluded) return false;
    return scores[category] >= 4 && (newsScore > 0 || scores[category] >= 8);
  });
  const bestScore = Math.max(0, ...Object.values(scores));
  const review = !excluded && categories.length === 0 && bestScore >= 1 && newsScore > 0;

  return {
    categories,
    review,
    scores,
    reasons: Object.fromEntries(Object.entries(reasons).filter(([, value]) => value.length)),
    news_score: newsScore,
    excluded
  };
}

function normalizedText(release) {
  const company = Array.isArray(release.company) ? release.company.join(" ") : release.company || "";
  const subtitle = Array.isArray(release.sub_title) ? release.sub_title.join(" ") : release.sub_title || "";
  // Deliberately exclude the full body. Corporate boilerplate often lists a
  // company's unrelated radio, TV, streaming and podcast holdings, which can
  // place an otherwise specific release into several incorrect feeds.
  return `${release.title || ""} ${release.summary || ""} ${subtitle} ${company} ${release.source_company || ""} ${release.dateline || ""}`
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

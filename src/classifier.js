const CATEGORY_RULES = {
  advertising: {
    strong: [
      "advertising agency", "advertising agencies", "advertising industry", "advertising platform",
      "advertising technology", "ad technology", "adtech", "media buying", "media buyer",
      "media agency", "programmatic advertising", "digital advertising", "audio advertising",
      "video advertising", "connected tv advertising", "advertising sales", "ad sales",
      "sponsorship sales", "marketing agency", "brand marketing", "audience measurement"
    ],
    weak: ["advertising", "advertiser", "marketing", "sponsorship", "media sales"]
  },
  digital: {
    strong: [
      "digital media", "digital content", "digital publisher", "online publisher", "online media",
      "social media platform", "creator economy", "content creator platform", "web content",
      "digital news", "digital audience", "mobile media", "youtube channel", "tiktok creator"
    ],
    weak: ["social media", "online audience", "content creator", "web publisher"]
  },
  engineering: {
    strong: [
      "broadcast engineering", "broadcast engineer", "broadcast technology", "broadcast equipment",
      "broadcast fabric", "broadcast distribution", "broadcast monitoring", "media technology",
      "media workflow", "production technology", "video ai", "transmitter", "rf system",
      "audio console", "broadcast automation", "master control", "production switcher",
      "camera system", "video codec", "cloud production", "remote production", "atsc 3.0",
      "nextgen tv", "studio technology", "media infrastructure", "playout system"
    ],
    weak: ["broadcast system", "audio technology", "video technology", "technical operations"]
  },
  entertainment: {
    strong: [
      "entertainment industry", "entertainment company", "film studio", "movie studio",
      "motion picture", "film production", "television production company", "production company",
      "talent agency", "talent management", "theatrical release", "box office", "live entertainment",
      "entertainment programming", "unscripted series", "scripted series", "music industry",
      "reality series", "film festival", "movie theater", "record label", "music publisher",
      "music publishing", "recording artist"
    ],
    weak: ["entertainment", "film", "movie", "television series", "actor", "actress", "producer", "music", "album"]
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
      "tv station", "tv stations", "television network", "tv network", "local tv", "broadcast partnership",
      "reality series", "emmy awards", "primetime emmy",
      "gray media", "sinclair broadcast", "nexstar media", "tegna", "hearst television",
      "scripps", "fox news", "fox television stations", "paramount television", "cbs stations",
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
      "trade show", "tradeshow", "nab show", "nab show new york", "ibc show",
      "international broadcasting convention", "smpte media technology summit",
      "radio show convention", "broadcastasia", "infocomm"
    ],
    weak: ["conference", "convention", "exhibitor", "expo", "summit", "show floor"]
  }
};

const INDUSTRY_CODES = {
  advertising: new Set(["ADV"]),
  digital: new Set(["MLM", "PUB", "SMD"]),
  engineering: new Set(["BRD"]),
  entertainment: new Set(["ENT", "FLM", "MUS"]),
  radio: new Set(["RAD"]),
  television: new Set(["TVN"]),
  podcast: new Set(["RAD"]),
  tradeshow: new Set([])
};

const MEDIA_CODES = new Set(["ADV", "BRD", "ENT", "FLM", "MLM", "MUS", "PUB", "RAD", "SMD", "TVN"]);

const NEWS_SIGNALS = [
  "appoint", "named", "names", "promot", "joins", "hired", "launch", "introduc", "debut",
  "acquir", "merger", "partner", "expand", "renew", "syndicat", "programming",
  "ratings", "audience", "layoff", "restructur", "agreement", "distribution",
  "broadcast", "coverage", "parts ways", "lawsuit", "executive", "president",
  "vice president", "general manager", "news director", "format", "fcc", "license", "station"
];

const EXCLUSIONS = [
  "coupon", "holiday gift guide", "recipe", "sweepstakes", "shopping deal",
  "limited-time discount", "grand opening sale", "consumer survey giveaway"
];

const CORPORATE_NOISE = [
  "shareholder alert", "investor alert", "securities fraud", "class action lawsuit",
  "opportunity to lead", "earnings release and conference call", "financial results",
  "to present at the", "to speak at the", "investor conference", "investor events",
  "to participate in citi", "to participate in investor", "notes offering", "credit facility",
  "quarterly results", "quarter results"
];

export function classifyRelease(release) {
  const primary = normalizedPrimaryText(release);
  const summary = normalize(release.summary || "");
  const codes = new Set(Array.isArray(release.industry) ? release.industry : []);
  const newsScore = NEWS_SIGNALS.reduce((sum, term) => sum + (primary.includes(term) ? 1 : 0), 0);
  const hardExcluded = EXCLUSIONS.some((term) => `${primary} ${summary}`.includes(term));
  const corporateNoise = CORPORATE_NOISE.some((term) => primary.includes(term));
  const scores = {};
  const reasons = {};

  for (const [category, rules] of Object.entries(CATEGORY_RULES)) {
    let score = 0;
    const matches = [];
    for (const term of rules.strong) {
      if (primary.includes(term)) {
        score += 5;
        matches.push(term);
      } else if (summary.includes(term)) {
        score += 2;
        matches.push(`summary:${term}`);
      }
    }
    for (const term of rules.weak) {
      if (primary.includes(term)) {
        score += 2;
        matches.push(term);
      } else if (summary.includes(term)) {
        score += 1;
        matches.push(`summary:${term}`);
      }
    }
    for (const code of INDUSTRY_CODES[category] || []) {
      if (codes.has(code)) {
        score += 2;
        matches.push(`industry:${code}`);
      }
    }
    scores[category] = score;
    reasons[category] = [...new Set(matches)].slice(0, 8);
  }

  const explicitMedia = explicitMediaSignal(primary);
  const mediaIndustry = [...codes].some((code) => MEDIA_CODES.has(code));
  const excluded = hardExcluded || corporateNoise;
  const categories = [];

  if (!excluded) {
    if (scores.advertising >= 4 && primaryAdvertisingSignal(primary)) categories.push("advertising");
    if (scores.digital >= 2 && primaryDigitalSignal(primary)) categories.push("digital");
    if (scores.engineering >= 5 && (primaryEngineeringSignal(primary) || (codes.has("BRD") && newsScore > 0))) categories.push("engineering");
    if (scores.entertainment >= 5 && primaryEntertainmentSignal(primary) && !nonMediaEventPromoter(primary)) categories.push("entertainment");
    if (scores.radio >= 5 && primaryRadioSignal(primary)) categories.push("radio");
    if ((scores.television >= 4 || (codes.has("TVN") && scores.television >= 2)) && primaryTelevisionSignal(primary) && !nonMediaEventPromoter(primary)) categories.push("television");
    if (scores.podcast >= 4 && primaryPodcastSignal(primary)) categories.push("podcast");
    if (namedMediaShow(primary) || (scores.tradeshow >= 2 && mediaIndustry && explicitMedia)) categories.push("tradeshow");

    const hasManagementEvent = scores.management >= 4 && newsScore > 0;
    const classifiedMediaStory = categories.some((category) => category !== "management" && category !== "tradeshow");
    if (hasManagementEvent && (explicitMedia || classifiedMediaStory || (mediaIndustry && mediaTerm(primary)))) categories.push("management");
  }

  const review = !excluded && !nonMediaEventPromoter(primary) && categories.length === 0 && newsScore > 0 &&
    (explicitMedia || (mediaIndustry && mediaTerm(primary)));

  return {
    categories: [...new Set(categories)],
    review,
    scores,
    reasons: Object.fromEntries(Object.entries(reasons).filter(([, value]) => value.length)),
    news_score: newsScore,
    excluded
  };
}

function normalizedPrimaryText(release) {
  const company = Array.isArray(release.company) ? release.company.join(" ") : release.company || "";
  const subtitle = Array.isArray(release.sub_title) ? release.sub_title.join(" ") : release.sub_title || "";
  return normalize(`${release.title || ""} ${subtitle} ${company} ${release.source_company || ""}`);
}

function normalize(value) {
  return String(value).toLowerCase().replace(/&amp;/g, "&").replace(/\s+/g, " ");
}

function mediaTerm(text) {
  return /\b(media|broadcast\w*|radio|television|podcast\w*|advertis\w*|publisher|publishing|film|movie|music|newsroom|newscast)\b/i.test(text);
}

function explicitMediaSignal(text) {
  return primaryRadioSignal(text) || primaryTelevisionSignal(text) || primaryPodcastSignal(text) ||
    primaryAdvertisingSignal(text) || primaryDigitalSignal(text) || primaryEngineeringSignal(text) ||
    primaryEntertainmentSignal(text);
}

function primaryAdvertisingSignal(text) {
  return /advertising|advertiser|adtech|media buying|media agency|marketing agency|digital marketing agenc|direct marketing|marketing (platform|software|technology|system|os|audit)|performance marketing|influencer marketing|seo (agency|strategy)|ad buy|earned media|audience measurement|ad sales/i.test(text);
}

function primaryDigitalSignal(text) {
  return /digital media|digital content|digital publisher|online publisher|social media|creator economy|web content|digital news|local media consortium|streaming (service|provider|platform)/i.test(text);
}

function primaryEngineeringSignal(text) {
  return /broadcast (engineering|engineer|technology|equipment|automation|system|fabric|distribution|monitoring)|media (technology|workflow|infrastructure)|video ai|streaming infrastructure|transmitter|master control|production switcher|playout|atsc 3\.0|nextgen tv/i.test(text);
}

function primaryEntertainmentSignal(text) {
  return /entertainment|film|movie|motion picture|television (production|series)|reality series|emmy|actor|actress|producer|music|album|record label|recording artist|box office/i.test(text);
}

function primaryRadioSignal(text) {
  return /\bradio\b|iheartradio|audacy|cumulus media|townsquare media|urban one|radio one|beasley media|hubbard radio|salem media|k-love|air1|siriusxm/i.test(text);
}

function primaryTelevisionSignal(text) {
  return /\btelevision\b|\btv\b|broadcast partnership|newscast|news anchor|reality series|emmy|fox news|gray media|sinclair broadcast|nexstar media|tegna|hearst television|cbs stations|pbs station/i.test(text);
}

function primaryPodcastSignal(text) {
  return /\bpodcasts?\b|\bpodcasting\b|\bpodcaster\b/i.test(text);
}

function nonMediaEventPromoter(text) {
  return /\b(hotel|hospitality|tourism|travel|resort|restaurant|casino|airline|bank|healthcare system|wines?|winery|fitness|attorney|law firm|cruise|ocean bar)\b|m&m/i.test(text) &&
    !/production company|film studio|movie studio|television network|record label/i.test(text);
}

function namedMediaShow(text) {
  return /\bnab show\b|\bibc ?20\d{2}\b|\bibc show\b|international broadcasting convention|smpte|broadcastasia|infocomm/i.test(text);
}

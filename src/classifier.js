const CATEGORY_RULES = {
  college: {
    strong: [
      "college radio", "campus radio", "student radio", "college television",
      "campus television", "student television", "student newspaper",
      "student journalism", "journalism school", "school of journalism",
      "broadcast journalism program", "student media", "campus media",
      "media scholarship", "journalism scholarship", "broadcasting scholarship",
      "media internship", "journalism internship", "student newsroom",
      "college broadcasting", "university broadcasting"
    ],
    weak: ["college media", "university media", "communications students", "journalism students"]
  },
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
      "reality series",
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
  "broadcast", "coverage", "reaches", "parts ways", "lawsuit", "executive", "president",
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
  "to participate in citi", "to participate in investor", "to participate in goldman sachs",
  "notes offering", "credit facility", "laminating film", "polyimide film",
  "quarterly results", "quarter results",
  "common stock dividend", "quarterly dividend", "declares dividend",
  "share repurchase", "stock buyback", "quarterly earnings",
  "earnings conference call", "investor presentation"
];

export function classifyRelease(release) {
  const primary = normalizedPrimaryText(release);
  const summary = normalize(release.summary || "");
  const codes = new Set(Array.isArray(release.industry) ? release.industry : []);
  const newsScore = NEWS_SIGNALS.reduce((sum, term) => sum + (primary.includes(term) ? 1 : 0), 0);
  const legalFundingPromotion = /\b(?:pre[- ]settlement funding|lawsuit funding|litigation funding|legal funding|settlement advances?|lawsuit advances?|plaintiff funding|plaintiff cash advances?|cash advances? for plaintiffs?)\b/i.test(`${primary} ${summary}`);
  const constructionIndustryPromotion = isConstructionIndustryPromotion(`${primary} ${summary}`);
  const competingEmploymentService = isCompetingEmploymentService(primary);
  const hardExcluded = competingEmploymentService || legalFundingPromotion || EXCLUSIONS.some((term) => `${primary} ${summary}`.includes(term));
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
    // Judge the news subject and lead, not an executive's education or an
    // engineering firm's higher-education client list in body boilerplate.
    const studentText = `${primary} ${summary.slice(0, 1200)}`;
    const primaryStudentFocus = /\bcollege\b|universit|\bcampus\b|\bstudent\b|higher education|scholarship|fafsa|pell grant|undergraduat|journalism school|school of journalism/i.test(primary);
    const corporatePersonnel = /\b(?:promotes?|promoted|promotions?|appoints?|appointed|names?|hires?|hired|joins?|joined)\b/i.test(primary) && !primaryStudentFocus;
    const studentAudience = /college students|university students|campus life|student life|higher education|undergraduates|student financial aid|student loans|college tuition|college costs|student housing|campus safety|student mental health|college scholarships|university scholarships|fafsa|pell grant/i.test(studentText);
    const studentIssue = /scholarship|financial aid|tuition|student debt|student loan|housing|food insecurity|basic needs|mental health|stress|anxiety|wellness|safety|career|internship|suicide prevention/i.test(studentText);
    const commercialHousing = /student housing|student accommodation|student living/i.test(studentText) && /contractor|construction|property sale|real estate investment|development offers|disposition|acquisition|portfolio|capital management|investment platform|property management company|property management firm|private equity|asset management/i.test(primary);
    const housingProjectAnnouncement = /student housing|student living|student residences/i.test(studentText) && /groundbreaking|breaks ground|close financing|closes financing|construction begins|development project|development in|housing development|real estate development|new development|property investment/i.test(primary);
    const consumerDebtPromotion = /debt relief|debt settlement|unsecured debt|credit card debt|debt clear|personal loans/i.test(primary) && !/student loans|student loan relief|college debt|tuition debt/i.test(primary);
    const nonCollegeEducatorAward = /high school|k-12|secondary school|skilled trades educators|trade school educators/i.test(primary) && /educator|teacher|awards|honors/i.test(primary) && !/college|university|higher education|community college|postsecondary/i.test(primary);
    const unrelatedInsurance = /life insurance planning|life insurance coverage|insurance expert/i.test(primary) && !/student insurance|student health coverage/i.test(primary);
    if (!constructionIndustryPromotion && studentAudience && studentIssue && !corporatePersonnel && !commercialHousing && !housingProjectAnnouncement && !unrelatedInsurance && !consumerDebtPromotion && !nonCollegeEducatorAward) categories.push("college");
    if (!constructionIndustryPromotion && !corporatePersonnel && scores.college >= 2 && /college radio|campus radio|student radio|college television|campus television|student television|student newspaper|student journalism|journalism school|school of journalism|broadcast journalism program|student media|campus media|media scholarship|journalism scholarship|broadcasting scholarship|media internship|journalism internship|student newsroom|college broadcasting|university broadcasting|college media|university media|communications students|journalism students/i.test(studentText)) categories.push("college");
    if (primaryAdvertisingSignal(primary)) categories.push("advertising");
    if (scores.digital >= 2 && primaryDigitalSignal(primary)) categories.push("digital");
    if (scores.engineering >= 5 && primaryEngineeringSignal(primary)) categories.push("engineering");
    if (scores.entertainment >= 5 && primaryEntertainmentSignal(primary) && !nonMediaEventPromoter(primary)) categories.push("entertainment");
    if (scores.radio >= 5 && primaryRadioSignal(primary)) categories.push("radio");
    if ((scores.television >= 4 || (codes.has("TVN") && scores.television >= 2)) &&
        primaryTelevisionSignal(primary) && newsScore > 0 &&
        !nonMediaEventPromoter(primary) && !consumerTelevisionProduct(primary)) categories.push("television");
    if (scores.podcast >= 4 && primaryPodcastSignal(primary)) categories.push("podcast");
    if (namedMediaShow(`${primary} ${summary}`)) categories.push("tradeshow");

    const hasManagementEvent = primaryManagementEvent(primary);
    if (hasManagementEvent && managementMediaSignal(primary)) categories.push("management");
  }

  const review = !excluded && !constructionIndustryPromotion && !nonMediaEventPromoter(primary) && categories.length === 0 && newsScore > 0 &&
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

function isConstructionIndustryPromotion(text) {
  const constructionIndustry = /\b(?:construction|builders?|building contractors?|general contractors?|skilled trades?|craft professionals?|craft workers?|pipefitting|pipefitters?)\b/i.test(text);
  const careerPromotion = /\b(?:careers?|employers?|employment|jobs?|training|workforce|campaign|recruit(?:ment|ing)?|apprentices?|next generation|investment)\b/i.test(text);
  const mediaEducation = /\b(?:college|university|campus|student)\b.{0,80}\b(?:journalism|broadcast|radio|television|newsroom|media|communications program)\b|\b(?:journalism|broadcast|radio|television|newsroom|media|communications program)\b.{0,80}\b(?:college|university|campus|student)\b/i.test(text);
  return constructionIndustry && careerPromotion && !mediaEducation;
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
  // Agency labels and ADV metadata alone do not establish news value for media.
  const collectibles = /\b(?:auctions?|auctioneers?|automobilia|petroliana|memorabilia|collectibles?|antique signs?|vintage signs?|porcelain signs?)\b/i.test(text);
  const vanityAwards = /agency of the year|agencies of the year|inspiring.*entrepreneurs|entrepreneurs.*to watch|top[- ]?10.*(?:women|entrepreneurs)|award[- ]winning agency/i.test(text);
  if (collectibles || vanityAwards) return false;
  const mediaBusiness = /\b(?:media buying|media buyers?|media planning|media plans?|media spend(?:ing)?|media budgets?|media accounts?|media agency|media agencies|ad buys?|ad spend(?:ing)?|advertising spend(?:ing)?|advertising budgets?|advertising revenue|ad revenue|ad sales|advertising sales|sponsorship sales|audience measurement|advertising measurement|ad measurement|ad attribution|advertising attribution|adtech|ad tech|advertising technology|advertising platforms?|programmatic advertising|addressable advertising|retail media|connected tv advertising|ctv advertising|ott advertising|audio advertising|radio advertising|television advertising|tv advertising|podcast advertising|video advertising|digital advertising|print advertising|out[- ]of[- ]home advertising|ooh advertising|advertising industry)\b/i.test(text);
  const distributedCampaign = /\b(?:campaign|advertiser|advertising|sponsorship)\b/i.test(text) &&
    /\b(?:radio|television|tv|podcasts?|streaming|broadcast|digital media|paid media|paid social|billboards?|out[- ]of[- ]home|newspapers?|magazines?|super bowl|media partners?)\b/i.test(text);
  const agencyBusiness = /\b(?:advertising|marketing|media) agenc(?:y|ies)\b/i.test(text) &&
    /\b(?:media buying|media planning|media accounts?|media business|media budgets?|media spend(?:ing)?)\b/i.test(text);
  const mediaOperations = /\b(?:advertising|advertisers?|ads|paid media)\b/i.test(text) &&
    /\b(?:partnership|partners?|infrastructure|display networks?|rideshare|clear channel outdoor|audience|campaign delivery|study|research|report|intelligence|fraud|refunds|measurement|attribution|ad targeting)\b/i.test(text);
  const adIndustryEvent = /\b(?:iab|interactive advertising bureau|advertising week|dpaa|video everywhere summit)\b/i.test(text);
  return mediaBusiness || distributedCampaign || agencyBusiness || mediaOperations || adIndustryEvent;
}

function primaryDigitalSignal(text) {
  return /digital media|digital content|digital publisher|online publisher|social media|creator economy|web content|digital news|local media consortium|streaming (service|provider|platform)/i.test(text);
}

function primaryEngineeringSignal(text) {
  // Financial money transmission is unrelated to broadcast RF equipment.
  const technicalText = text.replace(/\bmoney transmitt(?:er|ers|ing)|\bmoney transmission\b/gi, "");
  return /\b(?:broadcast (?:engineering|engineers?|technology|equipment|automation|systems?|fabric|distribution|monitoring)|media (?:technology|workflow|infrastructure)|video ai|streaming infrastructure|master control|production switcher|playout|atsc 3\.0|nextgen tv|audio consoles?|video codecs?|cloud production|remote production|studio technology)\b/i.test(technicalText) ||
    (/\b(?:transmitters?|rf systems?|camera systems?|production technology)\b/i.test(technicalText) &&
     /\b(?:broadcast(?:ing)?|radio|television|tv|fm|am|dab|drm|atsc|studio|film|video production|nab show|ibc)\b/i.test(technicalText));
}

function primaryEntertainmentSignal(text) {
  return /\b(?:entertainment|film|movie|motion picture|television (?:production|series)|reality series|emmy|actor|actress|producer|music|album|record label|recording artist|box office)\b/i.test(text);
}

function primaryRadioSignal(text) {
  const twoWayCommunications = /\b(?:two[- ]way radio|land[- ]mobile radio|lmr|walkie[- ]talkies?|push[- ]to[- ]talk|public safety (?:radio|communications)|ham radio|amateur radio|tactical radio)\b/i.test(text);
  const broadcastContext = /\b(?:broadcast radio|radio broadcast(?:ing)?|radio stations?|radio programming|radio listeners?|radio audiences?|radio newsroom|radio studio|fm broadcasting|am broadcasting|iheartradio|audacy|cumulus media|siriusxm)\b/i.test(text);
  if (twoWayCommunications && !broadcastContext) return false;
  return /\bradio\b|iheartradio|audacy|cumulus media|townsquare media|urban one|radio one|beasley media|hubbard radio|salem media|k-love|air1|siriusxm/i.test(text);
}

function primaryTelevisionSignal(text) {
  return /\btelevision\b|\btv\b|broadcast partnership|newscast|news anchor|reality series|fox news|gray media|sinclair broadcast|nexstar media|tegna|hearst television|cbs stations|pbs station/i.test(text);
}

function primaryPodcastSignal(text) {
  return /\bpodcasts?\b|\bpodcasting\b|\bpodcaster\b/i.test(text);
}

function nonMediaEventPromoter(text) {
  return /\b(hotel|hospitality|tourism|travel|resort|restaurant|casino|airline|bank|healthcare system|wines?|winery|fitness|attorney|law firm|cruise|ocean bar)\b|m&m/i.test(text) &&
    !/production company|film studio|movie studio|television network|record label/i.test(text);
}

function namedMediaShow(text) {
  return /\bnab show\b|\bibc ?20\d{2}\b|\bibc show\b|international broadcasting convention|smpte|broadcastasia|infocomm|video everywhere summit/i.test(text);
}

function consumerTelevisionProduct(text) {
  return /art tv|ai tv experience|tv lineup|television set|qd-mini|mini led|canvas art|tv-quality/i.test(text);
}


function isCompetingEmploymentService(text) {
  // Evaluate the release subject, not incidental mentions in body boilerplate.
  // Employer hiring, internships and labor research do not match these services.
  const employmentService = /\b(?:job boards?|job[- ]search (?:platforms?|sites?|services?|engines?)|recruit(?:ing|ment) (?:partners?|resources?|platforms?|services?|agenc(?:y|ies)|firms?|solutions?|marketplaces?)|staffing (?:services?|agenc(?:y|ies)|firms?|platforms?|solutions?)|casting (?:services?|platforms?|agenc(?:y|ies))|talent (?:placement|recruitment|acquisition (?:platforms?|services?|solutions?))|employment (?:agenc(?:y|ies)|marketplaces?)|career (?:marketplaces?|platforms?)|hiring (?:platforms?|marketplaces?))\b/i.test(text);
  const promotion = /\b(?:launch(?:es|ed|ing)?|introduc(?:e|es|ed|ing)|unveil(?:s|ed)?|debut(?:s|ed)?|expand(?:s|ed|ing)?|announc(?:e|es|ed|ing)|partner(?:s|ship)?|acquir(?:e|es|ed)|appoint(?:s|ed)?|names?|award|recogniz|rank|deliver|offer|new|nationwide|support|promot)\w*/i.test(text);
  return employmentService && promotion;
}

function primaryManagementEvent(text) {
  return /\b(?:appoints?|appointed|appointments?|names?|named|promotes?|promoted|promotions?|hires?|hired|joins?|joined|welcomes?|succeeds?|succession|retires?|retirement|resigns?|resignation|steps down|departures?|parts ways|leadership changes?|executive changes?|acquir(?:e|es|ed)|acquisitions?|mergers?|restructur\w*|layoffs?|bankruptc\w*|transitions? to)\b/i.test(text);
}

function managementMediaSignal(text) {
  // Media industry metadata and executives quoted in a release are insufficient.
  return /\b(?:media|broadcast(?:ing)?|radio|television|tv|podcasts?|newspapers?|journalism|newsrooms?|publishing|publishers?|record labels?|music|film studios?|movie studios?|production group|production company|advertising|adtech|ad sales|media buying|media planning|cumulus|audacy|siriusxm|iheartradio|tegna|nexstar|scripps|monks|ansira|qorvis)\b/i.test(text) &&
    !/\b(?:entertainment software|video game|gaming|crypto|cryptocurrency)\b/i.test(text);
}

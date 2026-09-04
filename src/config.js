export const API_BASE = process.env.CISION_API_BASE || "https://contentapi.cision.com";

export const OUTPUT_DIR = process.env.CISION_OUTPUT_DIR || "data/newswire";
export const STATE_FILE = process.env.CISION_STATE_FILE || "data/cision-state.json";
export const CODES_FILE = process.env.CISION_CODES_FILE || "data/cision-codes.json";

export const PAGE_SIZE = 100;
export const OVERLAP_MINUTES = Number(process.env.CISION_OVERLAP_MINUTES || 10);
export const BACKFILL_HOURS = Number(process.env.CISION_BACKFILL_HOURS || 24);
export const FORCE_BACKFILL = process.env.CISION_FORCE_BACKFILL === "true";
export const RETENTION_DAYS = Number(process.env.CISION_RETENTION_DAYS || 45);
export const GEOGRAPHY = process.env.CISION_GEOGRAPHY || "USA|CAN";
export const LANGUAGE = process.env.CISION_LANGUAGE || "en";

export const LIST_FIELDS = [
  "title",
  "summary",
  "date",
  "release_id",
  "company",
  "feed",
  "industry",
  "subject",
  "geography",
  "ticker",
  "language",
  "dateline",
  "multimedia"
].join("|");

export const FEED_NAMES = [
  "advertising",
  "digital",
  "engineering",
  "entertainment",
  "management",
  "podcast",
  "radio",
  "television",
  "tradeshow",
  "review"
];

export const PAGE_URLS = {
  advertising: "https://www.mediajobsreport.com/advertising_news",
  digital: "https://www.mediajobsreport.com/digital_news",
  engineering: "https://www.mediajobsreport.com/engineering_news",
  entertainment: "https://www.mediajobsreport.com/entertainment_news",
  management: "https://www.mediajobsreport.com/management_news",
  podcast: "https://www.mediajobsreport.com/podcast_news",
  radio: "https://www.mediajobsreport.com/radio_news",
  television: "https://www.mediajobsreport.com/tv_news",
  tradeshow: "https://www.mediajobsreport.com/tradeshow_news"
};

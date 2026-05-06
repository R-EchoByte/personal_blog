import type { LocalQuote, QuoteSource } from "./types";

export const EMPTY_QUOTE = "";
export const EMPTY_SOURCE = "";
export const MAX_RETRIES = 3;
export const REQUEST_TIMEOUT_MS = 4500;
export const HITOKOTO_API_URL = "https://v1.hitokoto.cn/";
export const DEFAULT_QUOTE_SOURCE: QuoteSource = "auto";

export const LOCAL_QUOTES: LocalQuote[] = [
  { quote: "不以物喜，不以己悲。", source: "范仲淹" },
  { quote: "道阻且长，行则将至。", source: "《荀子》" },
  { quote: "凡是过往，皆为序章。", source: "莎士比亚" },
  { quote: "种一棵树最好的时间是十年前，其次是现在。", source: "谚语" },
  { quote: "Stay hungry, stay foolish.", source: "Steve Jobs" },
];

export const DEFAULT_LOCAL_QUOTE: LocalQuote = LOCAL_QUOTES[0] ?? {
  quote: "不以物喜，不以己悲。",
  source: "本站",
};

export function parseQuoteSource(value: unknown): QuoteSource {
  if (typeof value !== "string") {
    return DEFAULT_QUOTE_SOURCE;
  }

  const normalized = value.toLowerCase();
  if (
    normalized === "local" ||
    normalized === "api" ||
    normalized === "hitokoto" ||
    normalized === "auto"
  ) {
    return normalized;
  }

  return DEFAULT_QUOTE_SOURCE;
}

export const QUOTE_SOURCE = parseQuoteSource(import.meta.env.VITE_QUOTE_SOURCE);
export const QUOTE_API_PATH = import.meta.env.VITE_API_BASE_URL
  ? "/quote/random"
  : "/api/v1/quote/random";

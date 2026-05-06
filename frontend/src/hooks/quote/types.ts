export type QuoteResponse = {
  quote?: string;
  source?: string;
};

export type HitokotoResponse = {
  hitokoto?: string;
  from?: string;
  from_who?: string | null;
};

export type LocalQuote = {
  quote: string;
  source: string;
};

export type QuoteSource = "local" | "api" | "hitokoto" | "auto";

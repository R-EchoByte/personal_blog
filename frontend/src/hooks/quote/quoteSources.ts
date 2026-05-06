import { ApiError, apiGet } from "../../services/api";
import {
  DEFAULT_LOCAL_QUOTE,
  EMPTY_QUOTE,
  EMPTY_SOURCE,
  HITOKOTO_API_URL,
  QUOTE_API_PATH,
  REQUEST_TIMEOUT_MS,
} from "./config";
import type { HitokotoResponse, LocalQuote, QuoteResponse } from "./types";

type RetryQuoteSourceOptions = {
  maxRetries: number;
  isSourceUnavailable: () => boolean;
  markSourceUnavailable: () => void;
  fetcher: (attempt: number) => Promise<LocalQuote | null>;
};

async function withTimeout<T>(
  task: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await task(controller.signal);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function pickLocalQuote(
  quotes: LocalQuote[],
  previousIndex: number,
): { nextIndex: number; quote: LocalQuote } {
  if (quotes.length === 0) {
    return {
      nextIndex: -1,
      quote: DEFAULT_LOCAL_QUOTE,
    };
  }

  let nextIndex = Math.floor(Math.random() * quotes.length);
  if (quotes.length > 1 && nextIndex === previousIndex) {
    nextIndex = (nextIndex + 1) % quotes.length;
  }

  return {
    nextIndex,
    quote: quotes[nextIndex] ?? DEFAULT_LOCAL_QUOTE,
  };
}

export async function fetchHitokotoQuote(
  attempt: number,
): Promise<LocalQuote | null> {
  const payload = await withTimeout(async (signal) => {
    const response = await fetch(`${HITOKOTO_API_URL}?t=${Date.now()}-${attempt}`, {
      cache: "no-store",
      signal,
    });
    if (!response.ok) {
      throw new ApiError(`Request failed: ${response.status}`, response.status);
    }
    return response.json() as Promise<HitokotoResponse>;
  }, REQUEST_TIMEOUT_MS);

  const quote = payload.hitokoto?.trim() ?? EMPTY_QUOTE;
  if (!quote) {
    return null;
  }

  const sourceSegments = [payload.from_who?.trim(), payload.from?.trim()].filter(
    Boolean,
  );
  return {
    quote,
    source: sourceSegments.join(" · ") || "一言",
  };
}

export async function fetchBackendQuote(
  attempt: number,
): Promise<LocalQuote | null> {
  const payload = await withTimeout(
    (signal) =>
      apiGet<QuoteResponse>(`${QUOTE_API_PATH}?ts=${Date.now()}-${attempt}`, {
        cache: "no-store",
        signal,
      }),
    REQUEST_TIMEOUT_MS,
  );

  const quote = payload.quote?.trim() ?? EMPTY_QUOTE;
  if (!quote) {
    return null;
  }

  return {
    quote,
    source: payload.source?.trim() ?? EMPTY_SOURCE,
  };
}

export async function retryQuoteSource({
  maxRetries,
  isSourceUnavailable,
  markSourceUnavailable,
  fetcher,
}: RetryQuoteSourceOptions): Promise<LocalQuote | null> {
  if (isSourceUnavailable()) {
    return null;
  }

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      return await fetcher(attempt);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        continue;
      }
      if (error instanceof TypeError) {
        markSourceUnavailable();
        break;
      }
      if (error instanceof ApiError) {
        continue;
      }
      throw error;
    }
  }

  return null;
}

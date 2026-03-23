import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, apiGet } from "../services/api";

type QuoteResponse = {
  quote?: string;
  source?: string;
};

type HitokotoResponse = {
  hitokoto?: string;
  from?: string;
  from_who?: string | null;
};

type LocalQuote = {
  quote: string;
  source: string;
};

type QuoteSource = "local" | "api" | "hitokoto" | "auto";

const EMPTY_QUOTE = "";
const EMPTY_SOURCE = "";
const MAX_RETRIES = 3;
const REQUEST_TIMEOUT_MS = 4500;
const HITOKOTO_API_URL = "https://v1.hitokoto.cn/";
const DEFAULT_QUOTE_SOURCE: QuoteSource = "auto";
const QUOTE_SOURCE = parseQuoteSource(import.meta.env.VITE_QUOTE_SOURCE);
const QUOTE_API_PATH = import.meta.env.VITE_API_BASE_URL
  ? "/quote/random"
  : "/api/v1/quote/random";
const LOCAL_QUOTES: LocalQuote[] = [
  { quote: "不以物喜，不以己悲。", source: "范仲淹" },
  { quote: "道阻且长，行则将至。", source: "《荀子》" },
  { quote: "凡是过往，皆为序章。", source: "莎士比亚" },
  { quote: "种一棵树最好的时间是十年前，其次是现在。", source: "谚语" },
  { quote: "Stay hungry, stay foolish.", source: "Steve Jobs" },
];
const DEFAULT_LOCAL_QUOTE: LocalQuote = LOCAL_QUOTES[0] ?? {
  quote: "不以物喜，不以己悲。",
  source: "本站",
};

function parseQuoteSource(value: unknown): QuoteSource {
  if (typeof value !== "string") return DEFAULT_QUOTE_SOURCE;
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

export function useRandomQuote() {
  const [quote, setQuote] = useState(EMPTY_QUOTE);
  const [source, setSource] = useState(EMPTY_SOURCE);
  const [loading, setLoading] = useState(true);
  const localQuoteIndexRef = useRef(-1);
  const hitokotoUnavailableRef = useRef(false);
  const apiUnavailableRef = useRef(false);
  const shouldTryHitokoto = QUOTE_SOURCE === "auto" || QUOTE_SOURCE === "hitokoto";
  const shouldTryApi = QUOTE_SOURCE === "auto" || QUOTE_SOURCE === "api";

  const applyLocalQuote = useCallback(() => {
    if (LOCAL_QUOTES.length === 0) {
      setQuote(DEFAULT_LOCAL_QUOTE.quote);
      setSource(DEFAULT_LOCAL_QUOTE.source);
      return;
    }

    let nextIndex = Math.floor(Math.random() * LOCAL_QUOTES.length);
    if (LOCAL_QUOTES.length > 1 && nextIndex === localQuoteIndexRef.current) {
      nextIndex = (nextIndex + 1) % LOCAL_QUOTES.length;
    }
    localQuoteIndexRef.current = nextIndex;

    const nextQuote = LOCAL_QUOTES[nextIndex] ?? DEFAULT_LOCAL_QUOTE;
    setQuote(nextQuote.quote);
    setSource(nextQuote.source);
  }, []);

  const requestHitokotoQuote = useCallback(async (): Promise<LocalQuote | null> => {
    if (!shouldTryHitokoto || hitokotoUnavailableRef.current) return null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
      try {
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
        if (!quote) continue;

        const sourceSegments = [payload.from_who?.trim(), payload.from?.trim()].filter(Boolean);
        return {
          quote,
          source: sourceSegments.join(" · ") || "一言",
        };
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          continue;
        }
        if (error instanceof TypeError) {
          hitokotoUnavailableRef.current = true;
          break;
        }
        if (error instanceof ApiError) {
          continue;
        }
      }
    }

    return null;
  }, [shouldTryHitokoto]);

  const requestBackendQuote = useCallback(async (): Promise<LocalQuote | null> => {
    if (!shouldTryApi || apiUnavailableRef.current) return null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
      try {
        const payload = await withTimeout(
          (signal) =>
            apiGet<QuoteResponse>(`${QUOTE_API_PATH}?ts=${Date.now()}-${attempt}`, {
              cache: "no-store",
              signal,
            }),
          REQUEST_TIMEOUT_MS,
        );
        const quote = payload.quote?.trim() ?? EMPTY_QUOTE;
        if (!quote) continue;

        return {
          quote,
          source: payload.source?.trim() ?? EMPTY_SOURCE,
        };
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          continue;
        }
        if (error instanceof TypeError) {
          apiUnavailableRef.current = true;
          break;
        }
        if (error instanceof ApiError) {
          continue;
        }
      }
    }

    return null;
  }, [shouldTryApi]);

  const refreshQuote = useCallback(async () => {
    setLoading(true);
    try {
      if (QUOTE_SOURCE === "local") {
        applyLocalQuote();
        return;
      }

      const hitokotoQuote = await requestHitokotoQuote();
      if (hitokotoQuote) {
        setQuote(hitokotoQuote.quote);
        setSource(hitokotoQuote.source);
        return;
      }

      const backendQuote = await requestBackendQuote();
      if (backendQuote) {
        setQuote(backendQuote.quote);
        setSource(backendQuote.source);
        return;
      }

      applyLocalQuote();
    } catch {
      applyLocalQuote();
    } finally {
      setLoading(false);
    }
  }, [applyLocalQuote, requestBackendQuote, requestHitokotoQuote]);

  useEffect(() => {
    refreshQuote();
  }, [refreshQuote]);

  return { quote, source, loading, refreshQuote };
}

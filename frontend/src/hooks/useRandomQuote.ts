import { useCallback, useEffect, useState } from "react";

type QuoteResponse = {
  quote?: string;
  source?: string;
};

const EMPTY_QUOTE = "";
const EMPTY_SOURCE = "";
const MAX_RETRIES = 5;
const REQUEST_TIMEOUT_MS = 4500;

export function useRandomQuote() {
  const [quote, setQuote] = useState(EMPTY_QUOTE);
  const [source, setSource] = useState(EMPTY_SOURCE);
  const [loading, setLoading] = useState(true);

  const refreshQuote = useCallback(async () => {
    setLoading(true);
    try {
      let nextQuote = EMPTY_QUOTE;
      let nextSource = EMPTY_SOURCE;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
          const response = await fetch(`/api/v1/quote/random?ts=${Date.now()}-${attempt}`, {
            cache: "no-store",
            signal: controller.signal,
          });
          if (!response.ok) {
            continue;
          }

          const payload = (await response.json()) as QuoteResponse;
          const rawQuote = payload.quote?.trim() ?? EMPTY_QUOTE;
          if (!rawQuote) {
            continue;
          }

          nextQuote = rawQuote;
          nextSource = payload.source?.trim() ?? EMPTY_SOURCE;
          break;
        } catch {
          continue;
        } finally {
          window.clearTimeout(timeoutId);
        }
      }

      if (nextQuote) {
        setQuote(nextQuote);
        setSource(nextSource);
      }
    } catch {
      // Keep previous quote when request fails.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshQuote();
  }, [refreshQuote]);

  return { quote, source, loading, refreshQuote };
}

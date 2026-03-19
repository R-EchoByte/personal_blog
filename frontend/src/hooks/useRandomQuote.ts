import { useCallback, useEffect, useState } from "react";

type QuoteResponse = {
  quote?: string;
  source?: string;
};

const EMPTY_QUOTE = "";
const EMPTY_SOURCE = "";
const MAX_QUOTE_LEN = 16;
const MAX_RETRIES = 5;

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
        const response = await fetch("/api/v1/quote/random", { cache: "no-store" });
        if (!response.ok) {
          continue;
        }

        const payload = (await response.json()) as QuoteResponse;
        const rawQuote = payload.quote?.trim() ?? EMPTY_QUOTE;
        if (!rawQuote || rawQuote.length > MAX_QUOTE_LEN) {
          continue;
        }

        nextQuote = rawQuote;
        nextSource = payload.source?.trim() ?? EMPTY_SOURCE;
        break;
      }

      setQuote(nextQuote);
      setSource(nextSource);
    } catch {
      setQuote(EMPTY_QUOTE);
      setSource(EMPTY_SOURCE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshQuote();
  }, [refreshQuote]);

  return { quote, source, loading, refreshQuote };
}

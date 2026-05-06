import { useCallback, useEffect, useRef } from "react";

import { LOCAL_QUOTES } from "./quote/config";
import { pickLocalQuote } from "./quote/quoteSources";
import { useQuoteResolver } from "./quote/useQuoteResolver";
import { useQuoteState } from "./quote/useQuoteState";

export function useRandomQuote() {
  const localQuoteIndexRef = useRef(-1);
  const { quote, source, loading, setLoading, applyQuote } = useQuoteState();
  const { resolveQuote } = useQuoteResolver();

  const applyLocalQuote = useCallback(() => {
    const { nextIndex, quote: nextQuote } = pickLocalQuote(
      LOCAL_QUOTES,
      localQuoteIndexRef.current,
    );
    localQuoteIndexRef.current = nextIndex;
    applyQuote(nextQuote);
  }, [applyQuote]);

  const refreshQuote = useCallback(async () => {
    setLoading(true);
    try {
      const resolvedQuote = await resolveQuote();
      if (resolvedQuote) {
        applyQuote(resolvedQuote);
        return;
      }

      applyLocalQuote();
    } catch {
      applyLocalQuote();
    } finally {
      setLoading(false);
    }
  }, [applyLocalQuote, applyQuote, resolveQuote, setLoading]);

  useEffect(() => {
    refreshQuote();
  }, [refreshQuote]);

  return { quote, source, loading, refreshQuote };
}

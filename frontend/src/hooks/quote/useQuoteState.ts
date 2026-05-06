import { useCallback, useState } from "react";

import { EMPTY_QUOTE, EMPTY_SOURCE } from "./config";
import type { LocalQuote } from "./types";

export function useQuoteState() {
  const [quote, setQuote] = useState(EMPTY_QUOTE);
  const [source, setSource] = useState(EMPTY_SOURCE);
  const [loading, setLoading] = useState(true);

  const applyQuote = useCallback((nextQuote: LocalQuote) => {
    setQuote(nextQuote.quote);
    setSource(nextQuote.source);
  }, []);

  return {
    quote,
    source,
    loading,
    setLoading,
    applyQuote,
  };
}

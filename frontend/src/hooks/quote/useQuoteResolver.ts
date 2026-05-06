import { useCallback, useRef } from "react";

import { MAX_RETRIES, QUOTE_SOURCE } from "./config";
import {
  fetchBackendQuote,
  fetchHitokotoQuote,
  retryQuoteSource,
} from "./quoteSources";
import type { LocalQuote } from "./types";

export function useQuoteResolver() {
  const hitokotoUnavailableRef = useRef(false);
  const apiUnavailableRef = useRef(false);
  const shouldTryHitokoto =
    QUOTE_SOURCE === "auto" || QUOTE_SOURCE === "hitokoto";
  const shouldTryApi = QUOTE_SOURCE === "auto" || QUOTE_SOURCE === "api";

  const requestHitokotoQuote = useCallback(
    async (): Promise<LocalQuote | null> => {
      if (!shouldTryHitokoto) {
        return null;
      }

      return retryQuoteSource({
        maxRetries: MAX_RETRIES,
        isSourceUnavailable: () => hitokotoUnavailableRef.current,
        markSourceUnavailable: () => {
          hitokotoUnavailableRef.current = true;
        },
        fetcher: fetchHitokotoQuote,
      });
    },
    [shouldTryHitokoto],
  );

  const requestBackendQuote = useCallback(
    async (): Promise<LocalQuote | null> => {
      if (!shouldTryApi) {
        return null;
      }

      return retryQuoteSource({
        maxRetries: MAX_RETRIES,
        isSourceUnavailable: () => apiUnavailableRef.current,
        markSourceUnavailable: () => {
          apiUnavailableRef.current = true;
        },
        fetcher: fetchBackendQuote,
      });
    },
    [shouldTryApi],
  );

  const resolveQuote = useCallback(async (): Promise<LocalQuote | null> => {
    if (QUOTE_SOURCE === "local") {
      return null;
    }

    const hitokotoQuote = await requestHitokotoQuote();
    if (hitokotoQuote) {
      return hitokotoQuote;
    }

    return requestBackendQuote();
  }, [requestBackendQuote, requestHitokotoQuote]);

  return {
    resolveQuote,
  };
}

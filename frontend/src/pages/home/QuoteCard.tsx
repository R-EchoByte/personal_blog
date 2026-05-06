import { useMemo } from "react";

type QuoteCardProps = {
  quote: string;
  source: string;
  loading: boolean;
  onRefreshQuote: () => void;
};

function getQuoteSizeClass(quoteLength: number): string {
  if (quoteLength > 34) {
    return "quote-text-size-xl";
  }
  if (quoteLength > 26) {
    return "quote-text-size-lg";
  }
  if (quoteLength > 18) {
    return "quote-text-size-md";
  }
  return "";
}

export function QuoteCard({
  quote,
  source,
  loading,
  onRefreshQuote,
}: QuoteCardProps) {
  const normalizedQuote = quote.trim();
  const normalizedSource = source.trim();
  const hasQuote = normalizedQuote.length > 0;
  const hasSource = normalizedSource.length > 0;
  const quoteTextClassName = useMemo(
    () =>
      ["quote-text", getQuoteSizeClass(normalizedQuote.length)]
        .filter(Boolean)
        .join(" "),
    [normalizedQuote.length],
  );

  return (
    <article className="quote-card">
      <button
        type="button"
        className="quote-refresh-btn"
        onClick={onRefreshQuote}
        disabled={loading}
      >
        {loading ? "加载中..." : "换一句 (Q)"}
      </button>
      {hasQuote ? (
        <>
          <p className="quote-mark quote-mark-start">“</p>
          <p className={quoteTextClassName}>{normalizedQuote}</p>
          <p className="quote-mark quote-mark-end">”</p>
          {hasSource ? (
            <p className="quote-author">—— {normalizedSource}</p>
          ) : null}
        </>
      ) : (
        <p className="quote-text quote-loading-text">
          {loading ? "正在获取语录..." : "不以物喜，不以己悲"}
        </p>
      )}
    </article>
  );
}

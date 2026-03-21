import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRandomBackground } from "../hooks/useRandomBackground";
import { useRandomQuote } from "../hooks/useRandomQuote";

const QUICK_LINKS = [
  { label: "Blog", href: "/blog", hint: "文章与笔记", shortcut: "1" },
  { label: "AI 工具", href: "/ai", hint: "效率助手", shortcut: "2" },
  { label: "软件资源", href: "/software", hint: "工具合集", shortcut: "3" },
  { label: "影视网", href: "/movies", hint: "片库聚合", shortcut: "4" },
];
const HERO_ROTATING_TITLES = ["I'm 小镇子", "Build AI, Ship Value."];

const BADGE_SPIN_DURATION_MS = 2000;
const BADGE_RESET_DURATION_MS = 320;

type BadgeTransform = {
  angle: number;
  scale: number;
};

function readBadgeTransform(element: HTMLElement): BadgeTransform {
  const transform = window.getComputedStyle(element).transform;
  if (!transform || transform === "none") {
    return { angle: 0, scale: 1 };
  }

  if (transform.startsWith("matrix3d(")) {
    const values = transform
      .slice(9, -1)
      .split(",")
      .map((value) => Number(value.trim()));
    const a = values[0];
    const b = values[1];
    if (a === undefined || b === undefined || Number.isNaN(a) || Number.isNaN(b)) {
      return { angle: 0, scale: 1 };
    }
    return {
      angle: (Math.atan2(b, a) * 180) / Math.PI,
      scale: Math.hypot(a, b) || 1,
    };
  }

  if (transform.startsWith("matrix(")) {
    const values = transform
      .slice(7, -1)
      .split(",")
      .map((value) => Number(value.trim()));
    const a = values[0];
    const b = values[1];
    if (a === undefined || b === undefined || Number.isNaN(a) || Number.isNaN(b)) {
      return { angle: 0, scale: 1 };
    }
    return {
      angle: (Math.atan2(b, a) * 180) / Math.PI,
      scale: Math.hypot(a, b) || 1,
    };
  }

  return { angle: 0, scale: 1 };
}

export default function HomePage() {
  const navigate = useNavigate();
  const [heroTitleIndex, setHeroTitleIndex] = useState(0);
  const badgeRef = useRef<HTMLDivElement | null>(null);
  const badgeAnimationRef = useRef<Animation | null>(null);
  const { backgroundUrl, current, total, ready, shuffleBackground } = useRandomBackground();
  const { quote, source, loading, refreshQuote } = useRandomQuote();
  const quoteLength = quote.trim().length;
  const hasQuote = quoteLength > 0;
  const hasSource = source.trim().length > 0;
  const quoteSizeClass = useMemo(() => {
    if (quoteLength > 34) return "quote-text-size-xl";
    if (quoteLength > 26) return "quote-text-size-lg";
    if (quoteLength > 18) return "quote-text-size-md";
    return "";
  }, [quoteLength]);
  const quoteTextClassName = ["quote-text", quoteSizeClass].filter(Boolean).join(" ");
  const dateText = useMemo(
    () =>
      new Intl.DateTimeFormat("zh-CN", {
        month: "long",
        day: "numeric",
        weekday: "short",
      }).format(new Date()),
    [],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }

      if (event.code === "KeyB") {
        event.preventDefault();
        shuffleBackground();
        return;
      }

      if (event.code === "KeyQ") {
        event.preventDefault();
        refreshQuote();
        return;
      }

      const quickLink = QUICK_LINKS.find((item) => item.shortcut === event.key);
      if (!quickLink) return;

      event.preventDefault();
      if (quickLink.external) {
        window.open(quickLink.href, "_blank", "noopener,noreferrer");
      } else {
        navigate(quickLink.href);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [navigate, refreshQuote, shuffleBackground]);

  useEffect(
    () => () => {
      badgeAnimationRef.current?.cancel();
      badgeAnimationRef.current = null;
    },
    [],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroTitleIndex((prev) => (prev + 1) % HERO_ROTATING_TITLES.length);
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const startBadgeSpin = () => {
    const element = badgeRef.current;
    if (!element) return;

    const { angle } = readBadgeTransform(element);
    badgeAnimationRef.current?.cancel();
    badgeAnimationRef.current = element.animate(
      [
        { transform: `rotate(${angle}deg)` },
        { transform: `rotate(${angle + 180}deg)` },
        { transform: `rotate(${angle + 360}deg)` },
      ],
      {
        duration: BADGE_SPIN_DURATION_MS,
        easing: "linear",
        iterations: Infinity,
        fill: "forwards",
      },
    );
  };

  const resetBadgeTransform = () => {
    const element = badgeRef.current;
    if (!element) return;

    const { angle } = readBadgeTransform(element);
    badgeAnimationRef.current?.cancel();
    const resetAnimation = element.animate(
      [
        { transform: `rotate(${angle}deg)` },
        { transform: "rotate(0deg)" },
      ],
      {
        duration: BADGE_RESET_DURATION_MS,
        easing: "ease-out",
        iterations: 1,
        fill: "forwards",
      },
    );

    badgeAnimationRef.current = resetAnimation;
    resetAnimation.onfinish = () => {
      if (badgeAnimationRef.current !== resetAnimation) return;
      element.style.transform = "rotate(0deg)";
      badgeAnimationRef.current = null;
    };
    resetAnimation.oncancel = () => {
      if (badgeAnimationRef.current === resetAnimation) {
        badgeAnimationRef.current = null;
      }
    };
  };

  return (
    <section className="landing-page">
      <div className="landing-bg-image" style={{ backgroundImage: `url("${backgroundUrl}")` }} />
      <div className="landing-backdrop" />
      <header className="landing-toolbar">
        <span className="toolbar-brand">rxw · {dateText}</span>
        <div className="toolbar-actions">
          <span className="bg-progress" title={ready ? "背景池已加载" : "背景加载中"}>
            BG {current}/{total}
          </span>
          <button type="button" className="shuffle-btn" onClick={shuffleBackground}>
            换背景 (B)
          </button>
        </div>
      </header>

      <div className="landing-content">
        <div
          className="brand-badge"
          ref={badgeRef}
          onMouseEnter={startBadgeSpin}
          onMouseLeave={resetBadgeTransform}
          onMouseUp={resetBadgeTransform}
        >
          <img className="brand-badge-img" src="/头像.png" alt="ASLant 头像" />
        </div>

        <h1 className="landing-title">{HERO_ROTATING_TITLES[heroTitleIndex]}</h1>
        <p className="landing-subtitle">Code · Life · Creation</p>

        <article className="quote-card">
          <button type="button" className="quote-refresh-btn" onClick={refreshQuote} disabled={loading}>
            {loading ? "加载中..." : "换一句 (Q)"}
          </button>
          {hasQuote ? (
            <>
              <p className="quote-mark quote-mark-start">“</p>
              <p className={quoteTextClassName}>{quote}</p>
              <p className="quote-mark quote-mark-end">”</p>
              {hasSource ? <p className="quote-author">—— {source}</p> : null}
            </>
          ) : (
            <p className="quote-text quote-loading-text">{loading ? "正在获取语录..." : "不以物喜，不以己悲"}</p>
          )}
        </article>

        <nav className="quick-links" aria-label="Quick links">
          {QUICK_LINKS.map((item) => (
            item.external ? (
              <a key={item.label} className="quick-link" href={item.href} target="_blank" rel="noreferrer">
                <span className="quick-link-key">{item.shortcut}</span>
                <span className="quick-link-title">{item.label}</span>
                <span className="quick-link-hint">{item.hint}</span>
              </a>
            ) : (
              <Link key={item.label} className="quick-link" to={item.href}>
                <span className="quick-link-key">{item.shortcut}</span>
                <span className="quick-link-title">{item.label}</span>
                <span className="quick-link-hint">{item.hint}</span>
              </Link>
            )
          ))}
        </nav>
        <p className="shortcut-guide">快捷键：1 Blog · 2 AI工具 · 3 软件资源 · 4 影视网 · B 换背景</p>
      </div>

      <footer className="landing-footer">
        <span className="footer-label">Copyrights © 2025</span>
        <span className="footer-divider" aria-hidden="true">
          ·
        </span>
        <span className="footer-icp">鲁ICP备2025157599号</span>
      </footer>
    </section>
  );
}

import { lazy, Suspense, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import avatarUrl from "../assets/avatar.webp";
import { useRandomBackground } from "../hooks/useRandomBackground";
import { useRandomQuote } from "../hooks/useRandomQuote";
import "./home/home-shell.css";
import "./home/home-panels.css";
import { HomeFooter } from "./home/HomeFooter";
import { homeConfig, QUICK_LINKS } from "./home/homeConfig";
import { HomeToolbar } from "./home/HomeToolbar";
import { QuickLinksNav } from "./home/QuickLinksNav";
import { QuoteCard } from "./home/QuoteCard";
import { useBadgeSpin } from "./home/useBadgeSpin";
import { useHeroRenderMode } from "./home/useHeroRenderMode";
import { useHomeShortcuts } from "./home/useHomeShortcuts";

const ParticleTextEffect = lazy(async () => {
  const module = await import("../components/ParticleTextEffect");
  return { default: module.ParticleTextEffect };
});

export default function HomePage() {
  const navigate = useNavigate();
  const { badgeRef, startBadgeSpin, resetBadgeTransform } = useBadgeSpin();
  const { backgroundUrl, current, total, ready, switching, shuffleBackground } =
    useRandomBackground();
  const { quote, source, loading, refreshQuote } = useRandomQuote();
  const { enhanceHero } = useHeroRenderMode();

  useHomeShortcuts({
    quickLinks: QUICK_LINKS,
    navigate,
    onShuffleBackground: shuffleBackground,
    onRefreshQuote: refreshQuote,
  });

  const dateText = useMemo(
    () =>
      new Intl.DateTimeFormat("zh-CN", {
        month: "long",
        day: "numeric",
        weekday: "short",
      }).format(new Date()),
    [],
  );

  return (
    <section className="landing-page">
      <div
        className="landing-bg-image"
        style={{ backgroundImage: `url("${backgroundUrl}")` }}
      />
      <div className="landing-backdrop" />
      <HomeToolbar
        brand={homeConfig.toolbarBrand}
        dateText={dateText}
        currentBackgroundIndex={current}
        totalBackgrounds={total}
        ready={ready}
        switching={switching}
        onShuffleBackground={shuffleBackground}
      />

      <div className="landing-content">
        <div
          className="brand-badge"
          ref={badgeRef}
          onMouseEnter={startBadgeSpin}
          onMouseLeave={resetBadgeTransform}
          onMouseUp={resetBadgeTransform}
        >
          <img
            className="brand-badge-img"
            src={avatarUrl}
            alt="ASLant 头像"
            loading="eager"
            decoding="async"
            fetchPriority="high"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = "/logo.ico";
            }}
          />
        </div>

        <div className="hero-title-stage">
          {enhanceHero ? (
            <Suspense fallback={null}>
              <ParticleTextEffect words={homeConfig.particleWords} />
            </Suspense>
          ) : null}
        </div>
        <p className="landing-subtitle">{homeConfig.subtitle}</p>

        <QuoteCard
          quote={quote}
          source={source}
          loading={loading}
          onRefreshQuote={refreshQuote}
        />

        <QuickLinksNav quickLinks={QUICK_LINKS} />
        <p className="shortcut-guide">{homeConfig.shortcutGuide}</p>
      </div>

      <HomeFooter
        copyright={homeConfig.footerCopyright}
        icp={homeConfig.footerIcp}
      />
    </section>
  );
}

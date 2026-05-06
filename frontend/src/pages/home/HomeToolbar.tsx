type HomeToolbarProps = {
  brand: string;
  dateText: string;
  currentBackgroundIndex: number;
  totalBackgrounds: number;
  ready: boolean;
  switching: boolean;
  onShuffleBackground: () => void;
};

export function HomeToolbar({
  brand,
  dateText,
  currentBackgroundIndex,
  totalBackgrounds,
  ready,
  switching,
  onShuffleBackground,
}: HomeToolbarProps) {
  return (
    <header className="landing-toolbar">
      <span className="toolbar-brand">
        {brand} · {dateText}
      </span>
      <div className="toolbar-actions">
        <span
          className="bg-progress"
          title={ready ? "背景池已加载" : "背景加载中"}
        >
          BG {currentBackgroundIndex}/{totalBackgrounds}
        </span>
        <button
          type="button"
          className="shuffle-btn"
          onClick={onShuffleBackground}
          disabled={!ready || switching}
        >
          {switching ? "加载中..." : "换背景 (B)"}
        </button>
      </div>
    </header>
  );
}

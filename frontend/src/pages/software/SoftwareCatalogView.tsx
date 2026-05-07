import { CATEGORY_TABS, PLATFORM_TABS } from "./softwareCatalog";
import type { ToolCategory, ToolItem, ToolPlatform } from "./types";

type ToolbarProps = {
  activeCategory: ToolCategory;
  activePlatform: "全部" | ToolPlatform;
  keyword: string;
  onCategoryChange: (value: ToolCategory) => void;
  onPlatformChange: (value: "全部" | ToolPlatform) => void;
  onKeywordChange: (value: string) => void;
  onReset: () => void;
};

type ContentProps = {
  filteredTools: ToolItem[];
  activeTool: ToolItem | null;
  activeToolId: string;
  onSelectTool: (toolId: string) => void;
};

export function SoftwareCatalogToolbar({
  activeCategory,
  activePlatform,
  keyword,
  onCategoryChange,
  onPlatformChange,
  onKeywordChange,
  onReset,
}: ToolbarProps) {
  return (
    <section className="software-toolbar">
      <div className="software-search-panel">
        <input
          className="software-search"
          type="text"
          value={keyword}
          placeholder="搜索工具名 / 平台 / 标签"
          onChange={(event) => onKeywordChange(event.target.value)}
        />
      </div>

      <div className="software-filter-group" aria-label="分类筛选">
        {CATEGORY_TABS.map((item) => (
          <button
            key={item}
            type="button"
            className={
              item === activeCategory
                ? "software-filter-chip is-active"
                : "software-filter-chip"
            }
            onClick={() => onCategoryChange(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="software-filter-group" aria-label="平台筛选">
        {PLATFORM_TABS.map((item) => (
          <button
            key={item}
            type="button"
            className={
              item === activePlatform
                ? "software-filter-chip is-active"
                : "software-filter-chip"
            }
            onClick={() => onPlatformChange(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="software-toolbar-actions">
        <button type="button" className="software-reset-btn" onClick={onReset}>
          重置筛选
        </button>
      </div>
    </section>
  );
}

export function SoftwareCatalogContent({
  filteredTools,
  activeTool,
  activeToolId,
  onSelectTool,
}: ContentProps) {
  return (
    <div className="software-content">
      <section className="software-grid" aria-label="工具卡片列表">
        {filteredTools.map((tool) => (
          <article
            key={tool.id}
            className={
              tool.id === activeToolId ? "software-card is-active" : "software-card"
            }
            tabIndex={0}
            role="button"
            onClick={() => onSelectTool(tool.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectTool(tool.id);
              }
            }}
          >
            <div className="software-card-top">
              <div>
                <h3>{tool.name}</h3>
                <p className="software-card-summary">{tool.summary}</p>
              </div>
              <span className="software-card-category">{tool.category}</span>
            </div>

            <div className="software-platforms">
              {tool.platforms.map((platform) => (
                <span key={`${tool.id}-${platform}`} className="software-pill">
                  {platform}
                </span>
              ))}
            </div>

            <div className="software-tags">
              {tool.tags.map((tag) => (
                <span key={`${tool.id}-${tag}`} className="software-tag">
                  {tag}
                </span>
              ))}
            </div>

            <p className="software-note">{tool.note}</p>

            <div className="software-card-actions">
              <a
                className="software-select-btn"
                href={tool.detailUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
              >
                查看详情
              </a>
              <a
                className="software-download-btn"
                href={tool.downloadUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
              >
                下载
              </a>
            </div>
          </article>
        ))}
      </section>

      {activeTool ? (
        <aside className="software-detail">
          <p className="software-detail-label">当前选中</p>
          <h2>{activeTool.name}</h2>
          <p className="software-detail-summary">{activeTool.summary}</p>

          <div className="software-detail-block">
            <span className="software-detail-title">适用平台</span>
            <div className="software-platforms">
              {activeTool.platforms.map((platform) => (
                <span key={platform} className="software-pill">
                  {platform}
                </span>
              ))}
            </div>
          </div>

          <div className="software-detail-block">
            <span className="software-detail-title">标签</span>
            <div className="software-tags">
              {activeTool.tags.map((tag) => (
                <span key={tag} className="software-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="software-detail-block">
            <span className="software-detail-title">使用建议</span>
            <p className="software-detail-note">{activeTool.note}</p>
          </div>

          <div className="software-detail-actions">
            <a
              className="software-select-btn"
              href={activeTool.detailUrl}
              target="_blank"
              rel="noreferrer"
            >
              查看详情
            </a>
            <a
              className="software-download-btn"
              href={activeTool.downloadUrl}
              target="_blank"
              rel="noreferrer"
            >
              下载
            </a>
          </div>
        </aside>
      ) : null}
    </div>
  );
}

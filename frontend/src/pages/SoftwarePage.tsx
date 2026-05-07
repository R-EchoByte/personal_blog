import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { resolveApiUrl } from "../services/api";
import { CATEGORY_TABS, CURATED_TOOLS, PLATFORM_TABS } from "./software/softwareCatalog";
import { getPublishedResources } from "./software/softwareAdminApi";
import type { PublishedResource, ToolCategory, ToolItem, ToolPlatform } from "./software/types";
import "./SoftwarePage.css";

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function asToolItem(resource: PublishedResource): ToolItem {
  return {
    id: `uploaded-${resource.id}`,
    name: resource.name,
    summary: resource.summary,
    category: (CATEGORY_TABS.includes(resource.category as ToolCategory)
      ? resource.category
      : "系统") as ToolCategory,
    platforms: resource.platforms as ToolPlatform[],
    tags: resource.tags,
    note: resource.note || `已发布文件：${resource.file_name}`,
    detailUrl: resolveApiUrl(resource.root_url || resource.download_url),
    downloadUrl: resolveApiUrl(resource.download_url),
  };
}

export default function SoftwarePage() {
  const [activeCategory, setActiveCategory] = useState<ToolCategory>("全部");
  const [activePlatform, setActivePlatform] = useState<"全部" | ToolPlatform>("全部");
  const [keyword, setKeyword] = useState("");
  const [activeToolId, setActiveToolId] = useState<string>(CURATED_TOOLS[0]?.id ?? "");
  const [publishedResources, setPublishedResources] = useState<PublishedResource[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const normalizedKeyword = useMemo(() => normalizeText(keyword), [keyword]);
  const combinedTools = useMemo(
    () => [...publishedResources.map(asToolItem), ...CURATED_TOOLS],
    [publishedResources],
  );

  const filteredTools = useMemo(
    () =>
      combinedTools.filter((tool) => {
        const categoryMatched =
          activeCategory === "全部" || tool.category === activeCategory;
        if (!categoryMatched) return false;

        const platformMatched =
          activePlatform === "全部" || tool.platforms.includes(activePlatform);
        if (!platformMatched) return false;

        if (!normalizedKeyword) return true;
        const searchableText = normalizeText(
          `${tool.name} ${tool.summary} ${tool.tags.join(" ")} ${tool.platforms.join(" ")}`,
        );
        return searchableText.includes(normalizedKeyword);
      }),
    [activeCategory, activePlatform, combinedTools, normalizedKeyword],
  );

  const activeTool = useMemo(
    () => filteredTools.find((tool) => tool.id === activeToolId) ?? filteredTools[0] ?? null,
    [activeToolId, filteredTools],
  );

  const groupedCount = useMemo(
    () =>
      CATEGORY_TABS.slice(1).map((category) => ({
        category,
        count: combinedTools.filter((tool) => tool.category === category).length,
      })),
    [combinedTools],
  );

  useEffect(() => {
    const loadResources = async () => {
      try {
        const response = await getPublishedResources();
        setPublishedResources(response.items);
      } catch {
        setErrorMessage("资源列表加载失败，请稍后刷新重试。");
      }
    };
    void loadResources();
  }, []);

  useEffect(() => {
    if (filteredTools.length === 0) {
      setActiveToolId("");
      return;
    }
    if (!filteredTools.some((tool) => tool.id === activeToolId)) {
      setActiveToolId(filteredTools[0].id);
    }
  }, [activeToolId, filteredTools]);

  return (
    <section className="software-page">
      <header className="software-header">
        <div>
          <p className="software-eyebrow">Software Resources</p>
          <h1 className="software-title">软件资源</h1>
          <p className="software-subtitle">
            面向工具下载与脚本分发的资源页，管理账号、上传与权限已拆到独立管理台。
          </p>
        </div>
        <div className="software-header-actions">
          <Link className="software-header-link" to="/software/admin">
            进入管理台
          </Link>
          <Link className="software-home-link" to="/">
            返回首页
          </Link>
        </div>
      </header>

      <section className="software-overview">
        {groupedCount.map((item) => (
          <article key={item.category} className="software-metric">
            <span className="software-metric-label">{item.category}</span>
            <strong className="software-metric-value">{item.count}</strong>
          </article>
        ))}
      </section>

      <section className="software-status-strip">
        <p>资源浏览与后台管理已分区，下载页更干净，管理逻辑也不会再混在一起。</p>
        {errorMessage ? <span className="software-status-error">{errorMessage}</span> : null}
      </section>

      <section className="software-toolbar">
        <div className="software-search-panel">
          <input
            className="software-search"
            type="text"
            value={keyword}
            placeholder="搜索工具名 / 平台 / 标签"
            onChange={(event) => setKeyword(event.target.value)}
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
              onClick={() => setActiveCategory(item)}
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
              onClick={() => setActivePlatform(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="software-toolbar-actions">
          <button
            type="button"
            className="software-reset-btn"
            onClick={() => {
              setKeyword("");
              setActiveCategory("全部");
              setActivePlatform("全部");
            }}
          >
            重置筛选
          </button>
        </div>
      </section>

      <section className="software-list-head">
        <div>
          <h2>工具列表</h2>
          <p>
            当前结果：{filteredTools.length} 项
            {activeCategory !== "全部" ? ` · 分类 ${activeCategory}` : ""}
            {activePlatform !== "全部" ? ` · 平台 ${activePlatform}` : ""}
          </p>
        </div>
      </section>

      <div className="software-content">
        <section className="software-grid" aria-label="工具卡片列表">
          {filteredTools.map((tool) => (
            <article
              key={tool.id}
              className={
                tool.id === activeTool?.id
                  ? "software-card is-active"
                  : "software-card"
              }
              tabIndex={0}
              role="button"
              onClick={() => setActiveToolId(tool.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActiveToolId(tool.id);
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
    </section>
  );
}

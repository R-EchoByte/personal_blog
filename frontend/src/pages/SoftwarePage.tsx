import { Link } from "react-router-dom";

import { SoftwareCatalogContent, SoftwareCatalogToolbar } from "./software/SoftwareCatalogView";
import { useSoftwareCatalog } from "./software/useSoftwareCatalog";
import "./SoftwarePage.css";

export default function SoftwarePage() {
  const catalog = useSoftwareCatalog();

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
            进入上传台
          </Link>
          <Link className="software-home-link" to="/software/admin/accounts">
            账号中心
          </Link>
          <Link className="software-home-link" to="/">
            返回首页
          </Link>
        </div>
      </header>

      <section className="software-overview">
        {catalog.groupedCount.map((item) => (
          <article key={item.category} className="software-metric">
            <span className="software-metric-label">{item.category}</span>
            <strong className="software-metric-value">{item.count}</strong>
          </article>
        ))}
      </section>

      <section className="software-status-strip">
        <p>资源浏览与后台管理已分区，下载页更干净，管理逻辑也不会再混在一起。</p>
        {catalog.errorMessage ? (
          <span className="software-status-error">{catalog.errorMessage}</span>
        ) : null}
      </section>

      <SoftwareCatalogToolbar
        activeCategory={catalog.activeCategory}
        activePlatform={catalog.activePlatform}
        keyword={catalog.keyword}
        onCategoryChange={catalog.setActiveCategory}
        onPlatformChange={catalog.setActivePlatform}
        onKeywordChange={catalog.setKeyword}
        onReset={catalog.resetFilters}
      />

      <section className="software-list-head">
        <div>
          <h2>工具列表</h2>
          <p>
            当前结果：{catalog.filteredTools.length} 项
            {catalog.activeCategory !== "全部" ? ` · 分类 ${catalog.activeCategory}` : ""}
            {catalog.activePlatform !== "全部" ? ` · 平台 ${catalog.activePlatform}` : ""}
          </p>
        </div>
      </section>

      <SoftwareCatalogContent
        filteredTools={catalog.filteredTools}
        activeTool={catalog.activeTool}
        activeToolId={catalog.activeToolId}
        onSelectTool={catalog.setActiveToolId}
      />
    </section>
  );
}

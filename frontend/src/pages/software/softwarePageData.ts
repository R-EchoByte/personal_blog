import { resolveApiUrl } from "../../services/api";
import { CATEGORY_TABS } from "./softwareCatalog";
import type { PublishedResource, ToolCategory, ToolItem, ToolPlatform } from "./types";

export function normalizeToolSearch(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function mapPublishedResourceToTool(resource: PublishedResource): ToolItem {
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

export function filterTools(
  tools: ToolItem[],
  activeCategory: ToolCategory,
  activePlatform: "全部" | ToolPlatform,
  keyword: string,
) {
  const normalizedKeyword = normalizeToolSearch(keyword);

  return tools.filter((tool) => {
    if (activeCategory !== "全部" && tool.category !== activeCategory) {
      return false;
    }
    if (activePlatform !== "全部" && !tool.platforms.includes(activePlatform)) {
      return false;
    }
    if (!normalizedKeyword) {
      return true;
    }

    const searchableText = normalizeToolSearch(
      `${tool.name} ${tool.summary} ${tool.tags.join(" ")} ${tool.platforms.join(" ")}`,
    );
    return searchableText.includes(normalizedKeyword);
  });
}

export function countToolsByCategory(tools: ToolItem[]) {
  return CATEGORY_TABS.slice(1).map((category) => ({
    category,
    count: tools.filter((tool) => tool.category === category).length,
  }));
}

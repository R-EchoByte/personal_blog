import { useEffect, useMemo, useState } from "react";

import { CURATED_TOOLS } from "./softwareCatalog";
import { getPublishedResources } from "./softwareAdminApi";
import { countToolsByCategory, filterTools, mapPublishedResourceToTool } from "./softwarePageData";
import type { PublishedResource, ToolCategory, ToolPlatform } from "./types";

export function useSoftwareCatalog() {
  const [activeCategory, setActiveCategory] = useState<ToolCategory>("全部");
  const [activePlatform, setActivePlatform] = useState<"全部" | ToolPlatform>("全部");
  const [keyword, setKeyword] = useState("");
  const [activeToolId, setActiveToolId] = useState<string>(CURATED_TOOLS[0]?.id ?? "");
  const [publishedResources, setPublishedResources] = useState<PublishedResource[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const combinedTools = useMemo(
    () => [...publishedResources.map(mapPublishedResourceToTool), ...CURATED_TOOLS],
    [publishedResources],
  );
  const filteredTools = useMemo(
    () => filterTools(combinedTools, activeCategory, activePlatform, keyword),
    [activeCategory, activePlatform, combinedTools, keyword],
  );
  const activeTool = useMemo(
    () => filteredTools.find((tool) => tool.id === activeToolId) ?? filteredTools[0] ?? null,
    [activeToolId, filteredTools],
  );
  const groupedCount = useMemo(
    () => countToolsByCategory(combinedTools),
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

  return {
    activeCategory,
    activePlatform,
    keyword,
    activeToolId,
    filteredTools,
    activeTool,
    groupedCount,
    errorMessage,
    setActiveCategory,
    setActivePlatform,
    setKeyword,
    setActiveToolId,
    resetFilters: () => {
      setKeyword("");
      setActiveCategory("全部");
      setActivePlatform("全部");
    },
  };
}

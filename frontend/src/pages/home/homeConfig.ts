export type QuickLink = {
  label: string;
  href: string;
  hint: string;
  shortcut: string;
  external?: boolean;
};

export const QUICK_LINKS: QuickLink[] = [
  { label: "Blog", href: "/blog", hint: "文章与笔记", shortcut: "1" },
  { label: "AI 工具", href: "/ai", hint: "效率助手", shortcut: "2" },
  { label: "软件资源", href: "/software", hint: "工具合集", shortcut: "3" },
  { label: "影视网", href: "/movies", hint: "片库聚合", shortcut: "4" },
];

export const PARTICLE_WORDS = ["I'm 小镇子", "Build AI, Ship Value."];
export const LANDING_SUBTITLE = "Code · Life · Creation";
export const TOOLBAR_BRAND = "rxw";
export const FOOTER_COPYRIGHT = "Copyrights © 2025";
export const FOOTER_ICP = "鲁ICP备2025157599号";
export const SHORTCUT_GUIDE =
  "快捷键：1 Blog · 2 AI工具 · 3 软件资源 · 4 影视网 · B 换背景 · Q 换一句";

export const homeConfig = {
  particleWords: PARTICLE_WORDS,
  subtitle: LANDING_SUBTITLE,
  toolbarBrand: TOOLBAR_BRAND,
  footerCopyright: FOOTER_COPYRIGHT,
  footerIcp: FOOTER_ICP,
  shortcutGuide: SHORTCUT_GUIDE,
} as const;

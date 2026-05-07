export type ToolCategory = "全部" | "系统" | "开发" | "运维" | "网络" | "效率";
export type ToolPlatform = "Windows" | "Linux" | "macOS" | "Web";

export type ToolItem = {
  id: string;
  name: string;
  summary: string;
  category: ToolCategory;
  platforms: ToolPlatform[];
  tags: string[];
  note: string;
  detailUrl: string;
  downloadUrl: string;
};

export type PlatformOverview = {
  platform: ToolPlatform;
  title: string;
  description: string;
};

export type PublishedResource = {
  id: string;
  name: string;
  summary: string;
  category: string;
  platforms: string[];
  tags: string[];
  note: string;
  file_name: string;
  content_type: string;
  file_size: number;
  kind: "script" | "tool";
  download_url: string;
  root_url: string | null;
  wget_command: string | null;
  created_at: string;
};

export type AdminProfile = {
  username: string;
  authenticated: boolean;
};

export type AdminAccount = {
  username: string;
  role: "system" | "managed";
  is_current: boolean;
};

export type AdminLoginResponse = {
  access_token: string;
  token_type: string;
  expires_at: string;
  username: string;
};

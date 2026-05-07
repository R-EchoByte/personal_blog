import type { ToolCategory } from "./types";

export type UploadFormState = {
  kind: "script" | "tool";
  name: string;
  summary: string;
  category: Exclude<ToolCategory, "全部">;
  platforms: string;
  tags: string;
  note: string;
  file: File | null;
};

export const initialUploadForm: UploadFormState = {
  kind: "script",
  name: "",
  summary: "",
  category: "系统",
  platforms: "Linux,Web",
  tags: "脚本,wget",
  note: "",
  file: null,
};

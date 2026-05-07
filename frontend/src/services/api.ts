const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function normalizeErrorDetail(detail: unknown): string | null {
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => normalizeErrorDetail(item))
      .filter((item): item is string => Boolean(item));
    return messages.length > 0 ? messages.join("；") : null;
  }

  if (detail && typeof detail === "object") {
    const detailRecord = detail as Record<string, unknown>;

    if (typeof detailRecord.msg === "string" && detailRecord.msg.trim()) {
      const location = Array.isArray(detailRecord.loc)
        ? detailRecord.loc.join(".")
        : "";
      return location ? `${location}: ${detailRecord.msg}` : detailRecord.msg;
    }

    if (typeof detailRecord.detail === "string" && detailRecord.detail.trim()) {
      return detailRecord.detail;
    }
  }

  return null;
}

function buildUrl(path: string): string {
  if (!API_BASE_URL) return path;
  const base = API_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = path.replace(/^\/+/, "");
  return `${base}/${normalizedPath}`;
}

export function resolveApiUrl(path: string): string {
  return buildUrl(path);
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(path), init);
  if (!response.ok) {
    throw new ApiError(`Request failed: ${response.status}`, response.status);
  }
  return response.json() as Promise<T>;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const response = await fetch(buildUrl(path), init);
  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const data = (await response.json()) as { detail?: unknown };
      const detailMessage = normalizeErrorDetail(data.detail);
      if (detailMessage) {
        message = detailMessage;
      }
    } catch {
      // ignore json parse failures
    }
    throw new ApiError(message, response.status);
  }
  return response.json() as Promise<T>;
}

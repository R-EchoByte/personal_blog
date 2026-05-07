import { apiGet, apiRequest } from "../../services/api";

import type {
  AdminAccount,
  AdminLoginResponse,
  AdminProfile,
  PublishedResource,
} from "./types";

export function getPublishedResources() {
  return apiGet<{ items: PublishedResource[] }>("/api/v1/resources");
}

export function getScopedResources(token: string) {
  return apiGet<{ items: PublishedResource[] }>("/api/v1/admin/resources", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function adminLogin(username: string, password: string) {
  return apiRequest<AdminLoginResponse>("/api/v1/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

export function getAdminProfile(token: string) {
  return apiGet<AdminProfile>("/api/v1/admin/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getAdminAccounts(token: string) {
  return apiGet<{ items: AdminAccount[] }>("/api/v1/admin/accounts", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function updateAdminCredentials(
  token: string,
  payload: {
    current_password: string;
    new_username: string;
    new_password: string;
  },
) {
  return apiRequest<AdminProfile>("/api/v1/admin/credentials", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function createAdminAccount(
  token: string,
  payload: { username: string; password: string; role: "admin" | "user" },
) {
  return apiRequest<{ item: AdminAccount }>("/api/v1/admin/accounts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function deleteAdminAccount(token: string, username: string) {
  return apiRequest<{ deleted_username: string }>(
    `/api/v1/admin/accounts/${encodeURIComponent(username)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
}

export function updateAdminAccount(
  token: string,
  username: string,
  payload: {
    new_password?: string;
    new_role?: "admin" | "user";
  },
) {
  return apiRequest<{ item: AdminAccount }>(
    `/api/v1/admin/accounts/${encodeURIComponent(username)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
}

export function uploadPublishedResource(
  token: string,
  payload: {
    file: File;
    kind: "script" | "tool";
    name: string;
    summary: string;
    category: string;
    platforms: string;
    tags: string;
    note: string;
  },
) {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("kind", payload.kind);
  formData.append("name", payload.name);
  formData.append("summary", payload.summary);
  formData.append("category", payload.category);
  formData.append("platforms", payload.platforms);
  formData.append("tags", payload.tags);
  formData.append("note", payload.note);

  return apiRequest<{ item: PublishedResource }>("/api/v1/admin/resources/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
}

export function deletePublishedResource(token: string, resourceId: string) {
  return apiRequest<{ deleted_id: string }>(`/api/v1/admin/resources/${resourceId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

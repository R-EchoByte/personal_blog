import { useEffect, useMemo, useState } from "react";

import {
  adminLogin,
  createAdminAccount,
  deleteAdminAccount,
  deletePublishedResource,
  getAdminAccounts,
  getAdminProfile,
  getPublishedResources,
  updateAdminCredentials,
  uploadPublishedResource,
} from "./softwareAdminApi";
import { ADMIN_TOKEN_KEY } from "./adminSession";
import type {
  AdminAccount,
  AdminProfile,
  PublishedResource,
  ToolCategory,
} from "./types";

type UploadPayload = {
  kind: "script" | "tool";
  name: string;
  summary: string;
  category: Exclude<ToolCategory, "全部">;
  platforms: string;
  tags: string;
  note: string;
  file: File | null;
};

export function useSoftwareAdmin() {
  const [publishedResources, setPublishedResources] = useState<PublishedResource[]>([]);
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    "管理台支持登录、改密、上传脚本与工具包。",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);

  useEffect(() => {
    void refreshResources();
  }, []);

  useEffect(() => {
    const token = window.localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) return;

    const restoreProfile = async () => {
      try {
        const profile = await getAdminProfile(token);
        setAdminProfile(profile);
        await refreshAdminAccounts(token);
      } catch {
        window.localStorage.removeItem(ADMIN_TOKEN_KEY);
      }
    };
    void restoreProfile();
  }, []);

  const stats = useMemo(() => {
    const scripts = publishedResources.filter((item) => item.kind === "script").length;
    return {
      total: publishedResources.length,
      scripts,
      tools: publishedResources.length - scripts,
    };
  }, [publishedResources]);

  async function refreshResources() {
    try {
      const response = await getPublishedResources();
      setPublishedResources(response.items);
      setErrorMessage("");
      return true;
    } catch {
      setErrorMessage("资源列表加载失败，请稍后刷新重试。");
      return false;
    }
  }

  async function refreshAdminAccounts(tokenArg?: string) {
    const token = tokenArg ?? window.localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) {
      setAdminAccounts([]);
      return false;
    }
    try {
      const response = await getAdminAccounts(token);
      setAdminAccounts(response.items);
      setErrorMessage("");
      return true;
    } catch {
      setErrorMessage("管理员账号列表加载失败，请稍后刷新重试。");
      return false;
    }
  }

  async function handleLogin(username: string, password: string) {
    setAuthBusy(true);
    setErrorMessage("");
    try {
      const response = await adminLogin(username, password);
      window.localStorage.setItem(ADMIN_TOKEN_KEY, response.access_token);
      setAdminProfile({ username: response.username, authenticated: true });
      await refreshAdminAccounts(response.access_token);
      setStatusMessage("管理员已登录，可以开始上传与管理资源。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "登录失败");
      return false;
    } finally {
      setAuthBusy(false);
    }
  }

  function handleLogout() {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdminProfile(null);
    setAdminAccounts([]);
    setStatusMessage("已退出管理员登录。");
    setErrorMessage("");
  }

  async function handleCredentialUpdate(
    currentPassword: string,
    newUsername: string,
    newPassword: string,
  ) {
    const token = window.localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) return false;
    setActionBusy(true);
    setErrorMessage("");
    try {
      const profile = await updateAdminCredentials(token, {
        current_password: currentPassword,
        new_username: newUsername,
        new_password: newPassword,
      });
      const loginResponse = await adminLogin(newUsername, newPassword);
      window.localStorage.setItem(ADMIN_TOKEN_KEY, loginResponse.access_token);
      setAdminProfile(profile);
      await refreshAdminAccounts(loginResponse.access_token);
      setStatusMessage("管理员账号与密码已更新。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "更新失败");
      return false;
    } finally {
      setActionBusy(false);
    }
  }

  async function handleUpload(payload: UploadPayload) {
    const token = window.localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token || !payload.file) return false;
    setUploadBusy(true);
    setErrorMessage("");
    try {
      await uploadPublishedResource(token, {
        file: payload.file,
        kind: payload.kind,
        name: payload.name,
        summary: payload.summary,
        category: payload.category,
        platforms: payload.platforms,
        tags: payload.tags,
        note: payload.note,
      });
      await refreshResources();
      setStatusMessage(
        payload.kind === "script"
          ? "脚本已发布，可直接通过 wget 或浏览器访问。"
          : "工具包已发布，可从下载区直接拉取。",
      );
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "上传失败");
      return false;
    } finally {
      setUploadBusy(false);
    }
  }

  async function handleDelete(resourceId: string) {
    const token = window.localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) return false;
    setActionBusy(true);
    setErrorMessage("");
    try {
      await deletePublishedResource(token, resourceId);
      await refreshResources();
      setStatusMessage("资源已删除。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除失败");
      return false;
    } finally {
      setActionBusy(false);
    }
  }

  async function handleCreateAdminAccount(username: string, password: string) {
    const token = window.localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) return false;
    setActionBusy(true);
    setErrorMessage("");
    try {
      await createAdminAccount(token, { username, password });
      await refreshAdminAccounts(token);
      setStatusMessage("管理员账号已添加。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "新增账号失败");
      return false;
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDeleteAdminAccount(username: string) {
    const token = window.localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) return false;
    setActionBusy(true);
    setErrorMessage("");
    try {
      await deleteAdminAccount(token, username);
      await refreshAdminAccounts(token);
      setStatusMessage("管理员账号已删除。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除账号失败");
      return false;
    } finally {
      setActionBusy(false);
    }
  }

  return {
    adminAccounts,
    adminProfile,
    authBusy,
    actionBusy,
    uploadBusy,
    publishedResources,
    statusMessage,
    errorMessage,
    stats,
    refreshResources,
    handleLogin,
    handleLogout,
    handleCredentialUpdate,
    handleCreateAdminAccount,
    handleDeleteAdminAccount,
    handleUpload,
    handleDelete,
  };
}

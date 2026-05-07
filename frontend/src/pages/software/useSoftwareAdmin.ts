import { useEffect, useMemo, useState } from "react";

import { ApiError } from "../../services/api";
import {
  adminLogin,
  createAdminAccount,
  deleteAdminAccount,
  deletePublishedResource,
  getAdminAccounts,
  getAdminProfile,
  getScopedResources,
  updateAdminCredentials,
  updateAdminAccount,
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
  const [authReady, setAuthReady] = useState(false);
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
    if (!token) {
      setAuthReady(true);
      return;
    }

    const restoreProfile = async () => {
      try {
        const profile = await getAdminProfile(token);
        setAdminProfile(profile);
        await refreshResources(token);
        if (profile.can_manage_accounts) {
          await refreshAdminAccounts(token);
        } else {
          setAdminAccounts([]);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearSession("登录已过期，请重新登录", "");
          return;
        }
        clearSession("当前未登录管理员账号。", "");
      } finally {
        setAuthReady(true);
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

  function clearSession(status = "当前未登录管理员账号。", error = "") {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdminProfile(null);
    setAdminAccounts([]);
    setPublishedResources([]);
    setStatusMessage(status);
    setErrorMessage(error);
  }

  function clearFeedback() {
    setErrorMessage("");
  }

  async function refreshResources(tokenArg?: string) {
    const token = tokenArg ?? window.localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) {
      setPublishedResources([]);
      return false;
    }
    try {
      const response = await getScopedResources(token);
      setPublishedResources(response.items);
      clearFeedback();
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSession("登录已过期，请重新登录", "");
        return false;
      }
      setErrorMessage(
        error instanceof Error ? error.message : "资源列表加载失败，请稍后刷新重试。",
      );
      return false;
    }
  }

  async function refreshAdminAccounts(tokenArg?: string, profileArg?: AdminProfile | null) {
    const token = tokenArg ?? window.localStorage.getItem(ADMIN_TOKEN_KEY);
    const profile = profileArg ?? adminProfile;
    if (!token) {
      setAdminAccounts([]);
      return false;
    }
    if (profile && !profile.can_manage_accounts) {
      setAdminAccounts([]);
      return true;
    }
    try {
      const response = await getAdminAccounts(token);
      setAdminAccounts(response.items);
      clearFeedback();
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSession("登录已过期，请重新登录", "");
        return false;
      }
      if (error instanceof ApiError && error.status === 403) {
        setAdminAccounts([]);
        setErrorMessage("当前账号无权查看账号列表");
        return false;
      }
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "管理员账号列表加载失败，请稍后刷新重试。",
      );
      return false;
    }
  }

  async function handleLogin(username: string, password: string) {
    setAuthBusy(true);
    clearFeedback();
    try {
      const response = await adminLogin(username, password);
      window.localStorage.setItem(ADMIN_TOKEN_KEY, response.access_token);
      setAdminProfile({
        username: response.username,
        role: response.role,
        authenticated: true,
        can_manage_accounts: response.role !== "user",
        can_view_all_resources: response.role !== "user",
      } satisfies AdminProfile);
      await refreshResources(response.access_token);
      if (response.role !== "user") {
        await refreshAdminAccounts(response.access_token);
      } else {
        setAdminAccounts([]);
      }
      setStatusMessage(
        response.role === "user"
          ? "普通用户已登录，现在只能管理自己上传的资源。"
          : "管理员已登录，可以开始管理账号与全部资源。",
      );
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "登录失败");
      return false;
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleAccountCenterLogin(username: string, password: string) {
    setAuthBusy(true);
    clearFeedback();
    try {
      const response = await adminLogin(username, password);
      if (response.role === "user") {
        rejectAccountCenterAccess();
        return false;
      }

      window.localStorage.setItem(ADMIN_TOKEN_KEY, response.access_token);
      setAdminProfile({
        username: response.username,
        role: response.role,
        authenticated: true,
        can_manage_accounts: true,
        can_view_all_resources: true,
      } satisfies AdminProfile);
      await refreshResources(response.access_token);
      await refreshAdminAccounts(response.access_token);
      setStatusMessage("管理员已登录，可以开始创建和管理账号。");
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
    setPublishedResources([]);
    setStatusMessage("已退出管理员登录。");
    setErrorMessage("");
  }

  function rejectAccountCenterAccess() {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdminProfile(null);
    setAdminAccounts([]);
    setPublishedResources([]);
    setStatusMessage("账号中心仅管理员可进入。");
    setErrorMessage("当前权限不足,请联系管理员");
  }

  async function handleCredentialUpdate(
    currentPassword: string,
    newUsername: string,
    newPassword: string,
  ) {
    const token = window.localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) return false;
    setActionBusy(true);
    clearFeedback();
    try {
      const profile = await updateAdminCredentials(token, {
        current_password: currentPassword,
        new_username: newUsername,
        new_password: newPassword,
      });
      const loginResponse = await adminLogin(newUsername, newPassword);
      window.localStorage.setItem(ADMIN_TOKEN_KEY, loginResponse.access_token);
      setAdminProfile(profile);
      await refreshResources(loginResponse.access_token);
      if (profile.can_manage_accounts) {
        await refreshAdminAccounts(loginResponse.access_token, profile);
      } else {
        setAdminAccounts([]);
      }
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
    clearFeedback();
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
      await refreshResources(token);
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
    clearFeedback();
    try {
      await deletePublishedResource(token, resourceId);
      await refreshResources(token);
      setStatusMessage("资源已删除。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除失败");
      return false;
    } finally {
      setActionBusy(false);
    }
  }

  async function handleCreateAdminAccount(
    username: string,
    password: string,
    role: "admin" | "user",
  ) {
    const token = window.localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) return false;
    setActionBusy(true);
    clearFeedback();
    try {
      await createAdminAccount(token, { username, password, role });
      await refreshAdminAccounts(token);
      setStatusMessage(role === "admin" ? "管理员账号已添加。" : "普通用户账号已添加。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "新增账号失败");
      return false;
    } finally {
      setActionBusy(false);
    }
  }

  async function handleUpdateAccount(
    username: string,
    payload: {
      newPassword?: string;
      newRole?: "admin" | "user";
    },
  ) {
    const token = window.localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) return false;
    setActionBusy(true);
    clearFeedback();
    try {
      await updateAdminAccount(token, username, {
        new_password: payload.newPassword,
        new_role: payload.newRole,
      });
      await refreshAdminAccounts(token);
      setStatusMessage("账号权限或密码已更新。");
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "账号更新失败");
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
    authReady,
    authBusy,
    actionBusy,
    uploadBusy,
    publishedResources,
    statusMessage,
    errorMessage,
    stats,
    clearFeedback,
    refreshResources,
    handleLogin,
    handleAccountCenterLogin,
    handleLogout,
    rejectAccountCenterAccess,
    handleCredentialUpdate,
    handleCreateAdminAccount,
    handleUpdateAccount,
    handleDeleteAdminAccount,
    handleUpload,
    handleDelete,
  };
}

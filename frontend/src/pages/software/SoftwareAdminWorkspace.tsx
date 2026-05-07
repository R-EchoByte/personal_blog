import { useEffect, useMemo, useState } from "react";

import { resolveApiUrl } from "../../services/api";
import type {
  AdminAccount,
  AdminProfile,
  PublishedResource,
  ToolCategory,
} from "./types";

type UploadFormState = {
  kind: "script" | "tool";
  name: string;
  summary: string;
  category: Exclude<ToolCategory, "全部">;
  platforms: string;
  tags: string;
  note: string;
  file: File | null;
};

type Props = {
  adminAccounts: AdminAccount[];
  adminProfile: AdminProfile | null;
  authBusy: boolean;
  actionBusy: boolean;
  uploadBusy: boolean;
  publishedResources: PublishedResource[];
  onLogin: (username: string, password: string) => Promise<boolean>;
  onLogout: () => void;
  onCredentialUpdate: (
    currentPassword: string,
    newUsername: string,
    newPassword: string,
  ) => Promise<boolean>;
  onCreateAdminAccount: (username: string, password: string) => Promise<boolean>;
  onDeleteAdminAccount: (username: string) => Promise<boolean>;
  onUpload: (payload: UploadFormState) => Promise<boolean>;
  onDelete: (resourceId: string) => Promise<boolean>;
};

const initialUploadForm: UploadFormState = {
  kind: "script",
  name: "",
  summary: "",
  category: "系统",
  platforms: "Linux,Web",
  tags: "脚本,wget",
  note: "",
  file: null,
};

export function SoftwareAdminWorkspace({
  adminAccounts,
  adminProfile,
  authBusy,
  actionBusy,
  uploadBusy,
  publishedResources,
  onLogin,
  onLogout,
  onCredentialUpdate,
  onCreateAdminAccount,
  onDeleteAdminAccount,
  onUpload,
  onDelete,
}: Props) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountPassword, setNewAccountPassword] = useState("");
  const [confirmAccountPassword, setConfirmAccountPassword] = useState("");
  const [showCredentialForm, setShowCredentialForm] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [uploadForm, setUploadForm] = useState<UploadFormState>(initialUploadForm);
  const [copiedText, setCopiedText] = useState("");
  const [localMessage, setLocalMessage] = useState("");

  const scriptCount = useMemo(
    () => publishedResources.filter((item) => item.kind === "script").length,
    [publishedResources],
  );
  const toolCount = publishedResources.length - scriptCount;

  useEffect(() => {
    if (adminProfile) {
      setUsername(adminProfile.username);
      setNewUsername(adminProfile.username);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNewAccountName("");
      setNewAccountPassword("");
      setConfirmAccountPassword("");
      setLocalMessage("");
      return;
    }
    setShowCredentialForm(false);
    setShowAccountForm(false);
  }, [adminProfile]);

  const clearLocalMessageLater = (message: string) => {
    setLocalMessage(message);
    window.setTimeout(() => setLocalMessage(""), 2400);
  };

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedText(`${label}已复制`);
      window.setTimeout(() => setCopiedText(""), 1800);
    } catch {
      setCopiedText("复制失败，请手动复制");
      window.setTimeout(() => setCopiedText(""), 1800);
    }
  };

  const toggleCredentialForm = () => {
    setShowCredentialForm((previous) => {
      const next = !previous;
      if (next) {
        setShowAccountForm(false);
        setLocalMessage("密码管理已展开，修改前需输入当前密码。");
      } else {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setLocalMessage("");
      }
      return next;
    });
  };

  const toggleAccountForm = () => {
    setShowAccountForm((previous) => {
      const next = !previous;
      if (next) {
        setShowCredentialForm(false);
        setLocalMessage("账号管理已展开，可新增或删除普通管理员。");
      } else {
        setNewAccountName("");
        setNewAccountPassword("");
        setConfirmAccountPassword("");
        setLocalMessage("");
      }
      return next;
    });
  };

  return (
    <section className="software-admin-shell">
      <article className="software-admin-panel software-admin-panel-main">
        <div className="software-panel-head">
          <div>
            <p className="software-panel-kicker">Admin Workspace</p>
            <h2>上传与权限</h2>
          </div>
          {adminProfile ? (
            <button type="button" className="software-muted-btn" onClick={onLogout}>
              退出登录
            </button>
          ) : null}
        </div>

        {adminProfile ? (
          <>
            <div className="software-admin-profile">
              <span className="software-admin-badge">已登录</span>
              <strong>{adminProfile.username}</strong>
              <p>当前管理员可上传资源、更新凭证、删除错误文件。</p>
              <div className="software-card-actions">
                <button
                  type="button"
                  className="software-primary-btn"
                  onClick={toggleCredentialForm}
                >
                  {showCredentialForm ? "收起密码管理" : "修改密码"}
                </button>
                <button
                  type="button"
                  className="software-muted-btn"
                  onClick={toggleAccountForm}
                >
                  {showAccountForm ? "收起账号管理" : "账号添加管理"}
                </button>
              </div>
              {localMessage ? (
                <p className="software-inline-tip software-inline-tip-info">
                  {localMessage}
                </p>
              ) : null}
            </div>

            {showCredentialForm ? (
              <form
                className="software-form"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const trimmedUsername = newUsername.trim() || adminProfile.username;
                  if (currentPassword.trim().length < 8) {
                    clearLocalMessageLater("当前密码至少 8 位，先填对再提交。");
                    return;
                  }
                  if (newPassword.trim().length < 8) {
                    clearLocalMessageLater("新密码至少 8 位，`123456` 这种短密码不让过。");
                    return;
                  }
                  if (newPassword !== confirmPassword) {
                    clearLocalMessageLater("两次输入的新密码不一致。");
                    return;
                  }
                  const updated = await onCredentialUpdate(
                    currentPassword,
                    trimmedUsername,
                    newPassword,
                  );
                  if (updated) {
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setShowCredentialForm(false);
                    setLocalMessage("");
                  }
                }}
              >
                <div className="software-form-head">
                  <h3>账号密码管理</h3>
                  <p>只有点击“修改密码”后才展示此区域，避免误操作。密码长度至少 8 位。</p>
                </div>
                <div className="software-form-grid">
                  <label>
                    <span>当前密码</span>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    <span>新账号</span>
                    <input
                      type="text"
                      value={newUsername}
                      placeholder={adminProfile.username}
                      onChange={(event) => setNewUsername(event.target.value)}
                      required
                    />
                  </label>
                  <label className="is-full">
                    <span>新密码</span>
                    <input
                      type="password"
                      value={newPassword}
                      minLength={8}
                      onChange={(event) => setNewPassword(event.target.value)}
                      required
                    />
                  </label>
                  <label className="is-full">
                    <span>确认新密码</span>
                    <input
                      type="password"
                      value={confirmPassword}
                      minLength={8}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                    />
                  </label>
                </div>
                <p className="software-inline-tip">
                  修改后会自动刷新当前登录态。系统主管理员账号始终保留兜底接管能力。
                </p>
                <div className="software-form-actions">
                  <button
                    type="submit"
                    className="software-primary-btn"
                    disabled={actionBusy}
                  >
                    {actionBusy ? "更新中..." : "更新管理员凭证"}
                  </button>
                </div>
              </form>
            ) : null}

            {showAccountForm ? (
              <section className="software-form">
                <div className="software-form-head">
                  <h3>账号添加管理</h3>
                  <p>可新增普通管理员账号，系统主管理员保留兜底接管能力。</p>
                </div>
                <div className="software-account-list">
                  {adminAccounts.map((account) => (
                    <article key={account.username} className="software-account-card">
                      <div>
                        <strong>{account.username}</strong>
                        <p>
                          {account.role === "system" ? "系统管理员" : "普通管理员"}
                          {account.is_current ? " · 当前登录" : ""}
                        </p>
                      </div>
                      {account.role === "managed" && !account.is_current ? (
                        <button
                          type="button"
                          className="software-danger-btn"
                          onClick={async () => {
                            await onDeleteAdminAccount(account.username);
                          }}
                        >
                          删除账号
                        </button>
                      ) : null}
                    </article>
                  ))}
                </div>
                <form
                  className="software-form-grid"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const trimmedAccountName = newAccountName.trim();
                    if (trimmedAccountName.length < 3) {
                      clearLocalMessageLater("新增账号至少 3 位。");
                      return;
                    }
                    if (newAccountPassword.trim().length < 8) {
                      clearLocalMessageLater("新增账号密码至少 8 位。");
                      return;
                    }
                    if (newAccountPassword !== confirmAccountPassword) {
                      clearLocalMessageLater("新增账号两次密码输入不一致。");
                      return;
                    }
                    const created = await onCreateAdminAccount(
                      trimmedAccountName,
                      newAccountPassword,
                    );
                    if (created) {
                      setNewAccountName("");
                      setNewAccountPassword("");
                      setConfirmAccountPassword("");
                      clearLocalMessageLater("管理员账号已添加，可以直接用新账号登录。");
                    }
                  }}
                >
                  <label>
                    <span>新增账号</span>
                    <input
                      type="text"
                      value={newAccountName}
                      onChange={(event) => setNewAccountName(event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    <span>初始密码</span>
                    <input
                      type="password"
                      value={newAccountPassword}
                      minLength={8}
                      onChange={(event) => setNewAccountPassword(event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    <span>确认密码</span>
                    <input
                      type="password"
                      value={confirmAccountPassword}
                      minLength={8}
                      onChange={(event) =>
                        setConfirmAccountPassword(event.target.value)
                      }
                      required
                    />
                  </label>
                  <div className="software-form-actions is-full">
                    <button
                      type="submit"
                      className="software-primary-btn"
                      disabled={actionBusy}
                    >
                      {actionBusy ? "添加中..." : "添加管理员账号"}
                    </button>
                  </div>
                </form>
                <p className="software-inline-tip">
                  普通管理员可登录、上传、删资源，也能改自己的密码；不能删除当前登录账号。
                </p>
              </section>
            ) : null}

            <form
              className="software-form"
              onSubmit={async (event) => {
                event.preventDefault();
                const uploaded = await onUpload(uploadForm);
                if (uploaded) {
                  setUploadForm(initialUploadForm);
                }
              }}
            >
              <div className="software-form-head">
                <h3>上传本地资源</h3>
                <p>脚本会自动生成根路径直链，工具包走下载路径。</p>
              </div>
              <div className="software-form-grid">
                <label>
                  <span>资源类型</span>
                  <select
                    value={uploadForm.kind}
                    onChange={(event) =>
                      setUploadForm((previous) => ({
                        ...previous,
                        kind: event.target.value as "script" | "tool",
                      }))
                    }
                  >
                    <option value="script">脚本</option>
                    <option value="tool">工具包</option>
                  </select>
                </label>
                <label>
                  <span>分类</span>
                  <select
                    value={uploadForm.category}
                    onChange={(event) =>
                      setUploadForm((previous) => ({
                        ...previous,
                        category: event.target.value as Exclude<ToolCategory, "全部">,
                      }))
                    }
                  >
                    <option value="系统">系统</option>
                    <option value="开发">开发</option>
                    <option value="运维">运维</option>
                    <option value="网络">网络</option>
                    <option value="效率">效率</option>
                  </select>
                </label>
                <label className="is-full">
                  <span>资源名称</span>
                  <input
                    type="text"
                    value={uploadForm.name}
                    onChange={(event) =>
                      setUploadForm((previous) => ({
                        ...previous,
                        name: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="is-full">
                  <span>摘要</span>
                  <input
                    type="text"
                    value={uploadForm.summary}
                    onChange={(event) =>
                      setUploadForm((previous) => ({
                        ...previous,
                        summary: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  <span>平台</span>
                  <input
                    type="text"
                    value={uploadForm.platforms}
                    onChange={(event) =>
                      setUploadForm((previous) => ({
                        ...previous,
                        platforms: event.target.value,
                      }))
                    }
                    placeholder="Linux,Windows"
                  />
                </label>
                <label>
                  <span>标签</span>
                  <input
                    type="text"
                    value={uploadForm.tags}
                    onChange={(event) =>
                      setUploadForm((previous) => ({
                        ...previous,
                        tags: event.target.value,
                      }))
                    }
                    placeholder="部署,wget"
                  />
                </label>
                <label className="is-full">
                  <span>说明</span>
                  <textarea
                    value={uploadForm.note}
                    onChange={(event) =>
                      setUploadForm((previous) => ({
                        ...previous,
                        note: event.target.value,
                      }))
                    }
                    rows={3}
                  />
                </label>
                <label className="is-full">
                  <span>本地文件</span>
                  <input
                    type="file"
                    onChange={(event) =>
                      setUploadForm((previous) => ({
                        ...previous,
                        file: event.target.files?.[0] ?? null,
                      }))
                    }
                    required
                  />
                </label>
              </div>
              <div className="software-form-actions">
                <button
                  type="submit"
                  className="software-primary-btn"
                  disabled={uploadBusy}
                >
                  {uploadBusy ? "上传中..." : "发布资源"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <form
            className="software-form software-login-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const loggedIn = await onLogin(username, password);
              if (loggedIn) {
                setPassword("");
                setNewUsername(username);
              }
            }}
          >
            <div className="software-form-head">
              <h3>管理员登录</h3>
              <p>登录后可上传脚本、生成 wget 直链、管理下载资源。</p>
            </div>
            <div className="software-form-grid software-login-grid">
              <label>
                <span>账号</span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
              </label>
              <label>
                <span>密码</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
            </div>
            <div className="software-form-actions software-login-actions">
              <button
                type="submit"
                className="software-primary-btn"
                disabled={authBusy}
              >
                {authBusy ? "登录中..." : "登录管理台"}
              </button>
            </div>
          </form>
        )}
      </article>

      <article className="software-admin-panel software-admin-panel-side">
        <div className="software-panel-head">
          <div>
            <p className="software-panel-kicker">Published Resources</p>
            <h2>已发布资源</h2>
          </div>
          <div className="software-published-metrics">
            <span>脚本 {scriptCount}</span>
            <span>工具 {toolCount}</span>
          </div>
        </div>

        <div className="software-published-list">
          {copiedText ? <div className="software-copy-toast">{copiedText}</div> : null}
          {publishedResources.length === 0 ? (
            <div className="software-empty-state">
              <strong>还没有上传资源</strong>
              <p>上传 `.sh` 后会自动生成 `wget https://resohub.top/test.sh` 这种直链。</p>
            </div>
          ) : (
            publishedResources.map((item) => (
              <article key={item.id} className="software-published-card">
                <div className="software-published-top">
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.summary}</p>
                  </div>
                  <span className="software-kind-badge">{item.kind}</span>
                </div>
                <div className="software-tags">
                  {item.platforms.map((platform) => (
                    <span key={`${item.id}-${platform}`} className="software-pill">
                      {platform}
                    </span>
                  ))}
                </div>
                <div className="software-published-meta">
                  <span>{item.file_name}</span>
                  <span>{Math.max(1, Math.round(item.file_size / 1024))} KB</span>
                </div>
                {item.wget_command ? (
                  <label className="software-command-block">
                    <span>wget 命令</span>
                    <input
                      type="text"
                      value={item.wget_command}
                      readOnly
                      onFocus={(event) => event.target.select()}
                    />
                  </label>
                ) : null}
                <div className="software-card-actions">
                  <a
                    className="software-select-btn"
                    href={resolveApiUrl(item.download_url)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    下载资源
                  </a>
                  {item.wget_command ? (
                    <button
                      type="button"
                      className="software-muted-btn"
                      onClick={() => handleCopy(item.wget_command!, "wget命令")}
                    >
                      复制命令
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="software-muted-btn"
                      onClick={() =>
                        handleCopy(resolveApiUrl(item.download_url), "下载链接")
                      }
                    >
                      复制链接
                    </button>
                  )}
                  {adminProfile ? (
                    <button
                      type="button"
                      className="software-danger-btn"
                      onClick={async () => {
                        await onDelete(item.id);
                      }}
                    >
                      删除
                    </button>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </article>
    </section>
  );
}

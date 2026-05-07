import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { resolveApiUrl } from "../../services/api";
import type {
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
  adminProfile: AdminProfile | null;
  showInlineLogin?: boolean;
  authBusy: boolean;
  actionBusy: boolean;
  uploadBusy: boolean;
  publishedResources: PublishedResource[];
  onLogin: (username: string, password: string) => Promise<boolean>;
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
  adminProfile,
  showInlineLogin = true,
  authBusy,
  actionBusy,
  uploadBusy,
  publishedResources,
  onLogin,
  onUpload,
  onDelete,
}: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [uploadForm, setUploadForm] = useState<UploadFormState>(initialUploadForm);
  const [copiedText, setCopiedText] = useState("");

  const scriptCount = useMemo(
    () => publishedResources.filter((item) => item.kind === "script").length,
    [publishedResources],
  );
  const toolCount = publishedResources.length - scriptCount;

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

  return (
    <section className="software-admin-shell">
      <article className="software-admin-panel software-admin-panel-main">
        <div className="software-panel-head">
          <div>
            <p className="software-panel-kicker">Admin Workspace</p>
            <h2>上传与权限</h2>
          </div>
        </div>

        {adminProfile ? (
          <>
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
                <p>脚本会自动生成根路径直链，工具包走下载路径。上传成功后会直接出现在右侧资源列表。</p>
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
        ) : showInlineLogin ? (
          <form
            className="software-form software-login-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const loggedIn = await onLogin(username, password);
              if (loggedIn) {
                setPassword("");
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
        ) : (
          <div className="software-form software-login-placeholder">
            <div className="software-form-head">
              <h3>进入管理台</h3>
              <p>请先完成管理员登录，登录成功后才能上传资源、改密和管理账号。</p>
            </div>
          </div>
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
                  {adminProfile?.can_view_all_resources ? (
                    <span>归属：{item.owner_username}</span>
                  ) : null}
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

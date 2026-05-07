import { useState } from "react";
import { Link } from "react-router-dom";

import { SoftwareAdminUploadForm } from "./SoftwareAdminUploadForm";
import { SoftwarePublishedResourcesPanel } from "./SoftwarePublishedResourcesPanel";
import { initialUploadForm, type UploadFormState } from "./softwareAdminWorkspaceModel";
import type { AdminProfile, PublishedResource } from "./types";

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
          <SoftwareAdminUploadForm
            uploadForm={uploadForm}
            uploadBusy={uploadBusy}
            onChange={setUploadForm}
            onUpload={onUpload}
          />
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

      <SoftwarePublishedResourcesPanel
        adminProfile={adminProfile}
        actionBusy={actionBusy}
        publishedResources={publishedResources}
        onDelete={onDelete}
      />
    </section>
  );
}

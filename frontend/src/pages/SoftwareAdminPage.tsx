import { Link } from "react-router-dom";

import { SoftwareAdminWorkspace } from "./software/SoftwareAdminWorkspace";
import { useSoftwareAdmin } from "./software/useSoftwareAdmin";
import "./SoftwarePage.css";
import "./SoftwareAdminPage.css";

export default function SoftwareAdminPage() {
  const admin = useSoftwareAdmin();

  return (
    <section className="software-admin-page">
      <header className="software-admin-header">
        <div>
          <p className="software-admin-eyebrow">Software Admin Console</p>
          <h1>资源管理台</h1>
          <p>
            登录后可管理账号、查看权限说明、上传脚本与工具包，并维护已发布资源。
          </p>
        </div>
        <div className="software-admin-header-actions">
          <Link className="software-admin-link" to="/software">
            返回资源页
          </Link>
          <Link className="software-admin-link" to="/">
            返回首页
          </Link>
        </div>
      </header>

      <section className="software-admin-status">
        <p>{admin.statusMessage}</p>
        {admin.errorMessage ? (
          <span className="software-admin-error">{admin.errorMessage}</span>
        ) : null}
      </section>

      <section className="software-admin-guide-grid">
        <article className="software-admin-guide-card">
          <p className="software-admin-kicker">权限说明</p>
          <h2>角色边界</h2>
          <ul>
            <li>游客：查看资源、访问详情、下载公开文件。</li>
            <li>管理员：登录、修改账号密码、上传脚本与工具包、删除错误资源。</li>
            <li>系统管理员：`.env` 中的主账号始终保留应急接管能力。</li>
            <li>脚本：支持根路径直链，可直接用于 `wget` 分发。</li>
          </ul>
        </article>
        <article className="software-admin-guide-card">
          <p className="software-admin-kicker">发布流程</p>
          <h2>操作顺序</h2>
          <ol>
            <li>登录管理员账号。</li>
            <li>上传本地文件并填写分类、平台与标签。</li>
            <li>发布后复制 wget 命令或下载链接给外部使用。</li>
          </ol>
        </article>
        <article className="software-admin-guide-card">
          <p className="software-admin-kicker">资源概览</p>
          <h2>当前状态</h2>
          <div className="software-admin-stat-row">
            <span>总资源 {admin.stats.total}</span>
            <span>脚本 {admin.stats.scripts}</span>
            <span>工具 {admin.stats.tools}</span>
          </div>
          <p>
            {admin.adminProfile
              ? `当前管理员：${admin.adminProfile.username}`
              : "当前未登录管理员账号。"}
          </p>
        </article>
      </section>

      <SoftwareAdminWorkspace
        adminAccounts={admin.adminAccounts}
        adminProfile={admin.adminProfile}
        authBusy={admin.authBusy}
        actionBusy={admin.actionBusy}
        uploadBusy={admin.uploadBusy}
        publishedResources={admin.publishedResources}
        onLogin={admin.handleLogin}
        onLogout={admin.handleLogout}
        onCredentialUpdate={admin.handleCredentialUpdate}
        onCreateAdminAccount={admin.handleCreateAdminAccount}
        onDeleteAdminAccount={admin.handleDeleteAdminAccount}
        onUpload={admin.handleUpload}
        onDelete={admin.handleDelete}
      />
    </section>
  );
}

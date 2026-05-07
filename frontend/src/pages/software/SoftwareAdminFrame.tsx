import { type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";

import { SoftwareAdminConfirmDialog } from "./SoftwareAdminConfirmDialog";
import { SoftwareAdminLoginModal } from "./SoftwareAdminLoginModal";
import type { AdminProfile } from "./types";

type LoginModalConfig = {
  title: string;
  copy: string;
  username: string;
  password: string;
  submitLabel: string;
  authBusy: boolean;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => Promise<void>;
};

type Props = {
  eyebrow: string;
  title: string;
  profile: AdminProfile | null;
  statusMessage: string;
  errorMessage: string;
  showStatus: boolean;
  authReady: boolean;
  isLeaving: boolean;
  logoutDialogOpen: boolean;
  onLogoutRequest: () => void;
  onLogoutCancel: () => void;
  onLogoutConfirm: () => void;
  loginModal: LoginModalConfig;
  children: ReactNode;
};

export function SoftwareAdminFrame({
  eyebrow,
  title,
  profile,
  statusMessage,
  errorMessage,
  showStatus,
  authReady,
  isLeaving,
  logoutDialogOpen,
  onLogoutRequest,
  onLogoutCancel,
  onLogoutConfirm,
  loginModal,
  children,
}: Props) {
  const navigate = useNavigate();

  return (
    <section className="software-admin-page">
      <header className="software-admin-header">
        <div className="software-admin-header-main">
          <p className="software-admin-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
        </div>
        <div className="software-admin-header-actions">
          {profile ? (
            <div className="software-admin-userbox">
              <div className="software-admin-userbox-meta">
                <span className="software-admin-userbox-label">当前用户</span>
                <strong>{profile.username}</strong>
              </div>
              <button
                type="button"
                className="software-admin-link software-admin-link-muted"
                onClick={onLogoutRequest}
              >
                退出登录
              </button>
            </div>
          ) : null}
          <Link className="software-admin-link" to="/software">
            返回资源页
          </Link>
        </div>
      </header>

      {showStatus ? (
        <section className="software-admin-status">
          <p>{statusMessage}</p>
          {errorMessage ? (
            <span className="software-admin-error">{errorMessage}</span>
          ) : null}
        </section>
      ) : null}

      {children}

      {authReady && !profile && !isLeaving ? (
        <SoftwareAdminLoginModal
          title={loginModal.title}
          copy={loginModal.copy}
          errorMessage={errorMessage}
          authBusy={loginModal.authBusy}
          username={loginModal.username}
          password={loginModal.password}
          submitLabel={loginModal.submitLabel}
          onClose={() => navigate("/software")}
          onUsernameChange={loginModal.onUsernameChange}
          onPasswordChange={loginModal.onPasswordChange}
          onSubmit={loginModal.onSubmit}
        />
      ) : null}

      {logoutDialogOpen ? (
        <SoftwareAdminConfirmDialog
          title="退出登录确认"
          description="是否退出当前用户？退出后将直接返回资源页。"
          confirmLabel="退出当前用户"
          cancelLabel="继续使用"
          onCancel={onLogoutCancel}
          onConfirm={onLogoutConfirm}
        />
      ) : null}
    </section>
  );
}

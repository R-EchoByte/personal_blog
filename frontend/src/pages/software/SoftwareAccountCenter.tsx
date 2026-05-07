import { useEffect, useMemo, useState } from "react";

import { SoftwareAccountCreateForm } from "./SoftwareAccountCreateForm";
import { SoftwareAccountListPanel } from "./SoftwareAccountListPanel";
import { getAccountRoleLabel, useTimedMessage } from "./accountUtils";
import type { AdminAccount, AdminProfile } from "./types";

type Props = {
  adminAccounts: AdminAccount[];
  adminProfile: AdminProfile;
  actionBusy: boolean;
  defaultAccountFormOpen?: boolean;
  createOnly?: boolean;
  onCredentialUpdate: (
    currentPassword: string,
    newUsername: string,
    newPassword: string,
  ) => Promise<boolean>;
  onCreateAdminAccount: (
    username: string,
    password: string,
    role: "admin" | "user",
  ) => Promise<boolean>;
  onUpdateAccount: (
    username: string,
    payload: { newPassword?: string; newRole?: "admin" | "user" },
  ) => Promise<boolean>;
  onDeleteAdminAccount: (username: string) => Promise<boolean>;
};

export function SoftwareAccountCenter({
  adminAccounts,
  adminProfile,
  actionBusy,
  defaultAccountFormOpen = false,
  createOnly = false,
  onCredentialUpdate,
  onCreateAdminAccount,
  onUpdateAccount,
  onDeleteAdminAccount,
}: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newUsername, setNewUsername] = useState(adminProfile.username);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCredentialForm, setShowCredentialForm] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(defaultAccountFormOpen);
  const { message, showMessage, clearMessage } = useTimedMessage();

  const currentAccount = useMemo(
    () =>
      adminAccounts.find((account) => account.is_current) ??
      adminAccounts.find((account) => account.username === adminProfile.username) ?? {
        username: adminProfile.username,
        role: adminProfile.role,
        is_current: true,
        resource_count: 0,
      },
    [adminAccounts, adminProfile],
  );
  const isSystemAccount = currentAccount.role === "system";
  const allowAccountCreation = adminProfile.can_manage_accounts;

  useEffect(() => {
    setNewUsername(adminProfile.username);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowAccountForm(defaultAccountFormOpen && adminProfile.can_manage_accounts);
    clearMessage();
  }, [adminProfile, defaultAccountFormOpen]);

  const toggleCredentialForm = () => {
    if (createOnly) return;
    setShowCredentialForm((previous) => {
      const next = !previous;
      if (next) {
        setShowAccountForm(false);
        showMessage(
          isSystemAccount
            ? "系统管理员账号由服务器 .env 维护，页面内不支持修改。"
            : "密码管理已展开，修改前必须先验证当前密码。",
        );
      } else {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        clearMessage();
      }
      return next;
    });
  };

  const toggleAccountForm = () => {
    if (createOnly) return;
    setShowAccountForm((previous) => {
      const next = !previous;
      if (next) {
        setShowCredentialForm(false);
        showMessage("账号中心已展开，现在可以新增、改权、删账号。");
      } else {
        clearMessage();
      }
      return next;
    });
  };

  return (
    <section className="software-account-center">
      <div className="software-panel-head">
        <div>
          <p className="software-panel-kicker">Account Center</p>
          <h2>{createOnly ? "创建账号" : "账号管理"}</h2>
        </div>
      </div>

      <div className="software-admin-profile">
        <span className="software-admin-badge">已登录</span>
        <strong>{adminProfile.username}</strong>
        <p>
          {adminProfile.can_manage_accounts
            ? "当前为管理员账号。"
            : "当前为普通用户账号。"}
        </p>
        <div className="software-account-overview">
          <article className="software-account-overview-card">
            <span>当前账号</span>
            <strong>{currentAccount.username}</strong>
          </article>
          <article className="software-account-overview-card">
            <span>当前权限</span>
            <strong>{getAccountRoleLabel(currentAccount.role)}</strong>
          </article>
          <article className="software-account-overview-card">
            <span>上传文件</span>
            <strong>{currentAccount.resource_count}</strong>
          </article>
          <article className="software-account-overview-card">
            <span>密码状态</span>
            <strong>已加密存储</strong>
          </article>
        </div>
        <div className="software-card-actions">
          {!createOnly ? (
            <button
              type="button"
              className="software-primary-btn"
              onClick={toggleCredentialForm}
              disabled={isSystemAccount}
            >
              {isSystemAccount
                ? "系统账号不可修改"
                : showCredentialForm
                  ? "收起修改密码"
                  : "修改密码"}
            </button>
          ) : null}
          {!createOnly && adminProfile.can_manage_accounts ? (
            <button
              type="button"
              className="software-muted-btn"
              onClick={toggleAccountForm}
            >
              {showAccountForm ? "收起账号列表" : "展开账号列表"}
            </button>
          ) : null}
        </div>
        {message ? (
          <p className="software-inline-tip software-inline-tip-info">
            {message}
          </p>
        ) : isSystemAccount ? (
          <p className="software-inline-tip software-inline-tip-info">
            系统管理员账号走服务器配置，建议登录后先创建一个普通管理员账号，日常管理用新账号。
          </p>
        ) : null}
      </div>

      {showCredentialForm && !createOnly ? (
        <form
          className="software-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const trimmedUsername = newUsername.trim() || adminProfile.username;
            if (currentPassword.trim().length < 8) {
              showMessage("当前密码至少 8 位。");
              return;
            }
            if (newPassword.trim().length < 8) {
              showMessage("新密码至少 8 位，`123456` 这种别再试了。");
              return;
            }
            if (newPassword !== confirmPassword) {
              showMessage("两次输入的新密码不一致。");
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
              clearMessage();
            }
          }}
        >
          <div className="software-form-head">
            <h3>账号密码管理</h3>
            <p>旧密码不显示明文，系统只保存哈希。想改密码就老老实实先输当前密码。</p>
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
          <div className="software-form-actions">
            <button
              type="submit"
              className="software-primary-btn"
              disabled={actionBusy}
            >
              {actionBusy ? "更新中..." : "更新当前账号"}
            </button>
          </div>
        </form>
      ) : null}

      {showAccountForm && !createOnly && adminProfile.can_manage_accounts ? (
        <section className="software-form">
          <div className="software-form-head">
            <h3>账号总览</h3>
            <p>这里集中处理账号、角色、资源数量和密码重置。旧密码不会显示明文。</p>
          </div>

          <SoftwareAccountCreateForm
            actionBusy={actionBusy}
            allowAccountCreation={allowAccountCreation}
            onCreateAdminAccount={onCreateAdminAccount}
          />
        </section>
      ) : null}

      {createOnly ? (
        <section className="software-account-create-layout">
          <div className="software-account-create-main">
            <SoftwareAccountCreateForm
              actionBusy={actionBusy}
              allowAccountCreation={allowAccountCreation}
              createOnly
              onCreateAdminAccount={onCreateAdminAccount}
            />
          </div>
          <SoftwareAccountListPanel
            accounts={adminAccounts}
            actionBusy={actionBusy}
            onUpdateAccount={onUpdateAccount}
            onDeleteAdminAccount={onDeleteAdminAccount}
          />
        </section>
      ) : null}
    </section>
  );
}

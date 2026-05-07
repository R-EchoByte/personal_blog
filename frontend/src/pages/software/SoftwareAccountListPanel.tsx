import { useState } from "react";

import { getAccountRoleLabel, useTimedMessage } from "./accountUtils";
import type { AdminAccount } from "./types";

type Props = {
  accounts: AdminAccount[];
  actionBusy: boolean;
  onUpdateAccount: (
    username: string,
    payload: { newPassword?: string; newRole?: "admin" | "user" },
  ) => Promise<boolean>;
  onDeleteAdminAccount: (username: string) => Promise<boolean>;
};

export function SoftwareAccountListPanel({
  accounts,
  actionBusy,
  onUpdateAccount,
  onDeleteAdminAccount,
}: Props) {
  const [editingAccount, setEditingAccount] = useState("");
  const [editingAccountPassword, setEditingAccountPassword] = useState("");
  const [editingAccountRole, setEditingAccountRole] = useState<"admin" | "user">(
    "user",
  );
  const [showResetPassword, setShowResetPassword] = useState(false);
  const { message, showMessage } = useTimedMessage();

  const startAccountEdit = (account: AdminAccount) => {
    if (account.role === "system") return;
    setEditingAccount(account.username);
    setEditingAccountRole(account.role === "admin" ? "admin" : "user");
    setEditingAccountPassword("");
    setShowResetPassword(false);
  };

  const cancelEditing = () => {
    setEditingAccount("");
    setEditingAccountPassword("");
    setShowResetPassword(false);
  };

  const editingAccountRecord = accounts.find(
    (account) => account.username === editingAccount,
  );

  return (
    <aside className="software-form software-account-sidepanel">
      <div className="software-form-head">
        <h3>账号列表</h3>
        <p>创建后直接在这里管理。</p>
      </div>
      <div className="software-account-list">
        {accounts.length === 0 ? (
          <div className="software-empty-state">
            <strong>还没有账号</strong>
            <p>先创建一个普通用户或管理员账号。</p>
          </div>
        ) : (
          accounts.map((account) => (
            <article key={account.username} className="software-account-card">
              <div className="software-account-card-main">
                <strong>{account.username}</strong>
                <p>
                  {getAccountRoleLabel(account.role)}
                  {account.is_current ? " · 当前登录" : ""}
                </p>
              </div>
              <div className="software-account-card-meta">
                <span>上传文件 {account.resource_count}</span>
                <span>{account.role === "system" ? "受保护账号" : "可管理账号"}</span>
              </div>
              <div className="software-card-actions">
                {account.role !== "system" ? (
                  <button
                    type="button"
                    className="software-muted-btn"
                    onClick={() => startAccountEdit(account)}
                  >
                    {editingAccount === account.username ? "正在编辑" : "编辑"}
                  </button>
                ) : null}
                {account.role !== "system" && !account.is_current ? (
                  <button
                    type="button"
                    className="software-danger-btn"
                    onClick={async () => {
                      await onDeleteAdminAccount(account.username);
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

      {editingAccountRecord ? (
        <div className="software-admin-login-modal" role="dialog" aria-modal="true">
          <div className="software-admin-confirm-card software-account-edit-dialog">
            <div className="software-admin-login-head">
              <div>
                <p className="software-admin-kicker">Account Action</p>
                <h2>编辑账号</h2>
              </div>
              <button
                type="button"
                className="software-admin-login-close"
                onClick={cancelEditing}
                aria-label="关闭编辑窗口"
              >
                ×
              </button>
            </div>
            <p className="software-admin-login-copy">
              当前账号：{editingAccountRecord.username}
            </p>
            <form
              className="software-account-inline-form"
              onSubmit={async (event) => {
                event.preventDefault();
                if (
                  !showResetPassword &&
                  editingAccountRole === editingAccountRecord.role
                ) {
                  showMessage("你啥都没改就提交，纯属瞎忙活。");
                  return;
                }
                if (showResetPassword && editingAccountPassword.trim().length < 8) {
                  showMessage("重置密码至少 8 位。");
                  return;
                }
                const updated = await onUpdateAccount(editingAccount, {
                  newPassword: showResetPassword ? editingAccountPassword : undefined,
                  newRole: editingAccountRole,
                });
                if (updated) {
                  cancelEditing();
                }
              }}
            >
              <div className="software-account-inline-grid">
                <label>
                  <span>账号角色</span>
                  <select
                    value={editingAccountRole}
                    onChange={(event) =>
                      setEditingAccountRole(event.target.value as "admin" | "user")
                    }
                  >
                    <option value="user">普通用户</option>
                    <option value="admin">普通管理员</option>
                  </select>
                </label>
                <div className="software-account-inline-password">
                  <span>密码操作</span>
                  <button
                    type="button"
                    className="software-muted-btn"
                    onClick={() => setShowResetPassword((previous) => !previous)}
                  >
                    {showResetPassword ? "取消重置密码" : "重置密码"}
                  </button>
                </div>
                {showResetPassword ? (
                  <label className="is-full">
                    <span>新密码</span>
                    <input
                      type="password"
                      value={editingAccountPassword}
                      onChange={(event) =>
                        setEditingAccountPassword(event.target.value)
                      }
                      placeholder="输入不少于 8 位的新密码"
                    />
                  </label>
                ) : null}
              </div>
              <div className="software-card-actions">
                <button
                  type="submit"
                  className="software-primary-btn"
                  disabled={actionBusy}
                >
                  {actionBusy ? "保存中..." : "保存"}
                </button>
                <button
                  type="button"
                  className="software-muted-btn"
                  onClick={cancelEditing}
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {message ? (
        <p className="software-inline-tip software-inline-tip-info">{message}</p>
      ) : null}
    </aside>
  );
}

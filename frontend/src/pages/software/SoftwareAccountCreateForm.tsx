import { useState } from "react";

import { useTimedMessage } from "./accountUtils";

type Props = {
  actionBusy: boolean;
  allowAccountCreation: boolean;
  createOnly?: boolean;
  onCreateAdminAccount: (
    username: string,
    password: string,
    role: "admin" | "user",
  ) => Promise<boolean>;
};

export function SoftwareAccountCreateForm({
  actionBusy,
  allowAccountCreation,
  createOnly = false,
  onCreateAdminAccount,
}: Props) {
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountPassword, setNewAccountPassword] = useState("");
  const [confirmAccountPassword, setConfirmAccountPassword] = useState("");
  const [newAccountRole, setNewAccountRole] = useState<"admin" | "user">("user");
  const { message, showMessage } = useTimedMessage();

  return (
    <section className="software-form">
      <div className="software-form-head">
        <h3>{createOnly ? "创建账号" : "新增账号"}</h3>
        <p>
          {createOnly
            ? "填写账号、类型和初始密码。"
            : "创建普通用户或普通管理员账号。"}
        </p>
      </div>
      {allowAccountCreation ? (
        <form
          className="software-form-grid"
          onSubmit={async (event) => {
            event.preventDefault();
            const trimmedAccountName = newAccountName.trim();
            if (trimmedAccountName.length < 3) {
              showMessage("新增账号至少 3 位。");
              return;
            }
            if (newAccountPassword.trim().length < 8) {
              showMessage("新增账号密码至少 8 位。");
              return;
            }
            if (newAccountPassword !== confirmAccountPassword) {
              showMessage("新增账号两次密码输入不一致。");
              return;
            }
            const created = await onCreateAdminAccount(
              trimmedAccountName,
              newAccountPassword,
              newAccountRole,
            );
            if (created) {
              setNewAccountName("");
              setNewAccountPassword("");
              setConfirmAccountPassword("");
              setNewAccountRole("user");
              showMessage("账号创建成功，现在可以用新账号登录。");
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
            <span>账号类型</span>
            <select
              value={newAccountRole}
              onChange={(event) =>
                setNewAccountRole(event.target.value as "admin" | "user")
              }
            >
              <option value="user">普通用户</option>
              <option value="admin">普通管理员</option>
            </select>
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
              onChange={(event) => setConfirmAccountPassword(event.target.value)}
              required
            />
          </label>
          <div className="software-form-actions is-full">
            <button
              type="submit"
              className="software-primary-btn"
              disabled={actionBusy}
            >
              {actionBusy ? "创建中..." : "创建新账号"}
            </button>
          </div>
        </form>
      ) : (
        <p className="software-inline-tip">
          当前账号无权创建新账号，请使用管理员账号登录。
        </p>
      )}
      {message ? (
        <p className="software-inline-tip software-inline-tip-info">{message}</p>
      ) : null}
    </section>
  );
}

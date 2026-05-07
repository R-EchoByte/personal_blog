import { type ReactNode, useEffect, useRef, useState } from "react";

type Props = {
  title: string;
  copy: string;
  errorMessage: string;
  authBusy: boolean;
  username: string;
  password: string;
  submitLabel: string;
  onClose: () => void;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => Promise<void>;
  footer?: ReactNode;
};

export function SoftwareAdminLoginModal({
  title,
  copy,
  errorMessage,
  authBusy,
  username,
  password,
  submitLabel,
  onClose,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
  footer,
}: Props) {
  const loginUsernameRef = useRef<HTMLInputElement | null>(null);
  const [validationMessage, setValidationMessage] = useState("");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => {
      loginUsernameRef.current?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (validationMessage) {
      setValidationMessage("");
    }
  }, [username, password]);

  const formMessage = errorMessage || validationMessage;

  return (
    <div className="software-admin-login-modal" role="dialog" aria-modal="true">
      <div className="software-admin-login-card">
        <div className="software-admin-login-head">
          <p className="software-admin-kicker">Admin Access</p>
          <button
            type="button"
            className="software-admin-login-close"
            onClick={onClose}
            aria-label="关闭登录窗口"
          >
            ×
          </button>
        </div>
        <h2>{title}</h2>
        <p className="software-admin-login-copy">{copy}</p>
        {formMessage ? (
          <div className="software-admin-login-error" role="alert">
            {formMessage}
          </div>
        ) : null}
        <form
          className="software-admin-login-form"
          autoComplete="on"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!username.trim()) {
              setValidationMessage("请输入账号");
              loginUsernameRef.current?.focus();
              return;
            }
            if (!password) {
              setValidationMessage("请输入密码");
              return;
            }
            await onSubmit();
          }}
        >
          <label className="software-admin-login-field">
            <span>账号</span>
            <input
              ref={loginUsernameRef}
              type="text"
              name="username"
              value={username}
              onChange={(event) => onUsernameChange(event.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="请输入账号"
              aria-invalid={Boolean(formMessage)}
            />
          </label>
          <label className="software-admin-login-field">
            <span>密码</span>
            <input
              type="password"
              name="current-password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              autoComplete="current-password"
              placeholder="请输入密码"
              aria-invalid={Boolean(formMessage)}
            />
          </label>
          <button
            type="submit"
            className="software-admin-login-submit"
            disabled={authBusy}
          >
            {authBusy ? "登录中..." : submitLabel}
          </button>
        </form>
        {footer}
      </div>
    </div>
  );
}

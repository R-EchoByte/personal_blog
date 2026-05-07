import { useCallback, useEffect, useRef, useState } from "react";

import type { AdminAccount } from "./types";

export function getAccountRoleLabel(role: AdminAccount["role"]) {
  if (role === "system") return "系统管理员";
  if (role === "admin") return "普通管理员";
  return "普通用户";
}

export function useTimedMessage(timeout = 2400) {
  const [message, setMessage] = useState("");
  const timerRef = useRef<number | null>(null);

  const clearMessage = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setMessage("");
  }, []);

  const showMessage = useCallback(
    (nextMessage: string) => {
      clearMessage();
      setMessage(nextMessage);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        setMessage("");
      }, timeout);
    },
    [clearMessage, timeout],
  );

  useEffect(() => clearMessage, [clearMessage]);

  return { message, showMessage, clearMessage };
}

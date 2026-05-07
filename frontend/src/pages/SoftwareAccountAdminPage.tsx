import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { SoftwareAccountCenter } from "./software/SoftwareAccountCenter";
import { SoftwareAdminFrame } from "./software/SoftwareAdminFrame";
import { useSoftwareAdmin } from "./software/useSoftwareAdmin";
import "./SoftwareWorkspace.css";
import "./SoftwareAdminPage.css";

export default function SoftwareAccountAdminPage() {
  const defaultStatusMessage = "管理台支持登录、改密、上传脚本与工具包。";
  const navigate = useNavigate();
  const admin = useSoftwareAdmin();
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (admin.adminProfile) {
      setLoginUsername(admin.adminProfile.username);
      setLoginPassword("");
    }
  }, [admin.adminProfile]);

  useEffect(() => {
    if (admin.adminProfile && !admin.adminProfile.can_manage_accounts) {
      admin.rejectAccountCenterAccess();
    }
  }, [admin.adminProfile]);

  const handleLogoutRequest = () => {
    setLogoutDialogOpen(true);
  };

  const handleLogoutConfirm = () => {
    setLogoutDialogOpen(false);
    setIsLeaving(true);
    admin.handleLogout();
    navigate("/software", { replace: true });
  };

  const showStatus =
    Boolean(admin.errorMessage) || admin.statusMessage !== defaultStatusMessage;

  useEffect(() => {
    if (admin.adminProfile) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        navigate("/software");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [admin.adminProfile, navigate]);

  return (
    <SoftwareAdminFrame
      eyebrow="Account Admin Console"
      title="账号管理中心"
      profile={admin.adminProfile}
      statusMessage={admin.statusMessage}
      errorMessage={admin.errorMessage}
      showStatus={showStatus}
      authReady={admin.authReady}
      isLeaving={isLeaving}
      logoutDialogOpen={logoutDialogOpen}
      onLogoutRequest={handleLogoutRequest}
      onLogoutCancel={() => setLogoutDialogOpen(false)}
      onLogoutConfirm={handleLogoutConfirm}
      loginModal={{
        title: "登录账号中心",
        copy: "登录后即可创建账号。",
        username: loginUsername,
        password: loginPassword,
        submitLabel: "进入账号中心",
        authBusy: admin.authBusy,
        onUsernameChange: (value) => {
          admin.clearFeedback();
          setLoginUsername(value);
        },
        onPasswordChange: (value) => {
          admin.clearFeedback();
          setLoginPassword(value);
        },
        onSubmit: async () => {
          const loggedIn = await admin.handleAccountCenterLogin(
            loginUsername,
            loginPassword,
          );
          if (loggedIn) {
            setLoginPassword("");
          }
        },
      }}
    >
      {admin.adminProfile ? (
        <section className="software-admin-shell software-admin-shell-single">
          <article className="software-admin-panel software-admin-panel-main">
            <SoftwareAccountCenter
              adminAccounts={admin.adminAccounts}
              adminProfile={admin.adminProfile}
              actionBusy={admin.actionBusy}
              createOnly
              onCredentialUpdate={admin.handleCredentialUpdate}
              onCreateAdminAccount={admin.handleCreateAdminAccount}
              onUpdateAccount={admin.handleUpdateAccount}
              onDeleteAdminAccount={admin.handleDeleteAdminAccount}
            />
          </article>
        </section>
      ) : null}
    </SoftwareAdminFrame>
  );
}

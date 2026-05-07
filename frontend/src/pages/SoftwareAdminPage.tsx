import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { SoftwareAdminFrame } from "./software/SoftwareAdminFrame";
import { SoftwareAdminWorkspace } from "./software/SoftwareAdminWorkspace";
import { useSoftwareAdmin } from "./software/useSoftwareAdmin";
import "./SoftwareWorkspace.css";
import "./SoftwareAdminPage.css";

export default function SoftwareAdminPage() {
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

  return (
    <SoftwareAdminFrame
      eyebrow="Software Admin Console"
      title="资源管理台"
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
        title: "登录上传台",
        copy: "登录后即可上传文件。",
        username: loginUsername,
        password: loginPassword,
        submitLabel: "进入上传台",
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
          const loggedIn = await admin.handleLogin(loginUsername, loginPassword);
          if (loggedIn) {
            setLoginPassword("");
          }
        },
      }}
    >
      <SoftwareAdminWorkspace
        adminProfile={admin.adminProfile}
        showInlineLogin={false}
        authBusy={admin.authBusy}
        actionBusy={admin.actionBusy}
        uploadBusy={admin.uploadBusy}
        publishedResources={admin.publishedResources}
        onLogin={admin.handleLogin}
        onUpload={admin.handleUpload}
        onDelete={admin.handleDelete}
      />
    </SoftwareAdminFrame>
  );
}

type Props = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function SoftwareAdminConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "取消",
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="software-admin-login-modal" role="dialog" aria-modal="true">
      <div className="software-admin-confirm-card">
        <p className="software-admin-kicker">Session Action</p>
        <h2>{title}</h2>
        <p className="software-admin-login-copy">{description}</p>
        <div className="software-admin-confirm-actions">
          <button
            type="button"
            className="software-admin-link software-admin-link-muted"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="software-admin-link software-admin-link-danger"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

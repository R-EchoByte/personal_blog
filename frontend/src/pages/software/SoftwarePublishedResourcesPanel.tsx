import { useMemo } from "react";

import { resolveApiUrl } from "../../services/api";
import { useTimedMessage } from "./accountUtils";
import type { AdminProfile, PublishedResource } from "./types";

type Props = {
  adminProfile: AdminProfile | null;
  actionBusy: boolean;
  publishedResources: PublishedResource[];
  onDelete: (resourceId: string) => Promise<boolean>;
};

export function SoftwarePublishedResourcesPanel({
  adminProfile,
  actionBusy,
  publishedResources,
  onDelete,
}: Props) {
  const { message, showMessage } = useTimedMessage(1800);
  const scriptCount = useMemo(
    () => publishedResources.filter((item) => item.kind === "script").length,
    [publishedResources],
  );
  const toolCount = publishedResources.length - scriptCount;

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showMessage(`${label}已复制`);
    } catch {
      showMessage("复制失败，请手动复制");
    }
  };

  return (
    <article className="software-admin-panel software-admin-panel-side">
      <div className="software-panel-head">
        <div>
          <p className="software-panel-kicker">Published Resources</p>
          <h2>已发布资源</h2>
        </div>
        <div className="software-published-metrics">
          <span>脚本 {scriptCount}</span>
          <span>工具 {toolCount}</span>
        </div>
      </div>

      <div className="software-published-list">
        {message ? <div className="software-copy-toast">{message}</div> : null}
        {publishedResources.length === 0 ? (
          <div className="software-empty-state">
            <strong>还没有上传资源</strong>
            <p>上传 `.sh` 后会自动生成 `wget https://resohub.top/test.sh` 这种直链。</p>
          </div>
        ) : (
          publishedResources.map((item) => (
            <article key={item.id} className="software-published-card">
              <div className="software-published-top">
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.summary}</p>
                </div>
                <span className="software-kind-badge">{item.kind}</span>
              </div>
              <div className="software-tags">
                {item.platforms.map((platform) => (
                  <span key={`${item.id}-${platform}`} className="software-pill">
                    {platform}
                  </span>
                ))}
              </div>
              <div className="software-published-meta">
                <span>{item.file_name}</span>
                <span>{Math.max(1, Math.round(item.file_size / 1024))} KB</span>
                {adminProfile?.can_view_all_resources ? (
                  <span>归属：{item.owner_username}</span>
                ) : null}
              </div>
              {item.wget_command ? (
                <label className="software-command-block">
                  <span>wget 命令</span>
                  <input
                    type="text"
                    value={item.wget_command}
                    readOnly
                    onFocus={(event) => event.target.select()}
                  />
                </label>
              ) : null}
              <div className="software-card-actions">
                <a
                  className="software-select-btn"
                  href={resolveApiUrl(item.download_url)}
                  target="_blank"
                  rel="noreferrer"
                >
                  下载资源
                </a>
                {item.wget_command ? (
                  <button
                    type="button"
                    className="software-muted-btn"
                    onClick={() => handleCopy(item.wget_command!, "wget命令")}
                  >
                    复制命令
                  </button>
                ) : (
                  <button
                    type="button"
                    className="software-muted-btn"
                    onClick={() =>
                      handleCopy(resolveApiUrl(item.download_url), "下载链接")
                    }
                  >
                    复制链接
                  </button>
                )}
                {adminProfile ? (
                  <button
                    type="button"
                    className="software-danger-btn"
                    disabled={actionBusy}
                    onClick={async () => {
                      await onDelete(item.id);
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
    </article>
  );
}

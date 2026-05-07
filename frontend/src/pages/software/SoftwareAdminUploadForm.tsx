import type { ToolCategory } from "./types";
import { initialUploadForm, type UploadFormState } from "./softwareAdminWorkspaceModel";

type Props = {
  uploadForm: UploadFormState;
  uploadBusy: boolean;
  onChange: (nextValue: UploadFormState) => void;
  onUpload: (payload: UploadFormState) => Promise<boolean>;
};

export function SoftwareAdminUploadForm({
  uploadForm,
  uploadBusy,
  onChange,
  onUpload,
}: Props) {
  const patchForm = (patch: Partial<UploadFormState>) => {
    onChange({ ...uploadForm, ...patch });
  };

  return (
    <form
      className="software-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const uploaded = await onUpload(uploadForm);
        if (uploaded) {
          onChange(initialUploadForm);
        }
      }}
    >
      <div className="software-form-head">
        <h3>上传本地资源</h3>
        <p>脚本会自动生成根路径直链，工具包走下载路径。上传成功后会直接出现在右侧资源列表。</p>
      </div>
      <div className="software-form-grid">
        <label>
          <span>资源类型</span>
          <select
            value={uploadForm.kind}
            onChange={(event) =>
              patchForm({ kind: event.target.value as "script" | "tool" })
            }
          >
            <option value="script">脚本</option>
            <option value="tool">工具包</option>
          </select>
        </label>
        <label>
          <span>分类</span>
          <select
            value={uploadForm.category}
            onChange={(event) =>
              patchForm({
                category: event.target.value as Exclude<ToolCategory, "全部">,
              })
            }
          >
            <option value="系统">系统</option>
            <option value="开发">开发</option>
            <option value="运维">运维</option>
            <option value="网络">网络</option>
            <option value="效率">效率</option>
          </select>
        </label>
        <label className="is-full">
          <span>资源名称</span>
          <input
            type="text"
            value={uploadForm.name}
            onChange={(event) => patchForm({ name: event.target.value })}
            required
          />
        </label>
        <label className="is-full">
          <span>摘要</span>
          <input
            type="text"
            value={uploadForm.summary}
            onChange={(event) => patchForm({ summary: event.target.value })}
            required
          />
        </label>
        <label>
          <span>平台</span>
          <input
            type="text"
            value={uploadForm.platforms}
            onChange={(event) => patchForm({ platforms: event.target.value })}
            placeholder="Linux,Windows"
          />
        </label>
        <label>
          <span>标签</span>
          <input
            type="text"
            value={uploadForm.tags}
            onChange={(event) => patchForm({ tags: event.target.value })}
            placeholder="部署,wget"
          />
        </label>
        <label className="is-full">
          <span>说明</span>
          <textarea
            value={uploadForm.note}
            onChange={(event) => patchForm({ note: event.target.value })}
            rows={3}
          />
        </label>
        <label className="is-full">
          <span>本地文件</span>
          <input
            type="file"
            onChange={(event) =>
              patchForm({ file: event.target.files?.[0] ?? null })
            }
            required
          />
        </label>
      </div>
      <div className="software-form-actions">
        <button type="submit" className="software-primary-btn" disabled={uploadBusy}>
          {uploadBusy ? "上传中..." : "发布资源"}
        </button>
      </div>
    </form>
  );
}

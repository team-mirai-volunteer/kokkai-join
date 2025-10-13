import type { UploadedFile } from "../types/file";

interface FileListItemProps {
  file: UploadedFile;
  onRemove: (fileId: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileListItem({ file, onRemove }: FileListItemProps) {
  const handleRemoveClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onRemove(file.id);
  };

  return (
    <div className="file-list-item">
      <div className="file-info">
        <span className="file-name">{file.name}</span>
        <span className="file-size">({formatFileSize(file.size)})</span>
      </div>
      <button
        type="button"
        className="file-remove-button"
        onClick={handleRemoveClick}
        aria-label={`${file.name}を削除`}
      >
        ×
      </button>
    </div>
  );
}

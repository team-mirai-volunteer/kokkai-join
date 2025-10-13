import { type ChangeEvent, type DragEvent, useRef, useState } from "react";
import type { UploadedFile } from "../types/file";
import { FileListItem } from "./FileListItem";
import "./FileUploadArea.css";

interface FileUploadAreaProps {
  files: UploadedFile[];
  onFilesAdd: (files: File[]) => void;
  onFileRemove: (fileId: string) => void;
  error: string | null;
}

export function FileUploadArea({
  files,
  onFilesAdd,
  onFileRemove,
  error,
}: FileUploadAreaProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      onFilesAdd(droppedFiles);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      onFilesAdd(Array.from(selectedFiles));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div className="file-upload-area">
      <div
        className={`file-dropzone ${isDragOver ? "drag-over" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label="ファイルを選択またはドラッグ&ドロップ"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          style={{ display: "none" }}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md"
        />

        {files.length === 0 ? (
          <div className="dropzone-placeholder">
            <span className="dropzone-icon">📎</span>
            <p>ファイルをドラッグ&ドロップまたはクリックして選択</p>
          </div>
        ) : (
          <div className="file-list">
            {files.map((file) => (
              <FileListItem key={file.id} file={file} onRemove={onFileRemove} />
            ))}
          </div>
        )}
      </div>

      {error && <div className="file-upload-error">{error}</div>}
    </div>
  );
}

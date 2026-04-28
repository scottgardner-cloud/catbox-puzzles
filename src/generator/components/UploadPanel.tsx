import { useCallback, useRef } from 'react';

export interface UploadPanelProps {
  readonly onFileSelected: (file: File) => void;
  readonly previewUrl: string | null;
  readonly fileName: string | null;
  readonly isLoading: boolean;
  readonly disabled: boolean;
}

/**
 * Image upload panel with drag-and-drop and file picker.
 * Accepts image files only. Shows preview thumbnail when loaded.
 */
export function UploadPanel({
  onFileSelected,
  previewUrl,
  fileName,
  isLoading,
  disabled,
}: UploadPanelProps): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (file.type.startsWith('image/')) {
        onFileSelected(file);
      }
    },
    [onFileSelected],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile, disabled],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset so selecting the same file again triggers onChange
      e.target.value = '';
    },
    [handleFile],
  );

  const handleClick = useCallback(() => {
    if (!disabled) fileInputRef.current?.click();
  }, [disabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    },
    [disabled],
  );

  return (
    <section className="pap-gen-upload" aria-label="Image upload">
      <div
        className={`pap-gen-upload__dropzone${isLoading ? ' pap-gen-upload__dropzone--loading' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload an image. Click or drag and drop."
        aria-busy={isLoading}
        aria-disabled={disabled}
      >
        {isLoading ? (
          <p>Loading image…</p>
        ) : previewUrl ? (
          <div className="pap-gen-upload__preview">
            <img
              src={previewUrl}
              alt={`Preview of ${fileName ?? 'uploaded image'}`}
              className="pap-gen-upload__thumbnail"
            />
            <p className="pap-gen-upload__filename">{fileName}</p>
            <p className="pap-gen-upload__hint">Click or drop to replace</p>
          </div>
        ) : (
          <div className="pap-gen-upload__placeholder">
            <p>Drop an image here or click to browse</p>
            <p className="pap-gen-upload__hint">PNG, JPEG, GIF, or WebP</p>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="pap-sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
    </section>
  );
}

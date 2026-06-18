(() => {
  "use strict";

  const EXTENSIONS = { png: "png", jpeg: "jpg", webp: "webp" };

  function sanitizeBaseName(fileName) {
    return (fileName || "image")
      .replace(/\.[^/.]+$/, "")
      .replace(/[\\/:*?"<>|\s]+/g, "_")
      .replace(/^_+|_+$/g, "") || "image";
  }

  function makeResizedFileName(originalFileName, width, height, format) {
    const baseName = sanitizeBaseName(originalFileName);
    const extension = EXTENSIONS[format] || "png";
    return `${baseName}_${width}x${height}.${extension}`;
  }

  function formatFileSize(bytes) {
    if (!Number.isFinite(bytes)) return "----";
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  window.FileService = { makeResizedFileName, formatFileSize, downloadBlob };
})();

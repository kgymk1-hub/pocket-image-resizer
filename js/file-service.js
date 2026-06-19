(() => { "use strict"; const EXT = { png: "png", jpeg: "jpg", webp: "webp" };
function sanitizeBaseName(fileName) { return (fileName || "image").replace(/\.[^/.]+$/, "").replace(/[\\/:*?"<>|\s]+/g, "_").replace(/^_+|_+$/g, "") || "image"; }
function makeResizedFileName(originalFileName, width, height, format) { return `${sanitizeBaseName(originalFileName)}_${width}x${height}.${EXT[format] || "png"}`; }
function makeCroppedFileName(originalFileName, width, height, format) { return `${sanitizeBaseName(originalFileName)}_crop_${width}x${height}.${EXT[format] || "png"}`; }
function formatFileSize(bytes) { if (!Number.isFinite(bytes)) return "----"; if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`; return `${Math.max(1, Math.round(bytes / 1024))} KB`; }
function downloadBlob(blob, fileName) { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
window.FileService = { sanitizeBaseName, makeResizedFileName, makeCroppedFileName, formatFileSize, downloadBlob }; })();

(() => {
  "use strict";

  function sanitizeBaseName(fileName) {
    return fileName
      .replace(/\.[^/.]+$/, "")
      .replace(/[\\/:*?"<>|]/g, "_")
      .trim() || "image";
  }

  function makeResizedFileName(originalFileName, width, height) {
    const baseName = sanitizeBaseName(originalFileName || "image");
    return `${baseName}_${width}x${height}.png`;
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

  window.FileService = {
    makeResizedFileName,
    downloadBlob
  };
})();

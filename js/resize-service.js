(() => {
  "use strict";

  const MAX_OUTPUT_SIZE = 4096;
  const MIME_TYPES = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" };
  const UNSUPPORTED_FORMAT_MESSAGE = "このブラウザは選択した保存形式に対応していません。PNGで保存してください。";

  function validateSize(width, height) {
    if (width === "" || height === "" || width == null || height == null) throw new Error("幅と高さを入力してください。");
    if (!Number.isInteger(width) || !Number.isInteger(height)) throw new Error("幅と高さは整数で入力してください。");
    if (width < 1 || height < 1) throw new Error("幅と高さは1以上で入力してください。");
    if (width > MAX_OUTPUT_SIZE || height > MAX_OUTPUT_SIZE) throw new Error("幅と高さは4096px以下で入力してください。");
  }

  function getBackgroundColor(value, format) {
    if (value === "black") return "#000000";
    if (value === "white") return "#ffffff";
    // JPEGは透明を保持できないため、透明指定や未指定は白で塗る。
    if (format === "jpeg") return "#ffffff";
    return null;
  }

  function getCropRectByRatio(imageWidth, imageHeight, targetRatio) {
    const sourceRatio = imageWidth / imageHeight;
    let sx = 0;
    let sy = 0;
    let sw = imageWidth;
    let sh = imageHeight;

    if (sourceRatio > targetRatio) {
      sw = imageHeight * targetRatio;
      sx = (imageWidth - sw) / 2;
    } else if (sourceRatio < targetRatio) {
      sh = imageWidth / targetRatio;
      sy = (imageHeight - sh) / 2;
    }

    return { sx, sy, sw, sh };
  }

  function drawCover(ctx, image, outputWidth, outputHeight, cropRatio) {
    // 出力比率または指定比率に合わせ、元画像の中央部分を切り出す。
    const targetRatio = cropRatio || outputWidth / outputHeight;
    const rect = getCropRectByRatio(image.naturalWidth, image.naturalHeight, targetRatio);
    ctx.drawImage(image, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, outputWidth, outputHeight);
  }

  function drawContain(ctx, image, outputWidth, outputHeight) {
    // 元画像全体が収まる倍率で描画し、余った部分を背景として残す。
    const scale = Math.min(outputWidth / image.naturalWidth, outputHeight / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    ctx.drawImage(image, (outputWidth - drawWidth) / 2, (outputHeight - drawHeight) / 2, drawWidth, drawHeight);
  }

  function resize({ image, width, height, mode, backgroundColor, format, quality, cropRatio }) {
    validateSize(width, height);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { alpha: format !== "jpeg" });
    if (!ctx) return Promise.reject(new Error("保存に失敗しました。もう一度お試しください。"));

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const fillColor = mode === "contain" || format === "jpeg" ? getBackgroundColor(backgroundColor, format) : null;
    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fillRect(0, 0, width, height);
    }

    if (mode === "contain") {
      drawContain(ctx, image, width, height);
    } else {
      drawCover(ctx, image, width, height, cropRatio);
    }

    return new Promise((resolve, reject) => {
      const mimeType = MIME_TYPES[format] || MIME_TYPES.png;
      const encoderQuality = format === "png" ? undefined : quality;
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("保存に失敗しました。もう一度お試しください。"));
          return;
        }
        if (format !== "png" && blob.type !== mimeType) {
          reject(new Error(UNSUPPORTED_FORMAT_MESSAGE));
          return;
        }
        resolve(blob);
      }, mimeType, encoderQuality);
    });
  }

  window.ResizeService = { resize, validateSize, getCropRectByRatio, MAX_OUTPUT_SIZE };
})();

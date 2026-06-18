(() => {
  "use strict";

  // Android Chromeで扱いやすく、メモリ消費を抑えるためのサイズ上限です。
  const MAX_OUTPUT_SIZE = 4096;
  const MIME_TYPES = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" };

  function validateSize(width, height) {
    if (width === "" || height === "" || width == null || height == null) {
      throw new Error("幅または高さが未入力です。");
    }
    if (!Number.isInteger(width) || !Number.isInteger(height)) {
      throw new Error("幅または高さは整数で入力してください。");
    }
    if (width < 1 || height < 1) {
      throw new Error("幅または高さは1以上にしてください。");
    }
    if (width > MAX_OUTPUT_SIZE || height > MAX_OUTPUT_SIZE) {
      throw new Error("幅または高さは4096以下にしてください。");
    }
  }

  function getBackgroundColor(value, format) {
    // JPEGは透明を保持できないため、透明指定でも白で塗ります。
    if (format === "jpeg" && value === "transparent") return "#ffffff";
    if (value === "white") return "#ffffff";
    if (value === "black") return "#000000";
    return null;
  }

  function drawCover(ctx, image, outputWidth, outputHeight) {
    // 中央トリミングは出力比率に合わせて元画像の切り出し範囲を中央基準で決めます。
    const sourceRatio = image.naturalWidth / image.naturalHeight;
    const outputRatio = outputWidth / outputHeight;
    let sx = 0;
    let sy = 0;
    let sw = image.naturalWidth;
    let sh = image.naturalHeight;

    if (sourceRatio > outputRatio) {
      sw = image.naturalHeight * outputRatio;
      sx = (image.naturalWidth - sw) / 2;
    } else {
      sh = image.naturalWidth / outputRatio;
      sy = (image.naturalHeight - sh) / 2;
    }

    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);
  }

  function drawContain(ctx, image, outputWidth, outputHeight) {
    // 余白ありは元画像全体が必ず収まる小さい方の倍率を使います。
    const scale = Math.min(outputWidth / image.naturalWidth, outputHeight / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const dx = (outputWidth - drawWidth) / 2;
    const dy = (outputHeight - drawHeight) / 2;
    ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
  }

  function resize({ image, width, height, mode, backgroundColor, format, quality }) {
    validateSize(width, height);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { alpha: format !== "jpeg" });
    if (!ctx) return Promise.reject(new Error("canvas変換失敗。ブラウザが対応していません。"));

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const fillColor = mode === "contain" || format === "jpeg" ? getBackgroundColor(backgroundColor, format) : null;
    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fillRect(0, 0, width, height);
    }

    if (mode === "contain") drawContain(ctx, image, width, height);
    else drawCover(ctx, image, width, height);

    return new Promise((resolve, reject) => {
      const mimeType = MIME_TYPES[format] || MIME_TYPES.png;
      const encoderQuality = format === "png" ? undefined : quality;
      canvas.toBlob((blob) => {
        if (!blob) reject(new Error("canvas変換失敗。保存形式を変更して試してください。"));
        else resolve(blob);
      }, mimeType, encoderQuality);
    });
  }

  window.ResizeService = { resize, validateSize, MAX_OUTPUT_SIZE };
})();

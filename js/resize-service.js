(() => {
  "use strict";

  const MAX_OUTPUT_SIZE = 4096;

  function validateSize(width, height) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
      throw new Error("幅と高さを1以上の数値で入力してください。");
    }

    if (width > MAX_OUTPUT_SIZE || height > MAX_OUTPUT_SIZE) {
      throw new Error("出力サイズは4096px以下にしてください。");
    }
  }

  function getBackgroundColor(value) {
    if (value === "white") return "#ffffff";
    if (value === "black") return "#000000";
    return null;
  }

  function drawCover(ctx, image, outputWidth, outputHeight) {
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
    const scale = Math.min(
      outputWidth / image.naturalWidth,
      outputHeight / image.naturalHeight
    );

    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const dx = (outputWidth - drawWidth) / 2;
    const dy = (outputHeight - drawHeight) / 2;

    ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
  }

  function resizeToPng({ image, width, height, mode, backgroundColor }) {
    validateSize(width, height);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { alpha: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const fillColor = mode === "contain" ? getBackgroundColor(backgroundColor) : null;
    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fillRect(0, 0, width, height);
    }

    if (mode === "contain") {
      drawContain(ctx, image, width, height);
    } else {
      drawCover(ctx, image, width, height);
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("画像の変換に失敗しました。"));
          return;
        }
        resolve(blob);
      }, "image/png");
    });
  }

  window.ResizeService = {
    resizeToPng
  };
})();

(() => {
  "use strict";
  const MAX_OUTPUT_SIZE = 4624;
  const MIME_TYPES = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" };
  function validateSize(width, height) {
    if (width === "" || height === "" || width == null || height == null) throw new Error("幅と高さを入力してください。");
    if (!Number.isInteger(width) || !Number.isInteger(height)) throw new Error("幅と高さは整数で入力してください。");
    if (width < 1 || height < 1) throw new Error("幅と高さは1以上で入力してください。");
    if (width > MAX_OUTPUT_SIZE || height > MAX_OUTPUT_SIZE) throw new Error("幅と高さは4624px以下で入力してください。");
  }
  function bg(color, format) { if (color === "black") return "#000"; if (color === "white" || format === "jpeg") return "#fff"; return null; }
  function coverRect(sw, sh, dw, dh, x = 0.5, y = 0.5) {
    const scale = Math.max(dw / sw, dh / sh), rw = dw / scale, rh = dh / scale;
    return { sx: (sw - rw) * x, sy: (sh - rh) * y, sw: rw, sh: rh, dx: 0, dy: 0, dw, dh };
  }
  function containRect(sw, sh, dw, dh, x = 0.5, y = 0.5) {
    const scale = Math.min(dw / sw, dh / sh), rw = sw * scale, rh = sh * scale;
    return { sx: 0, sy: 0, sw, sh, dx: (dw - rw) * x, dy: (dh - rh) * y, dw: rw, dh: rh };
  }
  function cropNoScaleRect(sw, sh, dw, dh, x = 0.5, y = 0.5) {
    const copyW = Math.min(sw, dw), copyH = Math.min(sh, dh);
    return { sx: (sw - copyW) * x, sy: (sh - copyH) * y, sw: copyW, sh: copyH, dx: (dw - copyW) * x, dy: (dh - copyH) * y, dw: copyW, dh: copyH };
  }
  function draw(ctx, image, opts) {
    const iw = image.naturalWidth || image.width, ih = image.naturalHeight || image.height;
    const x = opts.x ?? 0.5, y = opts.y ?? 0.5;
    let r;
    if (opts.operation === "resize-aspect") r = containRect(iw, ih, opts.width, opts.height, 0.5, 0.5);
    if (opts.operation === "stretch") r = { sx: 0, sy: 0, sw: iw, sh: ih, dx: 0, dy: 0, dw: opts.width, dh: opts.height };
    if (opts.operation === "resize-cover") r = coverRect(iw, ih, opts.width, opts.height, x, y);
    if (opts.operation === "resize-contain") r = containRect(iw, ih, opts.width, opts.height, x, y);
    if (opts.operation === "crop") r = cropNoScaleRect(iw, ih, opts.width, opts.height, x, y);
    ctx.drawImage(image, r.sx, r.sy, r.sw, r.sh, r.dx, r.dy, r.dw, r.dh);
    return r;
  }
  function renderCanvas({ image, width, height, operation, backgroundColor, format, quality, x, y }) {
    validateSize(width, height);
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: format !== "jpeg" });
    if (!ctx) throw new Error("保存に失敗しました。もう一度お試しください。");
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    const fill = operation === "resize-contain" || operation === "crop" || format === "jpeg" ? bg(backgroundColor, format) : null;
    if (fill) { ctx.fillStyle = fill; ctx.fillRect(0, 0, width, height); }
    draw(ctx, image, { width, height, operation, x, y });
    return canvas;
  }
  function toBlob(canvas, format, quality) {
    return new Promise((resolve, reject) => canvas.toBlob((blob) => {
      if (!blob) { reject(new Error("保存に失敗しました。もう一度お試しください。")); return; }
      if (format !== "png" && blob.type !== MIME_TYPES[format]) { reject(new Error("このブラウザは選択した保存形式に対応していません。PNGで保存してください。")); return; }
      resolve(blob);
    }, MIME_TYPES[format] || MIME_TYPES.png, format === "png" ? undefined : quality));
  }
  async function convert(opts) { return toBlob(renderCanvas(opts), opts.format, opts.quality); }
  window.ResizeService = { MAX_OUTPUT_SIZE, validateSize, renderCanvas, convert, coverRect, containRect, cropNoScaleRect };
})();

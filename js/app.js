(() => {
  "use strict";
  const MULTI_DOWNLOAD_INTERVAL_MS = 500, ZIP_LIMIT = 30, MULTI_LIMIT = 10;
  const $ = (id) => document.getElementById(id);
  const message = $("message");
  const els = ["singleTab","batchTab","singlePanel","batchPanel","imageInput","singleOriginalCard","singleOriginalPreview","singlePreview","singleDragHint","singlePreviewPositionPanel","singlePreviewSizePanel","singleMiniWidth","singleMiniHeight","singleMiniPresets","singleNudge","singleSourceSize","singleSourceName","singleFileSize","singleOutputSize","singleModeHelp","singleResizeControls","singleCropControls","singleResizeMethod","singleResizeWidth","singleResizeHeight","resizeWarning","singleQuickPresets","singleDetailPresets","singlePresetEmpty","cropDirection","cropRatio","singleCropWidth","singleCropHeight","singleCropPresets","singlePositionControls","singlePositionButtons","commonSaveSingle","singleSaveButton","continueButton","resetOriginalButton","batchInput","batchOriginalCard","batchOriginalPreview","batchPreview","batchPrev","batchNext","batchCounter","batchCount","batchName","batchSourceSize","batchOutputSize","batchModeHelp","batchResizeMethodBlock","batchResizeMethod","batchWidth","batchHeight","batchPresets","batchPositionControls","batchPositionButtons","commonSaveBatch","zipButton","multiDownloadButton"].reduce((o, id) => { o[id] = $(id); return o; }, {});
  const state = { top: "single", original: null, working: null, batch: [], batchIndex: 0, common: { format: "png", quality: 0.85, backgroundColor: "transparent" }, single: { mode: "resize", resizeMethod: "aspect", width: 512, height: 512, cropDirection: "both", cropRatio: "none", x: 0.5, y: 0.5 }, batchSettings: { mode: "resize", resizeMethod: "stretch", width: 512, height: 512, x: 0.5, y: 0.5 } };
  const resizeMethods = [{ v: "aspect", t: "元画像の縦横比を使用" }, { v: "stretch", t: "変形" }, { v: "cover", t: "トリミング" }, { v: "contain", t: "余白付与" }];
  const batchMethods = resizeMethods.slice(1);
  let messageTimer = null;
  const yieldToBrowser = () => new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });
  function setMessage(t, ok, autoClear) {
    if (messageTimer) { clearTimeout(messageTimer); messageTimer = null; }
    message.textContent = t || "";
    message.classList.toggle("ok", Boolean(ok));
    if (autoClear) {
      messageTimer = setTimeout(() => {
        message.textContent = "";
        message.classList.remove("ok");
        messageTimer = null;
      }, 3000);
    }
  }
  function radio(name, fallback) { const e = document.querySelector(`input[name="${name}"]:checked`); return e ? e.value : fallback; }
  function setRadio(name, value) { const e = document.querySelector(`input[name="${name}"][value="${value}"]`); if (e) e.checked = true; }
  function num(el) { return el.value === "" ? "" : Number(el.value); }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function ratioEqual(a, b) { return Math.abs(a - b) / a <= window.PresetService.RATIO_MATCH_TOLERANCE; }
  function opFromResize(m) { return { aspect: "resize-aspect", stretch: "stretch", cover: "resize-cover", contain: "resize-contain" }[m]; }
  function currentSingleSize() { return state.single.mode === "resize" ? { width: num(els.singleResizeWidth), height: num(els.singleResizeHeight) } : { width: num(els.singleCropWidth), height: num(els.singleCropHeight) }; }
  function commonHtml(container) { container.textContent = ""; const wrap = document.createElement("div"); wrap.className = "save-grid"; [["format", "保存形式", [["png","PNG"],["jpeg","JPEG"],["webp","WebP"]]], ["quality", "品質", [["0.6","低"],["0.85","標準"],["0.95","高"]]], ["backgroundColor", "余白色", [["transparent","透明"],["white","白"],["black","黒"]]]].forEach(([key, label, opts]) => { const box = document.createElement("div"); box.dataset.saveKey = key; const p = document.createElement("p"); p.textContent = label; box.appendChild(p); opts.forEach(([v, t]) => { const l = document.createElement("label"), i = document.createElement("input"); i.type = "radio"; i.name = `${container.id}-${key}`; i.value = v; i.checked = String(state.common[key]) === v; l.append(i, document.createTextNode(t)); box.appendChild(l); i.addEventListener("change", () => { state.common[key] = key === "quality" ? Number(v) : v; saveSettings(); updateAll(); }); }); wrap.appendChild(box); }); container.appendChild(wrap); }
  function syncCommonSaveUi() { [els.commonSaveSingle, els.commonSaveBatch].forEach((container) => { ["format", "quality", "backgroundColor"].forEach((key) => { container.querySelectorAll(`input[name="${container.id}-${key}"]`).forEach((input) => { input.checked = String(state.common[key]) === input.value; input.disabled = key === "quality" && state.common.format === "png"; }); }); const qualityBox = container.querySelector('[data-save-key="quality"]'); if (qualityBox) qualityBox.classList.toggle("hidden", state.common.format === "png"); }); }
  function renderRadioList(container, name, items, value) { container.textContent = ""; items.forEach((item) => { const l = document.createElement("label"), i = document.createElement("input"); i.type = "radio"; i.name = name; i.value = item.v; i.checked = item.v === value; l.append(i, document.createTextNode(item.t)); container.appendChild(l); }); }
  function presetButton(p) { const b = document.createElement("button"); b.type = "button"; b.className = "preset-button"; b.dataset.width = p.width; b.dataset.height = p.height; const s = document.createElement("span"); s.textContent = p.label; const small = document.createElement("small"); small.textContent = p.usage; b.append(s, small); return b; }
  function renderPresetGroups(container, presets) { container.textContent = ""; window.PresetService.getPresetsByCategory(presets).forEach((g) => { const d = document.createElement("details"), sum = document.createElement("summary"), row = document.createElement("div"); d.open = g.category === "favorite"; sum.textContent = g.label; row.className = "preset-row"; g.presets.forEach((p) => row.appendChild(presetButton(p))); d.append(sum, row); container.appendChild(d); }); }
  function getAvailableSizePresets(favs) {
    if (state.single.mode === "crop") {
      const cropPresets = filteredCropPresets();
      return typeof favs === "boolean" ? cropPresets.filter((p) => favs ? p.category === "favorite" : p.category !== "favorite") : cropPresets;
    }
    const all = window.PresetService.OUTPUT_PRESETS.filter((p) => typeof favs === "boolean" ? (favs ? p.category === "favorite" : p.category !== "favorite") : true);
    if (state.single.resizeMethod !== "aspect" || !state.working) return all;
    const r = state.working.width / state.working.height;
    return all.filter((p) => ratioEqual(r, p.width / p.height));
  }
  function filteredSingleResizePresets(favs) { return getAvailableSizePresets(favs); }
  function filteredCropPresets() { let ps = window.PresetService.OUTPUT_PRESETS; if (!state.working) return ps; if (state.single.cropDirection === "vertical") ps = ps.filter((p) => p.width === state.working.width); if (state.single.cropDirection === "horizontal") ps = ps.filter((p) => p.height === state.working.height); const ratio = selectedCropRatio(); if (ratio) ps = ps.filter((p) => ratioEqual(ratio, p.width / p.height)); return ps; }
  function selectedCropRatio() { const id = els.cropRatio.value; if (id === "none") return null; if (id === "source" && state.working) return state.working.width / state.working.height; return (window.PresetService.getCropRatioPresetById(id).ratio || null); }
  function syncAspect(changed) { if (!state.working || state.single.resizeMethod !== "aspect") return; const r = state.working.width / state.working.height; if (changed === "w" && Number.isInteger(num(els.singleResizeWidth))) els.singleResizeHeight.value = Math.round(num(els.singleResizeWidth) / r); if (changed === "h" && Number.isInteger(num(els.singleResizeHeight))) els.singleResizeWidth.value = Math.round(num(els.singleResizeHeight) * r); }
  function syncCrop(changed) { if (!state.working) return; const ratio = selectedCropRatio(), dir = els.cropDirection.value; if (dir === "vertical") { els.singleCropWidth.value = state.working.width; if (ratio) els.singleCropHeight.value = Math.round(state.working.width / ratio); } else if (dir === "horizontal") { els.singleCropHeight.value = state.working.height; if (ratio) els.singleCropWidth.value = Math.round(state.working.height * ratio); } else if (ratio) { if (changed === "w") els.singleCropHeight.value = Math.round(num(els.singleCropWidth) / ratio); else els.singleCropWidth.value = Math.round(num(els.singleCropHeight) * ratio); } }
  function positionAxes(mode, method, image, w, h) { if (!image) return { x: false, y: false, grid: false }; if (mode === "crop") return { x: state.single.cropDirection !== "vertical", y: state.single.cropDirection !== "horizontal", grid: state.single.cropDirection === "both" }; if (method !== "cover" && method !== "contain") return { x: false, y: false, grid: false }; const sr = image.width / image.height, tr = w / h; return method === "cover" ? { x: sr > tr, y: sr < tr, grid: false } : { x: sr < tr, y: sr > tr, grid: false }; }
  function renderPositionPresets(container, axes, batch) { container.textContent = ""; const add = (txt, x, y) => { const b = document.createElement("button"); b.type = "button"; b.className = "preset-button"; b.textContent = txt; b.addEventListener("click", () => { const target = batch ? state.batchSettings : state.single; if (x !== null) target.x = x; if (y !== null) target.y = y; saveSettings(); updateAll(); }); container.appendChild(b); };
    if (axes.grid) [["左上",0,0],["上",0.5,0],["右上",1,0],["左",0,0.5],["中央",0.5,0.5],["右",1,0.5],["左下",0,1],["下",0.5,1],["右下",1,1]].forEach((a)=>add(...a)); else { if (axes.x) [["左",0,null],["中央",0.5,null],["右",1,null]].forEach((a)=>add(...a)); if (axes.y) [["上",null,0],["中央",null,0.5],["下",null,1]].forEach((a)=>add(...a)); } }
  function renderMiniPresets() {
    els.singleMiniPresets.textContent = "";
    const presets = getAvailableSizePresets();
    if (!presets.length) {
      const empty = document.createElement("p");
      empty.className = "empty-presets mini-empty-presets";
      empty.textContent = "現在選択できるプリセットがありません";
      els.singleMiniPresets.appendChild(empty);
      return;
    }
    presets.forEach((p) => els.singleMiniPresets.appendChild(presetButton(p)));
  }
  function syncMiniFromMain() { const s = currentSingleSize(); els.singleMiniWidth.value = s.width || ""; els.singleMiniHeight.value = s.height || ""; }
  function renderNudgeButtons(container, axes) { container.textContent = ""; if (!axes.x && !axes.y) return; const nudges = document.createElement("div"); nudges.className = `nudge-grid ${axes.x && axes.y ? "both" : axes.x ? "horizontal" : "vertical"}`; const add = (text, dx, dy, cls) => { const b = document.createElement("button"); b.type = "button"; b.className = cls; b.textContent = text; b.addEventListener("click", () => { if (axes.x) state.single.x = clamp01(state.single.x + dx); if (axes.y) state.single.y = clamp01(state.single.y + dy); saveSettings(); updateAll(); }); nudges.appendChild(b); };
    if (axes.y) add("↑", 0, -0.1, "up"); if (axes.x) add("←", -0.1, 0, "left"); if (axes.x) add("→", 0.1, 0, "right"); if (axes.y) add("↓", 0, 0.1, "down"); if (axes.y) add("微↑", 0, -0.02, "fine-up"); if (axes.x) add("微←", -0.02, 0, "fine-left"); if (axes.x) add("微→", 0.02, 0, "fine-right"); if (axes.y) add("微↓", 0, 0.02, "fine-down"); container.appendChild(nudges); }
  function paddingDirections(iw, ih, ow, oh) { const dirs = []; if (ow > iw) dirs.push("左右"); if (oh > ih) dirs.push("上下"); return dirs.length === 2 ? "上下左右" : dirs.join("・"); }
  function setPreviewCanvasAspect(canvas, ratio) { const containerWidth = canvas.clientWidth || (canvas.parentElement && canvas.parentElement.clientWidth) || 340; const rawHeight = containerWidth / Math.max(0.05, ratio || 1); const height = Math.max(160, Math.min(360, rawHeight)); canvas.style.height = `${Math.round(height)}px`; }
  function fitRect(srcW, srcH, dstW, dstH) { const scale = Math.min(dstW / srcW, dstH / srcH); const dw = srcW * scale, dh = srcH * scale; return { scale, dx: (dstW - dw) / 2, dy: (dstH - dh) / 2, dw, dh }; }
  function drawChecker(ctx, x, y, w, h) { const size = 12; ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); for (let yy = y; yy < y + h; yy += size) { for (let xx = x; xx < x + w; xx += size) { ctx.fillStyle = ((Math.floor((xx - x) / size) + Math.floor((yy - y) / size)) % 2) ? "rgba(37,99,235,.10)" : "rgba(255,255,255,.55)"; ctx.fillRect(xx, yy, size, size); } } ctx.restore(); }
  function drawCropPreview(ctx, canvas, image, opts) { const iw = image.naturalWidth || image.width, ih = image.naturalHeight || image.height; const hasPadding = opts.operation === "crop" && (opts.width > iw || opts.height > ih); const r = opts.operation === "resize-cover" ? window.ResizeService.coverRect(iw, ih, opts.width, opts.height, opts.x ?? 0.5, opts.y ?? 0.5) : window.ResizeService.cropNoScaleRect(iw, ih, opts.width, opts.height, opts.x ?? 0.5, opts.y ?? 0.5); ctx.save(); if (hasPadding) { const outFit = fitRect(opts.width, opts.height, canvas.width, canvas.height); drawChecker(ctx, outFit.dx, outFit.dy, outFit.dw, outFit.dh); const usedX = outFit.dx + r.dx * outFit.scale, usedY = outFit.dy + r.dy * outFit.scale, usedW = r.dw * outFit.scale, usedH = r.dh * outFit.scale; ctx.drawImage(image, r.sx, r.sy, r.sw, r.sh, usedX, usedY, usedW, usedH); ctx.strokeStyle = "rgba(255,255,255,.95)"; ctx.lineWidth = 4; ctx.strokeRect(usedX, usedY, usedW, usedH); ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 2; ctx.strokeRect(usedX, usedY, usedW, usedH); ctx.setLineDash([7, 5]); ctx.strokeStyle = "rgba(37,99,235,.95)"; ctx.lineWidth = 3; ctx.strokeRect(outFit.dx, outFit.dy, outFit.dw, outFit.dh); ctx.setLineDash([]); const label = `余白あり：${paddingDirections(iw, ih, opts.width, opts.height)}`; ctx.fillStyle = "rgba(15, 23, 42, 0.78)"; ctx.fillRect(outFit.dx + 8, outFit.dy + 8, Math.min(178, outFit.dw - 16), 26); ctx.fillStyle = "#fff"; ctx.font = "700 13px system-ui, sans-serif"; ctx.textBaseline = "middle"; ctx.fillText(label, outFit.dx + 16, outFit.dy + 21); ctx.restore(); return; } const fit = fitRect(iw, ih, canvas.width, canvas.height); ctx.drawImage(image, fit.dx, fit.dy, fit.dw, fit.dh); const rx = fit.dx + r.sx * fit.scale, ry = fit.dy + r.sy * fit.scale, rw = r.sw * fit.scale, rh = r.sh * fit.scale; ctx.fillStyle = "rgba(15, 23, 42, 0.34)"; ctx.beginPath(); ctx.rect(fit.dx, fit.dy, fit.dw, fit.dh); ctx.rect(rx, ry, rw, rh); ctx.fill("evenodd"); ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 4; ctx.strokeRect(rx, ry, rw, rh); ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 2; ctx.strokeRect(rx, ry, rw, rh); ctx.restore(); }

  function originalPreview(canvas, image) {
    const ctx = canvas.getContext("2d");
    const iw = image ? (image.naturalWidth || image.width) : 1, ih = image ? (image.naturalHeight || image.height) : 1;
    const ratio = iw / ih;
    const containerWidth = canvas.clientWidth || (canvas.parentElement && canvas.parentElement.clientWidth) || 340;
    canvas.style.height = `${Math.round(Math.max(120, Math.min(180, containerWidth / Math.max(0.05, ratio))))}px`;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    canvas.width = Math.max(240, Math.round((rect.width || containerWidth) * dpr));
    canvas.height = Math.max(120, Math.round((rect.height || 150) * dpr));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!image) return;
    const fit = fitRect(iw, ih, canvas.width, canvas.height);
    ctx.drawImage(image, fit.dx, fit.dy, fit.dw, fit.dh);
  }
  function preview(canvas, image, opts) { const iw = image ? (image.naturalWidth || image.width) : opts.width, ih = image ? (image.naturalHeight || image.height) : opts.height; const ratio = opts.operation === "crop" && (opts.width > iw || opts.height > ih) ? opts.width / opts.height : (opts.operation === "resize-cover" || opts.operation === "crop" ? iw / ih : opts.width / opts.height); setPreviewCanvasAspect(canvas, ratio); const ctx = canvas.getContext("2d"); const rect = canvas.getBoundingClientRect(); const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1)); canvas.width = Math.max(320, Math.round((rect.width || canvas.clientWidth || 340) * dpr)); canvas.height = Math.max(160, Math.round((rect.height || canvas.clientHeight || 220) * dpr)); ctx.clearRect(0, 0, canvas.width, canvas.height); if (!image) return; if (opts.operation === "resize-cover" || opts.operation === "crop") { drawCropPreview(ctx, canvas, image, opts); return; } const c = window.ResizeService.renderCanvas(opts); const fit = fitRect(c.width, c.height, canvas.width, canvas.height); ctx.drawImage(c, fit.dx, fit.dy, fit.dw, fit.dh); }
  function singleOpts() { const s = currentSingleSize(); window.ResizeService.validateSize(s.width, s.height); return { image: state.working.image, width: s.width, height: s.height, operation: state.single.mode === "resize" ? opFromResize(state.single.resizeMethod) : "crop", backgroundColor: state.common.backgroundColor, format: state.common.format, quality: state.common.quality, x: state.single.x, y: state.single.y }; }
  function updateSizeInputState() {
    const ratio = selectedCropRatio(), dir = state.single.cropDirection;
    const cropWidthDisabled = state.single.mode === "crop" && (dir === "vertical" || (dir === "horizontal" && Boolean(ratio)));
    const cropHeightDisabled = state.single.mode === "crop" && (dir === "horizontal" || (dir === "vertical" && Boolean(ratio)));
    els.singleCropWidth.disabled = cropWidthDisabled;
    els.singleCropHeight.disabled = cropHeightDisabled;
    els.singleMiniWidth.disabled = state.single.mode === "crop" && cropWidthDisabled;
    els.singleMiniHeight.disabled = state.single.mode === "crop" && cropHeightDisabled;
  }
  function updateAll() { state.single.mode = radio("singleMode", state.single.mode); state.batchSettings.mode = radio("batchMode", state.batchSettings.mode); state.single.resizeMethod = radio("singleResizeMethod", state.single.resizeMethod); state.batchSettings.resizeMethod = radio("batchResizeMethod", state.batchSettings.resizeMethod); state.single.width = num(els.singleResizeWidth); state.single.height = num(els.singleResizeHeight); state.batchSettings.width = num(els.batchWidth); state.batchSettings.height = num(els.batchHeight); state.single.cropDirection = els.cropDirection.value; state.single.cropRatio = els.cropRatio.value; updateSizeInputState(); syncCommonSaveUi();
    els.singleResizeControls.classList.toggle("hidden", state.single.mode !== "resize"); els.singleCropControls.classList.toggle("hidden", state.single.mode !== "crop"); els.singleModeHelp.textContent = state.single.mode === "resize" ? "リサイズ：指定した幅・高さに変換します。" : "トリミング：画像を拡大縮小せず、切り抜きまたは余白付与で出力範囲を作ります。"; els.batchModeHelp.textContent = state.batchSettings.mode === "resize" ? "一括リサイズ：変形・トリミング・余白付与を共通設定で適用します。" : "一括トリミング：拡大縮小せず、足りない方向には余白を付けます。";
    renderPresetGroups(els.singleDetailPresets, filteredSingleResizePresets(false)); els.singleQuickPresets.textContent = ""; filteredSingleResizePresets(true).forEach((p)=>els.singleQuickPresets.appendChild(presetButton(p))); els.singlePresetEmpty.classList.toggle("hidden", state.single.resizeMethod !== "aspect" || filteredSingleResizePresets(true).length + filteredSingleResizePresets(false).length > 0); renderPresetGroups(els.singleCropPresets, filteredCropPresets());
    const s = currentSingleSize(), validS = Number.isInteger(s.width) && Number.isInteger(s.height); els.singleOutputSize.textContent = validS ? `${s.width} × ${s.height} px` : "----"; els.resizeWarning.classList.toggle("hidden", !(state.working && state.single.resizeMethod === "stretch" && validS && !ratioEqual(state.working.width / state.working.height, s.width / s.height))); els.resizeWarning.textContent = "縦横比が変わるため、画像が歪む場合があります。大きいサイズの画像は、端末によって読み込みや保存に時間がかかる場合があります。";
    const axes = positionAxes(state.single.mode, state.single.resizeMethod, state.working, s.width || 1, s.height || 1); els.singleOriginalCard.classList.toggle("hidden", !state.working); if (state.working) originalPreview(els.singleOriginalPreview, state.working.image); els.singlePreviewSizePanel.classList.toggle("hidden", !state.working); els.singlePreviewPositionPanel.classList.toggle("hidden", !state.working || (!axes.x && !axes.y)); els.singlePositionControls.classList.toggle("hidden", !state.working || (!axes.x && !axes.y)); renderPositionPresets(els.singlePositionButtons, axes, false); renderNudgeButtons(els.singleNudge, axes); syncMiniFromMain(); renderMiniPresets(); els.singlePreview.classList.toggle("drag-enabled", state.top === "single" && Boolean(state.working) && (axes.x || axes.y)); els.singleDragHint.classList.toggle("hidden", !(state.top === "single" && state.working && (axes.x || axes.y))); els.singlePreview.classList.remove("dragging"); if (state.working && validS) preview(els.singlePreview, state.working.image, { ...singleOpts(), format: state.common.format });
    const bValid = Number.isInteger(num(els.batchWidth)) && Number.isInteger(num(els.batchHeight)); els.batchOutputSize.textContent = bValid ? `${num(els.batchWidth)} × ${num(els.batchHeight)} px` : "----"; const bAxes = state.batchSettings.mode === "crop" || ["cover","contain"].includes(state.batchSettings.resizeMethod) ? { x: true, y: true, grid: false } : { x: false, y: false, grid: false }; els.batchResizeMethodBlock.classList.toggle("hidden", state.batchSettings.mode !== "resize"); els.batchPositionControls.classList.toggle("hidden", !bAxes.x && !bAxes.y); renderPositionPresets(els.batchPositionButtons, bAxes, true); updateBatchInfo(); const batchItem = state.batch[state.batchIndex]; els.batchOriginalCard.classList.toggle("hidden", !batchItem); if (batchItem) originalPreview(els.batchOriginalPreview, batchItem.image); if (batchItem && bValid) preview(els.batchPreview, batchItem.image, batchOpts(batchItem)); saveSettings(); }
  function batchOpts(item) { return { image: item.image, width: num(els.batchWidth), height: num(els.batchHeight), operation: state.batchSettings.mode === "crop" ? "crop" : opFromResize(state.batchSettings.resizeMethod), backgroundColor: state.common.backgroundColor, format: state.common.format, quality: state.common.quality, x: state.batchSettings.x, y: state.batchSettings.y }; }
  function revokeImageData(data) { if (data && data.objectUrl) URL.revokeObjectURL(data.objectUrl); }
  function revokeBatch(items) { items.forEach(revokeImageData); }
  function fileNameForMode(originalName, width, height) { return state.batchSettings.mode === "crop" ? window.FileService.makeCroppedFileName(originalName, width, height, state.common.format) : window.FileService.makeResizedFileName(originalName, width, height, state.common.format); }
  function setBusy(button, busy, text) { if (!button) return; if (busy) { button.dataset.originalText = button.textContent; button.textContent = text; button.disabled = true; } else { button.textContent = button.dataset.originalText || button.textContent; button.disabled = false; delete button.dataset.originalText; } }
  function setGroupBusy(items, busy) { items.forEach((item) => { const el = item.el || item; if (!el) return; if (busy) { if (!Object.prototype.hasOwnProperty.call(el.dataset, "busyDisabled")) el.dataset.busyDisabled = el.disabled ? "1" : "0"; el.disabled = true; if (item.text && !Object.prototype.hasOwnProperty.call(el.dataset, "originalText")) { el.dataset.originalText = el.textContent; el.textContent = item.text; } } else { el.disabled = el.dataset.busyDisabled === "1"; delete el.dataset.busyDisabled; if (item.text) { el.textContent = el.dataset.originalText || el.textContent; delete el.dataset.originalText; } } }); }
  function controlsIn(root, selector) { return Array.from(root.querySelectorAll(selector)); }
  function updateBatchInfo() { const item = state.batch[state.batchIndex]; els.batchCount.textContent = `${state.batch.length}枚`; els.batchCounter.textContent = state.batch.length ? `${state.batchIndex + 1} / ${state.batch.length}` : "0 / 0"; els.batchName.textContent = item ? item.fileName : "----"; els.batchSourceSize.textContent = item ? `${item.width} × ${item.height} px` : "----"; }
  async function loadSingle(e) { try { const file = e.target.files && e.target.files[0]; const d = await window.ImageLoader.loadFromFile(file); revokeImageData(state.original); if (state.working !== state.original) revokeImageData(state.working); state.original = d; state.working = d; els.singleSourceName.textContent = d.fileName; els.singleFileSize.textContent = window.FileService.formatFileSize(d.fileSize); els.singleSourceSize.textContent = `${d.width} × ${d.height} px`; if (!els.singleResizeWidth.value) els.singleResizeWidth.value = d.width; if (!els.singleResizeHeight.value) els.singleResizeHeight.value = d.height; els.singleCropWidth.value = d.width; els.singleCropHeight.value = d.height; setMessage("画像を読み込みました。", true, true); updateAll(); } catch (err) { setMessage(err.message || "画像の読み込みに失敗しました。"); } }
  async function loadBatch(e) { try { const nextBatch = []; for (const f of Array.from(e.target.files || [])) nextBatch.push(await window.ImageLoader.loadFromFile(f)); revokeBatch(state.batch); state.batch = nextBatch; state.batchIndex = 0; setMessage(`${state.batch.length}枚の画像を読み込みました。`, true, true); updateAll(); } catch (err) { setMessage(err.message || "画像の読み込みに失敗しました。"); } }
  async function saveSingle(continueOnly) {
    if (!state.working) { setMessage("画像が選択されていません。"); return; }
    const busyItems = [{ el: els.singleSaveButton, text: continueOnly ? null : "保存中..." }, { el: els.continueButton, text: continueOnly ? "変換中..." : null }, els.resetOriginalButton, els.imageInput].concat(controlsIn(els.singlePanel, "input, select, button").filter((el) => ![els.singleSaveButton, els.continueButton, els.resetOriginalButton, els.imageInput].includes(el)));
    setGroupBusy(busyItems, true);
    try {
      setMessage(continueOnly ? "変換中..." : "保存用画像を変換中...");
      await yieldToBrowser();
      const oldWorking = state.working, opts = singleOpts(), blob = await window.ResizeService.convert(opts);
      await yieldToBrowser();
      if (continueOnly) {
        const nextName = state.single.mode === "crop" ? window.FileService.makeCroppedFileName(state.working.fileName, opts.width, opts.height, state.common.format) : window.FileService.makeResizedFileName(state.working.fileName, opts.width, opts.height, state.common.format);
        const img = await window.ImageLoader.loadFromBlob(blob, nextName);
        await yieldToBrowser();
        state.working = img;
        if (oldWorking !== state.original) revokeImageData(oldWorking);
        els.singleSourceSize.textContent = `${img.width} × ${img.height} px`;
        els.singleSourceName.textContent = img.fileName;
        setMessage("現在の結果を作業中画像にしました。", true, true);
      } else {
        window.FileService.downloadBlob(blob, state.single.mode === "crop" ? window.FileService.makeCroppedFileName(state.working.fileName, opts.width, opts.height, state.common.format) : window.FileService.makeResizedFileName(state.working.fileName, opts.width, opts.height, state.common.format));
        await yieldToBrowser();
        setMessage("保存しました。ブラウザのダウンロード先をご確認ください。", true, true);
      }
      updateAll();
    } catch (err) { setMessage(err.message || "保存に失敗しました。もう一度お試しください。"); } finally { setGroupBusy(busyItems, false); }
  }
  async function saveBatch(zip) {
    if (!state.batch.length) { setMessage("画像が選択されていません。"); return; }
    if (zip && state.batch.length > ZIP_LIMIT) { setMessage("ZIP保存は最大30枚までです。"); return; }
    if (!zip && state.batch.length > MULTI_LIMIT) { setMessage("連続ダウンロードは最大10枚までです。枚数が多い場合はZIP保存を使ってください。"); return; }
    const total = state.batch.length;
    const busyItems = [{ el: els.zipButton, text: zip ? "ZIP作成中..." : null }, { el: els.multiDownloadButton, text: zip ? null : "保存中..." }, els.batchPrev, els.batchNext, els.batchInput].concat(controlsIn(els.batchPanel, "input, select, button").filter((el) => ![els.zipButton, els.multiDownloadButton, els.batchPrev, els.batchNext, els.batchInput].includes(el)));
    setGroupBusy(busyItems, true);
    try {
      if (zip) {
        const z = new JSZip();
        for (let i = 0; i < total; i += 1) {
          const item = state.batch[i], o = batchOpts(item);
          setMessage(`変換中... ${i + 1} / ${total}`);
          await yieldToBrowser();
          const blob = await window.ResizeService.convert(o);
          await yieldToBrowser();
          setMessage(`ZIP作成中... ${i + 1} / ${total}`);
          z.file(fileNameForMode(item.fileName, o.width, o.height), blob);
          await yieldToBrowser();
        }
        const date = new Date().toISOString().slice(0,10).replace(/-/g, "");
        setMessage(`ZIP作成中... ${total} / ${total}`);
        await yieldToBrowser();
        const zipBlob = await z.generateAsync({ type: "blob" }, (metadata) => {
          if (metadata.percent) setMessage(`ZIP作成中... ${total} / ${total} (${Math.floor(metadata.percent)}%)`);
        });
        await yieldToBrowser();
        window.FileService.downloadBlob(zipBlob, `converted_images_${date}.zip`);
      } else {
        for (let i = 0; i < total; i += 1) {
          const item = state.batch[i], o = batchOpts(item);
          setMessage(`変換中... ${i + 1} / ${total}`);
          await yieldToBrowser();
          const blob = await window.ResizeService.convert(o);
          await yieldToBrowser();
          setMessage(`連続ダウンロード中... ${i + 1} / ${total}`);
          window.FileService.downloadBlob(blob, fileNameForMode(item.fileName, o.width, o.height));
          await yieldToBrowser();
          if (i < total - 1) await new Promise((r) => setTimeout(r, MULTI_DOWNLOAD_INTERVAL_MS));
        }
      }
      setMessage(zip ? "ZIPを保存しました。ブラウザのダウンロード先をご確認ください。" : "連続ダウンロードが完了しました。ブラウザのダウンロード先をご確認ください。", true, true);
    } catch (err) { setMessage(zip ? "ZIP保存に失敗しました。枚数を減らして再度お試しください。" : (err.message || "保存に失敗しました。もう一度お試しください。")); } finally { setGroupBusy(busyItems, false); }
  }
  function showUpdateNotice() {
    let notice = $("swUpdateNotice");
    if (!notice) {
      notice = document.createElement("div");
      notice.id = "swUpdateNotice";
      notice.className = "update-notice";
      notice.setAttribute("role", "status");
      const text = document.createElement("span");
      text.textContent = "新しいバージョンがあります。";
      const reload = document.createElement("button");
      reload.type = "button";
      reload.textContent = "更新する";
      reload.addEventListener("click", () => location.reload());
      const close = document.createElement("button");
      close.type = "button";
      close.className = "update-notice-close";
      close.textContent = "あとで";
      close.addEventListener("click", () => notice.remove());
      notice.append(text, reload, close);
      document.body.appendChild(notice);
    }
    notice.classList.add("show");
  }
  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("./service-worker.js").then((registration) => {
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) showUpdateNotice();
        });
      });
    }).catch(console.warn);
  }
  function saveSettings() { window.SettingsService.saveAll({ commonSettings: state.common, singleSettings: state.single, batchSettings: state.batchSettings }); }
  function dragScaleForAxes(axes) { const rect = els.singlePreview.getBoundingClientRect(); const s = currentSingleSize(); const iw = state.working ? state.working.width : s.width, ih = state.working ? state.working.height : s.height; const opts = { width: s.width || 1, height: s.height || 1, x: state.single.x, y: state.single.y }; const op = state.single.mode === "resize" ? opFromResize(state.single.resizeMethod) : "crop"; let xRange = 0, yRange = 0; if (op === "resize-cover") { const r = window.ResizeService.coverRect(iw, ih, opts.width, opts.height, 0.5, 0.5); xRange = Math.max(0, iw - r.sw); yRange = Math.max(0, ih - r.sh); } else if (op === "resize-contain") { const r = window.ResizeService.containRect(iw, ih, opts.width, opts.height, 0.5, 0.5); xRange = Math.max(0, opts.width - r.dw); yRange = Math.max(0, opts.height - r.dh); } else if (op === "crop") { xRange = Math.abs(iw - opts.width); yRange = Math.abs(ih - opts.height); } return { x: axes.x ? Math.max(80, rect.width * (xRange ? 1 : 0.5)) : Infinity, y: axes.y ? Math.max(80, rect.height * (yRange ? 1 : 0.5)) : Infinity }; }
  function bindDrag(canvas, batch) { let dragging = false, lastX = 0, lastY = 0, pointerId = null; const finish = () => { if (!dragging) return; dragging = false; canvas.classList.remove("dragging"); if (pointerId !== null && canvas.hasPointerCapture && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId); pointerId = null; saveSettings(); }; canvas.addEventListener("pointerdown", (e) => { if (batch) return; const s = currentSingleSize(); const axes = positionAxes(state.single.mode, state.single.resizeMethod, state.working, s.width || 1, s.height || 1); if (!axes.x && !axes.y) return; dragging = true; pointerId = e.pointerId; lastX = e.clientX; lastY = e.clientY; canvas.classList.add("dragging"); canvas.setPointerCapture(e.pointerId); e.preventDefault(); }); canvas.addEventListener("pointermove", (e) => { if (!dragging || e.pointerId !== pointerId) return; const target = state.single, s = currentSingleSize(), axes = positionAxes(state.single.mode, state.single.resizeMethod, state.working, s.width || 1, s.height || 1); if (!axes.x && !axes.y) { finish(); return; } const scale = dragScaleForAxes(axes); if (axes.x) target.x = clamp01(target.x + (e.clientX - lastX) / scale.x); if (axes.y) target.y = clamp01(target.y + (e.clientY - lastY) / scale.y); lastX = e.clientX; lastY = e.clientY; updateAll(); canvas.classList.add("dragging"); e.preventDefault(); }); ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => canvas.addEventListener(type, finish)); }
  function init() { const saved = window.SettingsService.loadAll(); Object.assign(state.common, saved.commonSettings); Object.assign(state.single, saved.singleSettings); Object.assign(state.batchSettings, saved.batchSettings); els.singleResizeWidth.value = state.single.width; els.singleResizeHeight.value = state.single.height; els.batchWidth.value = state.batchSettings.width; els.batchHeight.value = state.batchSettings.height; renderRadioList(els.singleResizeMethod, "singleResizeMethod", resizeMethods, state.single.resizeMethod); renderRadioList(els.batchResizeMethod, "batchResizeMethod", batchMethods, state.batchSettings.resizeMethod); els.cropRatio.textContent = ""; [{ id: "none", label: "縦横比指定なし", description: "自由入力" }].concat(window.PresetService.CROP_RATIO_PRESETS).forEach((p) => { const o = document.createElement("option"); o.value = p.id; o.textContent = `${p.label} - ${p.description}`; els.cropRatio.appendChild(o); }); els.cropRatio.value = state.single.cropRatio; renderPresetGroups(els.batchPresets, window.PresetService.OUTPUT_PRESETS); commonHtml(els.commonSaveSingle); commonHtml(els.commonSaveBatch); setRadio("singleMode", state.single.mode); setRadio("batchMode", state.batchSettings.mode);
    els.singleTab.addEventListener("click", () => { state.top = "single"; els.singlePanel.classList.remove("hidden"); els.batchPanel.classList.add("hidden"); els.singleTab.classList.add("active"); els.batchTab.classList.remove("active"); }); els.batchTab.addEventListener("click", () => { state.top = "batch"; els.batchPanel.classList.remove("hidden"); els.singlePanel.classList.add("hidden"); els.batchTab.classList.add("active"); els.singleTab.classList.remove("active"); }); els.imageInput.addEventListener("change", loadSingle); els.batchInput.addEventListener("change", loadBatch); bindDrag(els.singlePreview, false); [els.singleResizeWidth, els.singleResizeHeight].forEach((el, i) => el.addEventListener("input", () => { syncAspect(i ? "h" : "w"); updateAll(); })); [els.singleMiniWidth, els.singleMiniHeight].forEach((el, i) => el.addEventListener("input", () => { const target = state.single.mode === "resize" ? [els.singleResizeWidth, els.singleResizeHeight] : [els.singleCropWidth, els.singleCropHeight]; target[i].value = el.value; if (state.single.mode === "resize") syncAspect(i ? "h" : "w"); else syncCrop(i ? "h" : "w"); updateAll(); })); [els.singleCropWidth, els.singleCropHeight].forEach((el, i) => el.addEventListener("input", () => { syncCrop(i ? "h" : "w"); updateAll(); })); [els.cropDirection, els.cropRatio].forEach((el) => el.addEventListener("change", () => { state.single.cropDirection = els.cropDirection.value; state.single.cropRatio = els.cropRatio.value; syncCrop("w"); updateAll(); })); [els.batchWidth, els.batchHeight].forEach((el) => el.addEventListener("input", updateAll)); document.addEventListener("change", (e) => { if (e.target.name === "singleMode" || e.target.name === "singleResizeMethod" || e.target.name === "batchMode" || e.target.name === "batchResizeMethod") updateAll(); }); [els.singleQuickPresets, els.singleDetailPresets, els.singleCropPresets, els.batchPresets, els.singleMiniPresets].forEach((c) => c.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; const w = b.dataset.width, h = b.dataset.height; if (c === els.batchPresets) { els.batchWidth.value = w; els.batchHeight.value = h; } else if (c === els.singleCropPresets || (c === els.singleMiniPresets && state.single.mode === "crop")) { els.singleCropWidth.value = w; els.singleCropHeight.value = h; syncCrop("w"); } else { els.singleResizeWidth.value = w; els.singleResizeHeight.value = h; syncAspect("w"); } syncMiniFromMain(); updateAll(); })); els.singleSaveButton.addEventListener("click", () => saveSingle(false)); els.continueButton.addEventListener("click", () => saveSingle(true)); els.resetOriginalButton.addEventListener("click", () => { if (state.original) { if (state.working !== state.original) revokeImageData(state.working); state.working = state.original; els.singleSourceName.textContent = state.original.fileName; els.singleSourceSize.textContent = `${state.original.width} × ${state.original.height} px`; setMessage("元画像に戻しました。", true, true); updateAll(); } }); els.batchPrev.addEventListener("click", () => { if (state.batch.length) { state.batchIndex = (state.batchIndex + state.batch.length - 1) % state.batch.length; updateAll(); } }); els.batchNext.addEventListener("click", () => { if (state.batch.length) { state.batchIndex = (state.batchIndex + 1) % state.batch.length; updateAll(); } }); els.zipButton.addEventListener("click", () => saveBatch(true)); els.multiDownloadButton.addEventListener("click", () => saveBatch(false)); registerServiceWorker(); updateAll(); }
  init();
})();

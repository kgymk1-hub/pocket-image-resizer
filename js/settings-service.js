(() => {
  "use strict";

  const DEFAULTS = {
    commonSettings: { format: "png", quality: 0.85, backgroundColor: "transparent" },
    singleSettings: { mode: "resize", resizeMethod: "aspect", width: 512, height: 512, cropDirection: "both", cropRatio: "none", x: 0.5, y: 0.5 },
    batchSettings: { mode: "resize", resizeMethod: "stretch", width: 512, height: 512, x: 0.5, y: 0.5, saveMethod: "zip" }
  };
  const CROP_RATIO_IDS = ["none", "source", "ratio-1-1", "ratio-4-3", "ratio-3-4", "ratio-3-2", "ratio-2-3", "ratio-16-9", "ratio-9-16", "ratio-21-9", "ratio-5-4", "ratio-4-5"];

  function readKey(key) { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (_) { return {}; } }
  function pick(value, allowed, fallback) { return allowed.includes(value) ? value : fallback; }
  function size(value, fallback) { const n = Number(value); return Number.isInteger(n) && n >= 1 && n <= 4096 ? n : fallback; }
  function unit(value, fallback) { const n = Number(value); return Number.isFinite(n) && n >= 0 && n <= 1 ? n : fallback; }
  function normalizeCommon(raw) { const d = DEFAULTS.commonSettings; return { format: pick(raw.format, ["png", "jpeg", "webp"], d.format), quality: pick(Number(raw.quality), [0.6, 0.85, 0.95], d.quality), backgroundColor: pick(raw.backgroundColor, ["transparent", "white", "black"], d.backgroundColor) }; }
  function normalizeSingle(raw) { const d = DEFAULTS.singleSettings; return { mode: pick(raw.mode, ["resize", "crop"], d.mode), resizeMethod: pick(raw.resizeMethod, ["aspect", "stretch", "cover", "contain"], d.resizeMethod), width: size(raw.width, d.width), height: size(raw.height, d.height), cropDirection: pick(raw.cropDirection, ["both", "vertical", "horizontal"], d.cropDirection), cropRatio: pick(raw.cropRatio, CROP_RATIO_IDS, d.cropRatio), x: unit(raw.x, d.x), y: unit(raw.y, d.y) }; }
  function normalizeBatch(raw) { const d = DEFAULTS.batchSettings; return { mode: pick(raw.mode, ["resize", "crop"], d.mode), resizeMethod: pick(raw.resizeMethod, ["stretch", "cover", "contain"], d.resizeMethod), width: size(raw.width, d.width), height: size(raw.height, d.height), x: unit(raw.x, d.x), y: unit(raw.y, d.y), saveMethod: d.saveMethod }; }
  function loadAll() { return { commonSettings: normalizeCommon({ ...DEFAULTS.commonSettings, ...readKey("commonSettings") }), singleSettings: normalizeSingle({ ...DEFAULTS.singleSettings, ...readKey("singleSettings") }), batchSettings: normalizeBatch({ ...DEFAULTS.batchSettings, ...readKey("batchSettings") }) }; }
  function saveKey(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) { console.warn("Settings could not be saved:", error); } }
  function saveAll(settings) { if (settings.commonSettings) saveKey("commonSettings", settings.commonSettings); if (settings.singleSettings) saveKey("singleSettings", settings.singleSettings); if (settings.batchSettings) saveKey("batchSettings", settings.batchSettings); }
  window.SettingsService = { loadAll, saveAll, DEFAULTS };
})();

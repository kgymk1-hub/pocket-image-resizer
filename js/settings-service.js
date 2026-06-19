(() => {
  "use strict";
  const DEFAULTS = {
    commonSettings: { format: "png", quality: 0.85, backgroundColor: "transparent" },
    singleSettings: { mode: "resize", resizeMethod: "aspect", width: 512, height: 512, cropDirection: "both", cropRatio: "none", x: 0.5, y: 0.5 },
    batchSettings: { mode: "resize", resizeMethod: "stretch", width: 512, height: 512, x: 0.5, y: 0.5, saveMethod: "zip" }
  };
  function readKey(key) { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (_) { return {}; } }
  function loadAll() { return { commonSettings: { ...DEFAULTS.commonSettings, ...readKey("commonSettings") }, singleSettings: { ...DEFAULTS.singleSettings, ...readKey("singleSettings") }, batchSettings: { ...DEFAULTS.batchSettings, ...readKey("batchSettings") } }; }
  function saveKey(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) { console.warn("Settings could not be saved:", error); } }
  function saveAll(settings) { if (settings.commonSettings) saveKey("commonSettings", settings.commonSettings); if (settings.singleSettings) saveKey("singleSettings", settings.singleSettings); if (settings.batchSettings) saveKey("batchSettings", settings.batchSettings); }
  window.SettingsService = { loadAll, saveAll, DEFAULTS };
})();

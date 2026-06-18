(() => {
  "use strict";

  const STORAGE_KEY = "pocket-image-resizer-settings";
  const DEFAULTS = {
    width: 512,
    height: 512,
    mode: "cover",
    backgroundColor: "transparent",
    format: "png",
    quality: 0.85,
    lockAspect: true,
    ratioFilter: false,
    useCropRatio: false,
    cropRatioPresetId: "source",
    outputPresetId: "fav-pwa-512"
  };

  function isValidSize(value) {
    return Number.isInteger(value) && value >= 1 && value <= window.ResizeService.MAX_OUTPUT_SIZE;
  }

  function pick(value, allowed, fallback) {
    return allowed.includes(value) ? value : fallback;
  }

  function readRaw() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (_) {
      return {};
    }
  }

  function validCropRatioId(id) {
    return window.PresetService.CROP_RATIO_PRESETS.some((preset) => preset.id === id);
  }

  function validOutputPresetId(id) {
    return window.PresetService.OUTPUT_PRESETS.some((preset) => preset.id === id);
  }

  function normalize(raw) {
    const quality = Number(raw.quality);
    return {
      width: isValidSize(Number(raw.width)) ? Number(raw.width) : DEFAULTS.width,
      height: isValidSize(Number(raw.height)) ? Number(raw.height) : DEFAULTS.height,
      mode: pick(raw.mode, ["cover", "contain"], DEFAULTS.mode),
      backgroundColor: pick(raw.backgroundColor, ["transparent", "white", "black"], DEFAULTS.backgroundColor),
      format: pick(raw.format, ["png", "jpeg", "webp"], DEFAULTS.format),
      quality: pick(quality, [0.6, 0.85, 0.95], DEFAULTS.quality),
      lockAspect: typeof raw.lockAspect === "boolean" ? raw.lockAspect : DEFAULTS.lockAspect,
      ratioFilter: typeof raw.ratioFilter === "boolean" ? raw.ratioFilter : DEFAULTS.ratioFilter,
      useCropRatio: typeof raw.useCropRatio === "boolean" ? raw.useCropRatio : DEFAULTS.useCropRatio,
      cropRatioPresetId: validCropRatioId(raw.cropRatioPresetId) ? raw.cropRatioPresetId : DEFAULTS.cropRatioPresetId,
      outputPresetId: raw.outputPresetId === null ? null : (validOutputPresetId(raw.outputPresetId) ? raw.outputPresetId : DEFAULTS.outputPresetId)
    };
  }

  function load() {
    return normalize(readRaw());
  }

  function save(settings) {
    const current = normalize(readRaw());
    const next = { ...settings };
    next.width = isValidSize(Number(settings.width)) ? Number(settings.width) : current.width;
    next.height = isValidSize(Number(settings.height)) ? Number(settings.height) : current.height;
    const safe = normalize(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    } catch (error) {
      console.warn("Settings could not be saved:", error);
    }
  }

  window.SettingsService = { load, save, isValidSize };
})();

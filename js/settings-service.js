(() => {
  "use strict";

  const STORAGE_KEY = "pocket-image-resizer-settings";

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (_) {
      return {};
    }
  }

  function save(settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn("Settings could not be saved:", error);
    }
  }

  window.SettingsService = { load, save };
})();

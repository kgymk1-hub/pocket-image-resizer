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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }

  window.SettingsService = { load, save };
})();

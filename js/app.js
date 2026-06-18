(() => {
  "use strict";

  const ICON_SIZES = [192, 512, 1024];
  const imageInput = document.getElementById("imageInput");
  const previewArea = document.getElementById("previewArea");
  const previewImage = document.getElementById("previewImage");
  const sourceName = document.getElementById("sourceName");
  const sourceFileSize = document.getElementById("sourceFileSize");
  const sourceSize = document.getElementById("sourceSize");
  const outputSize = document.getElementById("outputSize");
  const widthInput = document.getElementById("widthInput");
  const heightInput = document.getElementById("heightInput");
  const lockAspectInput = document.getElementById("lockAspectInput");
  const resizeButton = document.getElementById("resizeButton");
  const iconSetButton = document.getElementById("iconSetButton");
  const message = document.getElementById("message");
  const backgroundOptions = document.getElementById("backgroundOptions");
  const formatSelect = document.getElementById("formatSelect");
  const qualityOptions = document.getElementById("qualityOptions");

  let currentImageData = null;
  let currentObjectUrl = null;
  let aspectRatio = 1;
  let syncingSize = false;

  function setMessage(text, isOk = false) {
    message.textContent = text || "";
    message.classList.toggle("ok", isOk);
  }

  function readSize() {
    return { width: widthInput.value === "" ? "" : Number(widthInput.value), height: heightInput.value === "" ? "" : Number(heightInput.value) };
  }

  function updateOutputSize() {
    const { width, height } = readSize();
    outputSize.textContent = Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0 ? `${width} × ${height} px` : "----";
  }

  function selectedRadio(name, fallback) {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    return selected ? selected.value : fallback;
  }

  function getSettings() {
    const { width, height } = readSize();
    return {
      width,
      height,
      mode: selectedRadio("resizeMode", "cover"),
      backgroundColor: selectedRadio("backgroundColor", "transparent"),
      format: formatSelect.value,
      quality: Number(selectedRadio("quality", "0.85")),
      lockAspect: lockAspectInput.checked
    };
  }

  function saveSettings() {
    window.SettingsService.save(getSettings());
  }

  function applySettings() {
    const settings = window.SettingsService.load();
    if (Number.isInteger(settings.width)) widthInput.value = settings.width;
    if (Number.isInteger(settings.height)) heightInput.value = settings.height;
    if (typeof settings.lockAspect === "boolean") lockAspectInput.checked = settings.lockAspect;
    if (settings.format) formatSelect.value = settings.format;
    setChecked("resizeMode", settings.mode);
    setChecked("backgroundColor", settings.backgroundColor);
    setChecked("quality", String(settings.quality));
  }

  function setChecked(name, value) {
    const input = value ? document.querySelector(`input[name="${name}"][value="${value}"]`) : null;
    if (input) input.checked = true;
  }

  function updateConditionalOptions() {
    backgroundOptions.classList.toggle("hidden", selectedRadio("resizeMode", "cover") !== "contain");
    qualityOptions.classList.toggle("hidden", formatSelect.value === "png");
  }

  function syncAspect(changed) {
    if (syncingSize || !lockAspectInput.checked || !currentImageData) return;
    const value = Number(changed === "width" ? widthInput.value : heightInput.value);
    if (!Number.isInteger(value) || value < 1) return;
    syncingSize = true;
    if (changed === "width") heightInput.value = Math.max(1, Math.min(4096, Math.round(value / aspectRatio)));
    else widthInput.value = Math.max(1, Math.min(4096, Math.round(value * aspectRatio)));
    syncingSize = false;
  }

  function validateCurrentSize() {
    const { width, height } = readSize();
    window.ResizeService.validateSize(width, height);
    return { width, height };
  }

  async function handleImageSelection(event) {
    const file = event.target.files && event.target.files[0];
    setMessage("");
    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;

    try {
      currentImageData = await window.ImageLoader.loadFromFile(file);
      currentObjectUrl = currentImageData.objectUrl;
      aspectRatio = currentImageData.width / currentImageData.height;
      previewImage.src = currentObjectUrl;
      previewArea.classList.remove("hidden");
      sourceName.textContent = currentImageData.fileName;
      sourceFileSize.textContent = window.FileService.formatFileSize(currentImageData.fileSize);
      sourceSize.textContent = `${currentImageData.width} × ${currentImageData.height} px`;
      if (lockAspectInput.checked) syncAspect("width");
      updateOutputSize();
      setMessage("画像を読み込みました。", true);
    } catch (error) {
      currentImageData = null;
      previewImage.removeAttribute("src");
      previewArea.classList.add("hidden");
      sourceName.textContent = "----";
      sourceFileSize.textContent = "----";
      sourceSize.textContent = "----";
      setMessage(error.message);
    }
  }

  function handlePresetClick(event) {
    const button = event.target.closest(".preset-button");
    if (!button) return;
    widthInput.value = button.dataset.width;
    heightInput.value = button.dataset.height;
    updateOutputSize();
    saveSettings();
    setMessage("");
  }

  async function saveOne(width, height) {
    const settings = getSettings();
    const blob = await window.ResizeService.resize({ ...settings, image: currentImageData.image, width, height });
    const fileName = window.FileService.makeResizedFileName(currentImageData.fileName, width, height, settings.format);
    window.FileService.downloadBlob(blob, fileName);
    return fileName;
  }

  async function handleResize() {
    setMessage("");
    if (!currentImageData) return setMessage("画像が選択されていません。");
    try {
      const { width, height } = validateCurrentSize();
      resizeButton.disabled = true;
      const fileName = await saveOne(width, height);
      saveSettings();
      setMessage(`${fileName} を保存しました。`, true);
    } catch (error) {
      setMessage(error.message || "保存失敗。もう一度試してください。");
    } finally {
      resizeButton.disabled = false;
    }
  }

  async function handleIconSetSave() {
    setMessage("");
    if (!currentImageData) return setMessage("画像が選択されていません。");
    try {
      iconSetButton.disabled = true;
      for (const size of ICON_SIZES) {
        await saveOne(size, size);
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      saveSettings();
      setMessage("アイコンセットを保存しました。", true);
    } catch (error) {
      setMessage(error.message || "保存失敗。もう一度試してください。");
    } finally {
      iconSetButton.disabled = false;
    }
  }

  function bindEvents() {
    imageInput.addEventListener("change", handleImageSelection);
    document.querySelector(".preset-row").addEventListener("click", handlePresetClick);
    widthInput.addEventListener("input", () => { syncAspect("width"); updateOutputSize(); saveSettings(); });
    heightInput.addEventListener("input", () => { syncAspect("height"); updateOutputSize(); saveSettings(); });
    lockAspectInput.addEventListener("change", saveSettings);
    document.querySelectorAll('input[name="resizeMode"], input[name="backgroundColor"], input[name="quality"]').forEach((input) => {
      input.addEventListener("change", () => { updateConditionalOptions(); saveSettings(); setMessage(""); });
    });
    formatSelect.addEventListener("change", () => { updateConditionalOptions(); saveSettings(); });
    resizeButton.addEventListener("click", handleResize);
    iconSetButton.addEventListener("click", handleIconSetSave);
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }

  applySettings();
  bindEvents();
  updateOutputSize();
  updateConditionalOptions();
  registerServiceWorker();
})();

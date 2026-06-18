(() => {
  "use strict";

  const ICON_SIZES = [192, 512, 1024];
  const MULTI_DOWNLOAD_INTERVAL_MS = 500;
  const imageInput = document.getElementById("imageInput");
  const previewArea = document.getElementById("previewArea");
  const previewImage = document.getElementById("previewImage");
  const sourceName = document.getElementById("sourceName");
  const sourceFileSize = document.getElementById("sourceFileSize");
  const sourceSize = document.getElementById("sourceSize");
  const outputSize = document.getElementById("outputSize");
  const outputFormat = document.getElementById("outputFormat");
  const outputMode = document.getElementById("outputMode");
  const widthInput = document.getElementById("widthInput");
  const heightInput = document.getElementById("heightInput");
  const lockAspectInput = document.getElementById("lockAspectInput");
  const ratioFilterInput = document.getElementById("ratioFilterInput");
  const quickPresetGroups = document.getElementById("quickPresetGroups");
  const presetGroups = document.getElementById("presetGroups");
  const resizeButton = document.getElementById("resizeButton");
  const iconSetButton = document.getElementById("iconSetButton");
  const message = document.getElementById("message");
  const backgroundOptions = document.getElementById("backgroundOptions");
  const formatSelect = document.getElementById("formatSelect");
  const qualityOptions = document.getElementById("qualityOptions");
  const cropRatioSection = document.getElementById("cropRatioSection");
  const cropRatioDisabledHelp = document.getElementById("cropRatioDisabledHelp");
  const useCropRatioInput = document.getElementById("useCropRatioInput");
  const cropRatioControls = document.getElementById("cropRatioControls");
  const cropRatioSelect = document.getElementById("cropRatioSelect");
  const jpegWarning = document.getElementById("jpegWarning");
  const cropRatioWarning = document.getElementById("cropRatioWarning");
  const currentSettings = document.getElementById("currentSettings");

  let currentImageData = null;
  let currentObjectUrl = null;
  let aspectRatio = 1;
  let syncingSize = false;
  let selectedPresetId = null;

  function setMessage(text, isOk = false) {
    message.textContent = text || "";
    message.classList.toggle("ok", isOk);
  }

  function readSize() {
    return {
      width: widthInput.value === "" ? "" : Number(widthInput.value),
      height: heightInput.value === "" ? "" : Number(heightInput.value)
    };
  }

  function clampOutputSize(value) {
    return Math.max(1, Math.min(window.ResizeService.MAX_OUTPUT_SIZE, value));
  }

  function updateOutputSize() {
    const { width, height } = readSize();
    const valid = Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0;
    outputSize.textContent = valid ? `${width} × ${height} px` : "----";
    const formatLabel = formatSelect.value.toUpperCase();
    const modeLabel = selectedRadio("resizeMode", "cover") === "cover" ? "中央トリミング" : "余白あり";
    outputFormat.textContent = formatLabel;
    outputMode.textContent = modeLabel;
    currentSettings.textContent = `現在の設定：${formatLabel} / ${modeLabel}`;
    updateActivePreset();
  }

  function selectedRadio(name, fallback) {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    return selected ? selected.value : fallback;
  }

  function selectedCropRatio() {
    if (selectedRadio("resizeMode", "cover") !== "cover" || !useCropRatioInput.checked) return null;
    const preset = window.PresetService.getCropRatioPresetById(cropRatioSelect.value);
    if (preset.id === "source") return currentImageData ? currentImageData.width / currentImageData.height : null;
    return preset.ratio;
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
      lockAspect: lockAspectInput.checked,
      ratioFilter: ratioFilterInput.checked,
      useCropRatio: useCropRatioInput.checked,
      cropRatioPresetId: cropRatioSelect.value,
      outputPresetId: selectedPresetId
    };
  }

  function saveSettings() {
    window.SettingsService.save(getSettings());
  }

  function setChecked(name, value) {
    const input = value ? document.querySelector(`input[name="${name}"][value="${value}"]`) : null;
    if (input) input.checked = true;
  }

  function applySettings() {
    const settings = window.SettingsService.load();
    if (Number.isInteger(settings.width)) widthInput.value = settings.width;
    if (Number.isInteger(settings.height)) heightInput.value = settings.height;
    if (typeof settings.lockAspect === "boolean") lockAspectInput.checked = settings.lockAspect;
    if (typeof settings.ratioFilter === "boolean") ratioFilterInput.checked = settings.ratioFilter;
    if (typeof settings.useCropRatio === "boolean") useCropRatioInput.checked = settings.useCropRatio;
    if (settings.format) formatSelect.value = settings.format;
    if (settings.outputPresetId) selectedPresetId = settings.outputPresetId;
    setChecked("resizeMode", settings.mode);
    setChecked("backgroundColor", settings.backgroundColor);
    setChecked("quality", String(settings.quality));
    if (settings.cropRatioPresetId) cropRatioSelect.value = settings.cropRatioPresetId;
  }

  function renderCropRatioOptions() {
    cropRatioSelect.textContent = "";
    window.PresetService.CROP_RATIO_PRESETS.forEach((preset) => {
      const option = document.createElement("option");
      option.value = preset.id;
      option.textContent = `${preset.label} - ${preset.description}`;
      cropRatioSelect.appendChild(option);
    });
  }

  function renderPresets() {
    const source = currentImageData;
    const allPresets = window.PresetService.OUTPUT_PRESETS;
    const quickPresets = allPresets.filter((preset) => preset.category === "favorite");
    const allDetailPresets = allPresets.filter((preset) => preset.category !== "favorite");
    const detailPresets = ratioFilterInput.checked && source
      ? window.PresetService.filterPresetsBySourceRatio(allDetailPresets, source.width, source.height)
      : allDetailPresets;
    const hasNoMatchingPresets = Boolean(ratioFilterInput.checked && source && detailPresets.length === 0);

    quickPresetGroups.textContent = "";
    quickPresets.forEach((preset) => quickPresetGroups.appendChild(createPresetButton(preset)));

    presetGroups.textContent = "";
    window.PresetService.getPresetsByCategory(detailPresets).forEach((group) => {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = group.label;
      const row = document.createElement("div");
      row.className = "preset-row";
      group.presets.forEach((preset) => row.appendChild(createPresetButton(preset)));
      details.append(summary, row);
      presetGroups.appendChild(details);
    });

    if (hasNoMatchingPresets) {
      const empty = document.createElement("p");
      empty.className = "empty-presets";
      empty.textContent = "元画像に近い比率のプリセットがありません。すべて表示に戻すか、カスタムサイズを指定してください。";
      presetGroups.appendChild(empty);
    }
    updateActivePreset();
    return hasNoMatchingPresets;
  }

  function createPresetButton(preset) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preset-button";
    button.dataset.presetId = preset.id;
    button.dataset.width = preset.width;
    button.dataset.height = preset.height;
    const label = document.createElement("span");
    label.textContent = preset.label;
    const usage = document.createElement("small");
    usage.textContent = preset.usage;
    button.append(label, usage);
    return button;
  }

  function updateActivePreset() {
    document.querySelectorAll(".preset-button").forEach((button) => {
      const preset = window.PresetService.OUTPUT_PRESETS.find((item) => item.id === button.dataset.presetId);
      const { width, height } = readSize();
      const isActive = preset && button.dataset.presetId === selectedPresetId && width === preset.width && height === preset.height;
      button.classList.toggle("active", isActive);
    });
  }

  function updateConditionalOptions() {
    const isContain = selectedRadio("resizeMode", "cover") === "contain";
    const isJpeg = formatSelect.value === "jpeg";
    backgroundOptions.classList.toggle("hidden", !isContain && !isJpeg);
    qualityOptions.classList.toggle("hidden", formatSelect.value === "png");
    jpegWarning.classList.toggle("hidden", !isJpeg);
    cropRatioSection.classList.toggle("hidden", isContain);
    cropRatioDisabledHelp.classList.toggle("hidden", !isContain);
    cropRatioControls.classList.toggle("hidden", !useCropRatioInput.checked || isContain);
    cropRatioWarning.classList.toggle("hidden", !useCropRatioInput.checked || isContain);
    useCropRatioInput.disabled = isContain;
    cropRatioSelect.disabled = isContain || !useCropRatioInput.checked || !currentImageData;
    updateOutputSize();
  }

  function syncAspect(changed) {
    if (syncingSize || !lockAspectInput.checked || !currentImageData) return;
    const value = Number(changed === "width" ? widthInput.value : heightInput.value);
    if (!Number.isInteger(value) || value < 1) return;
    syncingSize = true;
    if (changed === "width") {
      heightInput.value = clampOutputSize(Math.round(value / aspectRatio));
    } else {
      widthInput.value = clampOutputSize(Math.round(value * aspectRatio));
    }
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
      updateOutputSize();
      updateConditionalOptions();
      const hasNoMatchingPresets = renderPresets();
      if (hasNoMatchingPresets) {
        setMessage("元画像に近い比率のプリセットがありません。すべて表示に戻すか、カスタムサイズを指定してください。");
      } else {
        setMessage("画像を読み込みました。", true);
      }
    } catch (error) {
      currentImageData = null;
      previewImage.removeAttribute("src");
      previewArea.classList.add("hidden");
      sourceName.textContent = "----";
      sourceFileSize.textContent = "----";
      sourceSize.textContent = "----";
      updateConditionalOptions();
      renderPresets();
      setMessage(error.message || "画像の読み込みに失敗しました。");
    }
  }

  function handlePresetClick(event) {
    const button = event.target.closest(".preset-button");
    if (!button) return;
    selectedPresetId = button.dataset.presetId;
    widthInput.value = button.dataset.width;
    heightInput.value = button.dataset.height;
    updateOutputSize();
    saveSettings();
    setMessage("");
  }

  function handleSizeInput(changed) {
    selectedPresetId = null;
    syncAspect(changed);
    updateOutputSize();
    saveSettings();
  }

  async function saveOne(width, height) {
    const settings = getSettings();
    const blob = await window.ResizeService.resize({ ...settings, image: currentImageData.image, width, height, cropRatio: selectedCropRatio() });
    const fileName = window.FileService.makeResizedFileName(currentImageData.fileName, width, height, settings.format);
    window.FileService.downloadBlob(blob, fileName);
    return fileName;
  }

  async function withSavingButton(button, action) {
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "保存中...";
    try {
      return await action();
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  async function handleResize() {
    setMessage("");
    if (!currentImageData) {
      setMessage("画像が選択されていません。");
      return;
    }
    try {
      const { width, height } = validateCurrentSize();
      const fileName = await withSavingButton(resizeButton, () => saveOne(width, height));
      saveSettings();
      setMessage(`${fileName} を保存しました。`, true);
    } catch (error) {
      setMessage(error.message || "保存に失敗しました。もう一度お試しください。");
    }
  }

  async function handleIconSetSave() {
    setMessage("");
    if (!currentImageData) {
      setMessage("画像が選択されていません。");
      return;
    }
    try {
      await withSavingButton(iconSetButton, async () => {
        for (let index = 0; index < ICON_SIZES.length; index += 1) {
          const size = ICON_SIZES[index];
          await saveOne(size, size);
          if (index < ICON_SIZES.length - 1) await new Promise((resolve) => setTimeout(resolve, MULTI_DOWNLOAD_INTERVAL_MS));
        }
      });
      saveSettings();
      setMessage("アイコンセットを保存しました。", true);
    } catch (error) {
      setMessage(error.message || "保存に失敗しました。もう一度お試しください。");
    }
  }

  function bindEvents() {
    imageInput.addEventListener("change", handleImageSelection);
    quickPresetGroups.addEventListener("click", handlePresetClick);
    presetGroups.addEventListener("click", handlePresetClick);
    widthInput.addEventListener("input", () => handleSizeInput("width"));
    heightInput.addEventListener("input", () => handleSizeInput("height"));
    lockAspectInput.addEventListener("change", saveSettings);
    ratioFilterInput.addEventListener("change", () => {
      const hasNoMatchingPresets = renderPresets();
      saveSettings();
      setMessage(hasNoMatchingPresets ? "元画像に近い比率のプリセットがありません。すべて表示に戻すか、カスタムサイズを指定してください。" : "");
    });
    useCropRatioInput.addEventListener("change", () => { updateConditionalOptions(); saveSettings(); });
    cropRatioSelect.addEventListener("change", saveSettings);
    document.querySelectorAll('input[name="resizeMode"], input[name="backgroundColor"], input[name="quality"]').forEach((input) => {
      input.addEventListener("change", () => { updateConditionalOptions(); saveSettings(); setMessage(""); });
    });
    formatSelect.addEventListener("change", () => { updateConditionalOptions(); saveSettings(); setMessage(""); });
    resizeButton.addEventListener("click", handleResize);
    iconSetButton.addEventListener("click", handleIconSetSave);
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
  }

  renderCropRatioOptions();
  applySettings();
  renderPresets();
  bindEvents();
  updateOutputSize();
  updateConditionalOptions();
  registerServiceWorker();
})();

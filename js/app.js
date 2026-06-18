(() => {
  "use strict";

  const imageInput = document.getElementById("imageInput");
  const previewArea = document.getElementById("previewArea");
  const previewImage = document.getElementById("previewImage");
  const sourceSize = document.getElementById("sourceSize");
  const outputSize = document.getElementById("outputSize");
  const widthInput = document.getElementById("widthInput");
  const heightInput = document.getElementById("heightInput");
  const resizeButton = document.getElementById("resizeButton");
  const message = document.getElementById("message");
  const backgroundOptions = document.getElementById("backgroundOptions");

  let currentImageData = null;
  let currentObjectUrl = null;

  function setMessage(text, isOk = false) {
    message.textContent = text || "";
    message.classList.toggle("ok", isOk);
  }

  function getOutputWidth() {
    return Number.parseInt(widthInput.value, 10);
  }

  function getOutputHeight() {
    return Number.parseInt(heightInput.value, 10);
  }

  function updateOutputSize() {
    const width = getOutputWidth();
    const height = getOutputHeight();

    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      outputSize.textContent = `${width} × ${height} px`;
    } else {
      outputSize.textContent = "----";
    }
  }

  function getSelectedMode() {
    const selected = document.querySelector('input[name="resizeMode"]:checked');
    return selected ? selected.value : "cover";
  }

  function getSelectedBackgroundColor() {
    const selected = document.querySelector('input[name="backgroundColor"]:checked');
    return selected ? selected.value : "transparent";
  }

  function updateBackgroundVisibility() {
    backgroundOptions.classList.toggle("hidden", getSelectedMode() !== "contain");
  }

  async function handleImageSelection(event) {
    const file = event.target.files && event.target.files[0];

    setMessage("");

    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }

    try {
      currentImageData = await window.ImageLoader.loadFromFile(file);
      currentObjectUrl = currentImageData.objectUrl;

      previewImage.src = currentObjectUrl;
      previewArea.classList.remove("hidden");

      sourceSize.textContent = `${currentImageData.width} × ${currentImageData.height} px`;
      updateOutputSize();

      setMessage("画像を読み込みました。", true);
    } catch (error) {
      currentImageData = null;
      previewImage.removeAttribute("src");
      previewArea.classList.add("hidden");
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
    setMessage("");
  }

  async function handleResize() {
    setMessage("");

    if (!currentImageData) {
      setMessage("画像を選択してください。");
      return;
    }

    const width = getOutputWidth();
    const height = getOutputHeight();

    try {
      resizeButton.disabled = true;
      resizeButton.textContent = "作成中...";

      const blob = await window.ResizeService.resizeToPng({
        image: currentImageData.image,
        width,
        height,
        mode: getSelectedMode(),
        backgroundColor: getSelectedBackgroundColor()
      });

      const fileName = window.FileService.makeResizedFileName(
        currentImageData.fileName,
        width,
        height
      );

      window.FileService.downloadBlob(blob, fileName);
      setMessage(`${fileName} を保存しました。`, true);
    } catch (error) {
      setMessage(error.message || "保存に失敗しました。");
    } finally {
      resizeButton.disabled = false;
      resizeButton.textContent = "PNGで保存";
    }
  }

  function bindEvents() {
    imageInput.addEventListener("change", handleImageSelection);
    document.querySelector(".preset-row").addEventListener("click", handlePresetClick);
    widthInput.addEventListener("input", updateOutputSize);
    heightInput.addEventListener("input", updateOutputSize);

    document.querySelectorAll('input[name="resizeMode"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        updateBackgroundVisibility();
        setMessage("");
      });
    });

    resizeButton.addEventListener("click", handleResize);
  }

  function init() {
    bindEvents();
    updateOutputSize();
    updateBackgroundVisibility();
  }

  init();
})();

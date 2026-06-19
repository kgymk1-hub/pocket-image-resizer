(() => {
  "use strict";

  const SUPPORTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
  const MAX_SOURCE_SIZE = 4624;

  window.ImageLoader = {
    loadFromBlob(blob, fileName) {
      const file = new File([blob], fileName || "image", { type: blob.type || "image/png" });
      return this.loadFromFile(file);
    },

    loadFromFile(file) {
      return new Promise((resolve, reject) => {
        if (!file) {
          reject(new Error("画像が選択されていません。"));
          return;
        }

        if (!SUPPORTED_TYPES.includes(file.type)) {
          reject(new Error("対応していない画像形式です。"));
          return;
        }

        // プレビューとcanvas描画で同じBlobを参照するため、不要になったら呼び出し側で解放します。
        const objectUrl = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
          if (image.naturalWidth > MAX_SOURCE_SIZE || image.naturalHeight > MAX_SOURCE_SIZE) {
            URL.revokeObjectURL(objectUrl);
            reject(new Error(`画像の長辺は${MAX_SOURCE_SIZE}px以下にしてください。大きいサイズの画像は、端末によって読み込みや保存に時間がかかる場合があります。`));
            return;
          }

          resolve({
            image,
            objectUrl,
            fileName: file.name || "image",
            fileSize: file.size,
            type: file.type,
            width: image.naturalWidth,
            height: image.naturalHeight
          });
        };

        image.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("画像の読み込みに失敗しました。"));
        };

        image.src = objectUrl;
      });
    }
  };
})();

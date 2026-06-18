(() => {
  "use strict";

  const SUPPORTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

  window.ImageLoader = {
    loadFromFile(file) {
      return new Promise((resolve, reject) => {
        if (!file) {
          reject(new Error("画像が選択されていません。"));
          return;
        }

        if (!SUPPORTED_TYPES.includes(file.type)) {
          reject(new Error("対応していない画像形式です。PNG、JPEG、WebPを選択してください。"));
          return;
        }

        // プレビューとcanvas描画で同じBlobを参照するため、不要になったら呼び出し側で解放します。
        const objectUrl = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
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
          reject(new Error("画像読み込み失敗。別の画像で試してください。"));
        };

        image.src = objectUrl;
      });
    }
  };
})();

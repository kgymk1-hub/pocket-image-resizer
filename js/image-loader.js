(() => {
  "use strict";

  window.ImageLoader = {
    loadFromFile(file) {
      return new Promise((resolve, reject) => {
        if (!file) {
          reject(new Error("画像ファイルが選択されていません。"));
          return;
        }

        if (!file.type.startsWith("image/")) {
          reject(new Error("画像ファイルを選択してください。"));
          return;
        }

        const objectUrl = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
          resolve({
            image,
            objectUrl,
            fileName: file.name || "image",
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

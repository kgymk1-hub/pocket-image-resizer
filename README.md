# Pocket Image Resizer Phase 1

超軽量・簡単画像リサイズアプリの第1フェーズ版です。

## 機能

- 画像選択
- 画像プレビュー
- 元画像サイズ表示
- 出力サイズ表示
- 192×192 / 512×512 / 1024×1024 プリセット
- 幅・高さの手入力
- 中央トリミング
- 余白ありリサイズ
- 余白色：透明 / 白 / 黒
- PNG保存

## 使い方

1. `index.html` をブラウザで開く
2. 「画像を選択」を押す
3. サイズを選ぶ、または幅・高さを入力する
4. リサイズ方法を選ぶ
5. 「PNGで保存」を押す

## ファイル構成

```text
/index.html
/css/style.css
/js/app.js
/js/image-loader.js
/js/resize-service.js
/js/file-service.js
/icons/icon.svg
```

## 次フェーズ候補

- JPEG保存
- JPEG品質設定
- PWA化
- manifest.json
- service-worker.js
- 192pxと512pxの同時生成

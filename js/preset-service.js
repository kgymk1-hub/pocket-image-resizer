(() => {
  "use strict";

  const RATIO_MATCH_TOLERANCE = 0.03;

  const CATEGORY_LABELS = {
    favorite: "よく使う",
    icon: "アイコン",
    sns: "SNS",
    video: "動画",
    web: "ブログ・Web",
    wallpaper: "スマホ壁紙",
    photo: "スマホ写真",
    custom: "カスタムに近い比率"
  };

  const OUTPUT_PRESETS = [
    p("fav-pwa-192", 192, 192, "favorite", "PWAアイコン小", "1:1"),
    p("fav-pwa-512", 512, 512, "favorite", "PWAアイコン標準", "1:1"),
    p("fav-icon-1024", 1024, 1024, "favorite", "高解像度アイコン", "1:1"),
    p("fav-hd-1280", 1280, 720, "favorite", "HD / 16:9", "16:9"),
    p("fav-fhd-1920", 1920, 1080, "favorite", "Full HD / 16:9", "16:9"),

    p("icon-16", 16, 16, "icon", "favicon", "1:1"),
    p("icon-32", 32, 32, "icon", "favicon", "1:1"),
    p("icon-48", 48, 48, "icon", "Windows / favicon", "1:1"),
    p("icon-64", 64, 64, "icon", "小アイコン", "1:1"),
    p("icon-72", 72, 72, "icon", "Android旧dpi", "1:1"),
    p("icon-96", 96, 96, "icon", "Android旧dpi", "1:1"),
    p("icon-128", 128, 128, "icon", "Chrome拡張など", "1:1"),
    p("icon-144", 144, 144, "icon", "PWA", "1:1"),
    p("icon-152", 152, 152, "icon", "iOS系", "1:1"),
    p("icon-180", 180, 180, "icon", "Apple touch icon", "1:1"),
    p("icon-192", 192, 192, "icon", "PWA必須級", "1:1"),
    p("icon-256", 256, 256, "icon", "汎用アイコン", "1:1"),
    p("icon-384", 384, 384, "icon", "PWA", "1:1"),
    p("icon-512", 512, 512, "icon", "PWA必須級", "1:1"),
    p("icon-1024", 1024, 1024, "icon", "ストア・高解像度", "1:1"),

    p("sns-profile-400", 400, 400, "sns", "プロフィール画像", "1:1"),
    p("sns-square-800", 800, 800, "sns", "正方形投稿", "1:1"),
    p("sns-instagram-square", 1080, 1080, "sns", "Instagram正方形", "1:1"),
    p("sns-instagram-portrait", 1080, 1350, "sns", "Instagram縦長", "4:5"),
    p("sns-stories", 1080, 1920, "sns", "ストーリーズ / 縦長", "9:16"),
    p("sns-ogp", 1200, 630, "sns", "OGP / Xカード", "1.91:1"),
    p("sns-x-header", 1500, 500, "sns", "Xヘッダー", "3:1"),
    p("sns-facebook-cover", 820, 312, "sns", "Facebookカバー目安", "2.63:1"),
    p("sns-wide-1200", 1200, 675, "sns", "SNS横長 16:9", "16:9"),

    p("video-360p", 640, 360, "video", "360p", "16:9"),
    p("video-480p", 854, 480, "video", "480p", "16:9"),
    p("video-720p", 1280, 720, "video", "720p", "16:9"),
    p("video-1080p", 1920, 1080, "video", "1080p", "16:9"),
    p("video-1440p", 2560, 1440, "video", "1440p", "16:9"),
    p("video-4k", 3840, 2160, "video", "4K", "16:9"),

    p("web-thumb-small", 320, 180, "web", "小サムネイル 16:9", "16:9"),
    p("web-thumb", 640, 360, "web", "サムネイル 16:9", "16:9"),
    p("web-image", 800, 450, "web", "Web画像 16:9", "16:9"),
    p("web-main", 1200, 675, "web", "Webメイン画像 16:9", "16:9"),
    p("web-3-2", 1200, 800, "web", "3:2", "3:2"),
    p("web-large", 1600, 900, "web", "Web大画像 16:9", "16:9"),

    p("wallpaper-hd", 720, 1280, "wallpaper", "HD縦", "9:16"),
    p("wallpaper-fhd", 1080, 1920, "wallpaper", "Full HD縦", "9:16"),
    p("wallpaper-iphone", 1170, 2532, "wallpaper", "iPhone系目安", "19.5:9"),
    p("wallpaper-qhd", 1440, 2560, "wallpaper", "QHD縦", "9:16"),
    p("wallpaper-tall", 1440, 3200, "wallpaper", "縦長スマホ目安", "20:9"),

    p("photo-phone-portrait-4624", 3468, 4624, "photo", "スマホ写真 縦", "3:4"),
    p("photo-phone-landscape-4624", 4624, 3468, "photo", "スマホ写真 横", "4:3"),

    p("custom-4-3", 1024, 768, "custom", "4:3資料向け", "4:3"),
    p("custom-3-4", 768, 1024, "custom", "3:4縦向け", "3:4"),
    p("custom-3-2", 1500, 1000, "custom", "写真横 3:2", "3:2"),
    p("custom-2-3", 1000, 1500, "custom", "写真縦 2:3", "2:3")
  ];

  const CROP_RATIO_PRESETS = [
    { id: "source", label: "元画像", description: "元画像の比率", ratio: null },
    { id: "ratio-1-1", label: "1:1", description: "正方形 / アイコン向け", ratio: 1 },
    { id: "ratio-4-3", label: "4:3", description: "標準", ratio: 4 / 3 },
    { id: "ratio-3-4", label: "3:4", description: "縦標準", ratio: 3 / 4 },
    { id: "ratio-3-2", label: "3:2", description: "写真横", ratio: 3 / 2 },
    { id: "ratio-2-3", label: "2:3", description: "写真縦", ratio: 2 / 3 },
    { id: "ratio-16-9", label: "16:9", description: "横長", ratio: 16 / 9 },
    { id: "ratio-9-16", label: "9:16", description: "縦長", ratio: 9 / 16 },
    { id: "ratio-21-9", label: "21:9", description: "シネマ横", ratio: 21 / 9 },
    { id: "ratio-5-4", label: "5:4", description: "やや横長", ratio: 5 / 4 },
    { id: "ratio-4-5", label: "4:5", description: "SNS縦長", ratio: 4 / 5 }
  ];

  function p(id, width, height, category, usage, ratio) {
    return { id, width, height, label: `${width}×${height}`, category, usage, ratio };
  }

  function getPresetsByCategory(presets = OUTPUT_PRESETS) {
    return Object.keys(CATEGORY_LABELS).map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      presets: presets.filter((preset) => preset.category === category)
    })).filter((group) => group.presets.length > 0);
  }

  function filterPresetsBySourceRatio(presets, sourceWidth, sourceHeight) {
    if (!sourceWidth || !sourceHeight) return presets;
    const sourceRatio = sourceWidth / sourceHeight;
    return presets.filter((preset) => Math.abs(sourceRatio - preset.width / preset.height) / sourceRatio <= RATIO_MATCH_TOLERANCE);
  }

  function getCropRatioPresetById(id) {
    return CROP_RATIO_PRESETS.find((preset) => preset.id === id) || CROP_RATIO_PRESETS[0];
  }

  window.PresetService = { OUTPUT_PRESETS, CROP_RATIO_PRESETS, CATEGORY_LABELS, RATIO_MATCH_TOLERANCE, getPresetsByCategory, filterPresetsBySourceRatio, getCropRatioPresetById };
})();

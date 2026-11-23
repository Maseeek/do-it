const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const BASE_DIR = path.resolve(__dirname, '..');
const SHARED_DIR = path.join(BASE_DIR, 'shared-mobile-assets');
const IOS_ASSETS_DIR = path.join(BASE_DIR, 'ios/DoIt/Sources/DoIt/Resources/Assets.xcassets/AppIcon.appiconset');
const ANDROID_RES_DIR = path.join(BASE_DIR, 'android/DoIt/app/src/main/res');

// Category definitions with paths & accents
const CATEGORIES = {
  foundation: {
    accent: '#818cf8',
    bg: 'rgba(129, 140, 248, 0.12)',
    // Crescent Moon + Ambient Sleep Star
    svg: `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          <path d="M18 3v4m-2-2h4" stroke-width="1.6" />
          <circle cx="14" cy="7" r="0.75" fill="#818cf8" stroke="none" />`,
    xml: `    <path
        android:strokeColor="#818cf8"
        android:strokeWidth="2"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M21,12.79A9,9 0,1 1,11.21 3,7 7,0 0,0 21,12.79z" />
    <path
        android:strokeColor="#818cf8"
        android:strokeWidth="1.6"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M18,3v4M16,5h4" />`
  },
  physical: {
    accent: '#f97316',
    bg: 'rgba(249, 115, 22, 0.12)',
    // Hexagonal Barbell / Strength Dumbbell
    svg: `<path d="M6 5v14M18 5v14M2 8v8M22 8v8" />
          <rect x="6" y="7" width="12" height="10" rx="2" fill="none" />
          <path d="M2 12h20" stroke-width="2.5" />`,
    xml: `    <path
        android:strokeColor="#f97316"
        android:strokeWidth="2"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M6,5v14M18,5v14M2,8v8M22,8v8" />
    <path
        android:strokeColor="#f97316"
        android:strokeWidth="2"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M8,7h8a2,2 0,0 1,2 2v6a2,2 0,0 1,-2 2h-8a2,2 0,0 1,-2 -2v-6a2,2 0,0 1,2 -2z" />
    <path
        android:strokeColor="#f97316"
        android:strokeWidth="2.5"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M2,12h20" />`
  },
  cardio: {
    accent: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    // Dynamic Heart with ECG pulse beat
    svg: `<path d="M19.5 12.572l-7.5 7.428l-7.5-7.428a5 5 0 1 1 7.5-6.566a5 5 0 1 1 7.5 6.572" opacity="0.35" />
          <path d="M3 13h4.5l2-5 3.5 10 2.5-6.5 2 3.5h5.5" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />`,
    xml: `    <path
        android:strokeColor="#ef4444"
        android:strokeAlpha="0.35"
        android:strokeWidth="1.8"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M19.5,12.572l-7.5,7.428l-7.5,-7.428a5,5 0,1 1,7.5,-6.566a5,5 0,1 1,7.5 6.572" />
    <path
        android:strokeColor="#ef4444"
        android:strokeWidth="2.2"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M3,13h4.5l2,-5 3.5,10 2.5,-6.5 2,3.5h5.5" />`
  },
  mind: {
    accent: '#c084fc',
    bg: 'rgba(192, 132, 252, 0.12)',
    // 4-point Diamond Star of Mindfulness & Reflection
    svg: `<path d="M12 2l2.6 6.4L21 11l-6.4 2.6L12 20l-2.6-6.4L3 11l6.4-2.6L12 2z" />
          <path d="M19 3v4m-2-2h4" stroke-width="1.6" />
          <path d="M5 17v3m-1.5-1.5h3" stroke-width="1.4" />`,
    xml: `    <path
        android:strokeColor="#c084fc"
        android:strokeWidth="2"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M12,2l2.6,6.4L21,11l-6.4,2.6L12,20l-2.6,-6.4L3,11l6.4,-2.6L12,2z" />
    <path
        android:strokeColor="#c084fc"
        android:strokeWidth="1.6"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M19,3v4M17,5h4" />
    <path
        android:strokeColor="#c084fc"
        android:strokeWidth="1.4"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M5,17v3M3.5,18.5h3" />`
  },
  intellect: {
    accent: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.12)',
    // Open Codex / Book with Spine
    svg: `<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          <path d="M12 7v14" stroke-width="1.8" />`,
    xml: `    <path
        android:strokeColor="#38bdf8"
        android:strokeWidth="2"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M2,3h6a4,4 0,0 1,4 4v14a3,3 0,0 0,-3 -3H2z" />
    <path
        android:strokeColor="#38bdf8"
        android:strokeWidth="2"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M22,3h-6a4,4 0,0 0,-4 4v14a3,3 0,0 1,3 -3h7z" />
    <path
        android:strokeColor="#38bdf8"
        android:strokeWidth="1.8"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M12,7v14" />`
  },
  skills: {
    accent: '#2dd4bf',
    bg: 'rgba(45, 212, 191, 0.12)',
    // Precision Target Rings & Impact
    svg: `<circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.5" fill="#2dd4bf" stroke="none" />
          <path d="M12 2v2m0 16v2m-10-10h2m16 0h2" stroke-width="1.8" />`,
    xml: `    <path
        android:strokeColor="#2dd4bf"
        android:strokeWidth="2"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M12,3a9,9 0,1 0,0 18a9,9 0,1 0,0 -18" />
    <path
        android:strokeColor="#2dd4bf"
        android:strokeWidth="2"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M12,7a5,5 0,1 0,0 10a5,5 0,1 0,0 -10" />
    <path
        android:fillColor="#2dd4bf"
        android:pathData="M12,10.5a1.5,1.5 0,1 0,0 3a1.5,1.5 0,1 0,0 -3" />
    <path
        android:strokeColor="#2dd4bf"
        android:strokeWidth="1.8"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M12,2v2M12,20v2M2,12h2M20,12h2" />`
  },
  deep_work: {
    accent: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.12)',
    // Focus Stopwatch / Flow State Timer
    svg: `<circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l3 2" stroke-width="2.2" />
          <path d="M10 2h4m-2 0v3" stroke-width="2" />
          <path d="M18 5l2-2" stroke-width="1.8" />`,
    xml: `    <path
        android:strokeColor="#a855f7"
        android:strokeWidth="2"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M12,5a8,8 0,1 0,0 16a8,8 0,1 0,0 -16" />
    <path
        android:strokeColor="#a855f7"
        android:strokeWidth="2.2"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M12,9v4l3,2" />
    <path
        android:strokeColor="#a855f7"
        android:strokeWidth="2"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M10,2h4M12,2v3" />
    <path
        android:strokeColor="#a855f7"
        android:strokeWidth="1.8"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M18,5l2,-2" />`
  },
  language: {
    accent: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.12)',
    // Globe Meridian Lexicon
    svg: `<circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" stroke-width="1.6" />
          <path d="M12 3a13 13 0 0 0 0 18a13 13 0 0 0 0-18" stroke-width="1.8" />
          <path d="M4.5 7.5h15M4.5 16.5h15" stroke-width="1.2" opacity="0.6" />`,
    xml: `    <path
        android:strokeColor="#06b6d4"
        android:strokeWidth="2"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M12,3a9,9 0,1 0,0 18a9,9 0,1 0,0 -18" />
    <path
        android:strokeColor="#06b6d4"
        android:strokeWidth="1.6"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M3,12h18" />
    <path
        android:strokeColor="#06b6d4"
        android:strokeWidth="1.8"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M12,3a13,13 0,0 0,0 18a13,13 0,0 0,0 -18" />
    <path
        android:strokeColor="#06b6d4"
        android:strokeAlpha="0.6"
        android:strokeWidth="1.2"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M4.5,7.5h15M4.5,16.5h15" />`
  },
  nutrition: {
    accent: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.12)',
    // Apple Silhouette & Fresh Stem Leaf
    svg: `<path d="M12 21c-3.6 0-7-2.6-7-7.8 0-4 2.8-6.7 5.8-6.7 1.4 0 2.2.8 3.2.8s1.8-.8 3.2-.8c3 0 5.8 2.7 5.8 6.7 0 5.2-3.4 7.8-7 7.8z" />
          <path d="M12 6.5V3c2.5 0 4 1.5 4 3.5" stroke-width="1.8" />`,
    xml: `    <path
        android:strokeColor="#22c55e"
        android:strokeWidth="2"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M12,21c-3.6,0 -7,-2.6 -7,-7.8 0,-4 2.8,-6.7 5.8,-6.7 1.4,0 2.2,0.8 3.2,0.8s1.8,-0.8 3.2,-0.8c3,0 5.8,2.7 5.8,6.7 0,5.2 -3.4,7.8 -7,7.8z" />
    <path
        android:strokeColor="#22c55e"
        android:strokeWidth="1.8"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M12,6.5V3c2.5,0 4,1.5 4,3.5" />`
  },
  environment: {
    accent: '#10b981',
    bg: 'rgba(168, 85, 247, 0.12)',
    // Clean Checklist & Sparkle Organization
    svg: `<circle cx="12" cy="12" r="9" />
          <path d="M8.5 12.5l2.5 2.5 5-5" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M19 4v3m-1.5-1.5h3" stroke-width="1.5" />`,
    xml: `    <path
        android:strokeColor="#10b981"
        android:strokeWidth="2"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M12,3a9,9 0,1 0,0 18a9,9 0,1 0,0 -18" />
    <path
        android:strokeColor="#10b981"
        android:strokeWidth="2.2"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M8.5,12.5l2.5,2.5 5,-5" />
    <path
        android:strokeColor="#10b981"
        android:strokeWidth="1.5"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M19,4v3M17.5,5.5h3" />`
  },
  finance: {
    accent: '#eab308',
    bg: 'rgba(234, 179, 8, 0.12)',
    // Trending Ascending Metric / Wealth Chart
    svg: `<path d="M3 17l6-6 4 4 8-8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M15 7h6v6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M3 21h18" stroke-width="1.8" stroke-linecap="round" />`,
    xml: `    <path
        android:strokeColor="#eab308"
        android:strokeWidth="2.2"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M3,17l6,-6 4,4 8,-8" />
    <path
        android:strokeColor="#eab308"
        android:strokeWidth="2.2"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M15,7h6v6" />
    <path
        android:strokeColor="#eab308"
        android:strokeWidth="1.8"
        android:strokeLineCap="round"
        android:pathData="M3,21h18" />`
  }
};

async function main() {
  console.log('Generating category SVGs and Android vector drawables...');

  const catSvgDir = path.join(SHARED_DIR, 'categories');
  const catXmlDir = path.join(SHARED_DIR, 'res/drawable');
  const androidAppXmlDir = path.join(ANDROID_RES_DIR, 'drawable');

  fs.mkdirSync(catSvgDir, { recursive: true });
  fs.mkdirSync(catXmlDir, { recursive: true });
  fs.mkdirSync(androidAppXmlDir, { recursive: true });

  for (const [key, item] of Object.entries(CATEGORIES)) {
    // 1. Create SVG
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="${item.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  ${item.svg}
</svg>\n`;

    fs.writeFileSync(path.join(catSvgDir, `${key}.svg`), svgContent);

    // 2. Create Android Vector XML
    const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
${item.xml}
</vector>\n`;

    fs.writeFileSync(path.join(catXmlDir, `ic_category_${key}.xml`), xmlContent);
    fs.writeFileSync(path.join(androidAppXmlDir, `ic_category_${key}.xml`), xmlContent);
  }

  console.log(`Generated all 11 category SVGs and Vector XML drawables.`);

  // 3. Android Adaptive Icon:
  // ic_launcher_background.xml
  const bgXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:aapt="http://schemas.android.com/aapt"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:pathData="M0,0h108v108h-108z">
        <aapt:attr name="android:fillColor">
            <gradient
                android:type="linear"
                android:startX="54"
                android:startY="0"
                android:endX="54"
                android:endY="108">
                <item android:offset="0.0" android:color="#FF131722" />
                <item android:offset="0.5" android:color="#FF0D0F15" />
                <item android:offset="1.0" android:color="#FF08090A" />
            </gradient>
        </aapt:attr>
    </path>
    <!-- Subtle circular reticle overlay -->
    <path
        android:strokeColor="#2060A5FA"
        android:strokeWidth="0.8"
        android:pathData="M54,20a34,34 0 1 0,0 68a34,34 0 1 0,0 -68" />
</vector>\n`;

  fs.writeFileSync(path.join(catXmlDir, 'ic_launcher_background.xml'), bgXml);
  fs.writeFileSync(path.join(androidAppXmlDir, 'ic_launcher_background.xml'), bgXml);

  // ic_launcher_foreground.xml (Lightning bolt safely contained inside safe zone: center 54, radius ~24)
  // Scaled from 1024 to 108dp: scale factor ~ 0.065, centered at (54, 54)
  const fgXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:aapt="http://schemas.android.com/aapt"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <!-- Ambient glow behind bolt -->
    <path
        android:pathData="M58,26 L45,50 L53,50 L49,78 L65,48 L56,48 Z">
        <aapt:attr name="android:fillColor">
            <gradient
                android:type="radial"
                android:centerX="54"
                android:centerY="52"
                android:gradientRadius="24">
                <item android:offset="0.0" android:color="#6000F0FF" />
                <item android:offset="0.6" android:color="#306366F1" />
                <item android:offset="1.0" android:color="#006366F1" />
            </gradient>
        </aapt:attr>
    </path>
    <!-- Lightning Bolt Body with Neon Gradient -->
    <path
        android:pathData="M57.5,24.5 L43.5,50.5 L52.5,50.5 L47.5,80.5 L65.5,47.5 L55.5,47.5 Z">
        <aapt:attr name="android:fillColor">
            <gradient
                android:type="linear"
                android:startX="43"
                android:startY="24"
                android:endX="66"
                android:endY="81">
                <item android:offset="0.0" android:color="#FFFFFFFF" />
                <item android:offset="0.3" android:color="#FF38BDF8" />
                <item android:offset="0.75" android:color="#FF6366F1" />
                <item android:offset="1.0" android:color="#FF818CF8" />
            </gradient>
        </aapt:attr>
    </path>
    <!-- Specular Ridge Line -->
    <path
        android:strokeColor="#CCFFFFFF"
        android:strokeWidth="1.0"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M57.5,24.5 L52.5,50.5 L47.5,80.5" />
    <!-- Fine Rim Outline -->
    <path
        android:strokeColor="#907DD3FC"
        android:strokeWidth="0.8"
        android:strokeLineJoin="round"
        android:pathData="M57.5,24.5 L43.5,50.5 L52.5,50.5 L47.5,80.5 L65.5,47.5 L55.5,47.5 Z" />
    <!-- Energy Spark Dots -->
    <path
        android:fillColor="#FF38BDF8"
        android:pathData="M68,41a1,1 0 1 0,0 2a1,1 0 1 0,0 -2 M40,55a0.8,0.8 0 1 0,0 1.6a0.8,0.8 0 1 0,0 -1.6" />
</vector>\n`;

  fs.writeFileSync(path.join(catXmlDir, 'ic_launcher_foreground.xml'), fgXml);
  fs.writeFileSync(path.join(androidAppXmlDir, 'ic_launcher_foreground.xml'), fgXml);

  // ic_launcher_monochrome.xml (Android 13+ Themed Icons)
  const monoXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="@android:color/white"
        android:pathData="M57.5,24.5 L43.5,50.5 L52.5,50.5 L47.5,80.5 L65.5,47.5 L55.5,47.5 Z" />
</vector>\n`;

  fs.writeFileSync(path.join(catXmlDir, 'ic_launcher_monochrome.xml'), monoXml);
  fs.writeFileSync(path.join(androidAppXmlDir, 'ic_launcher_monochrome.xml'), monoXml);

  // Adaptive Icon Manifests
  const anydpiXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
    <monochrome android:drawable="@drawable/ic_launcher_monochrome" />
</adaptive-icon>\n`;

  const mipmapDirs = [
    path.join(SHARED_DIR, 'res/mipmap-anydpi-v26'),
    path.join(ANDROID_RES_DIR, 'mipmap-anydpi-v26')
  ];

  for (const dir of mipmapDirs) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'ic_launcher.xml'), anydpiXml);
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.xml'), anydpiXml);
  }

  // 4. Generate iOS AppIcon images & Contents.json
  const svgSource = fs.readFileSync(path.join(SHARED_DIR, 'icon.svg'));

  const iosSizes = [
    { name: 'icon-20.png', size: 20 },
    { name: 'icon-20@2x.png', size: 40 },
    { name: 'icon-20@3x.png', size: 60 },
    { name: 'icon-29.png', size: 29 },
    { name: 'icon-29@2x.png', size: 58 },
    { name: 'icon-29@3x.png', size: 87 },
    { name: 'icon-40.png', size: 40 },
    { name: 'icon-40@2x.png', size: 80 },
    { name: 'icon-40@3x.png', size: 120 },
    { name: 'icon-60@2x.png', size: 120 },
    { name: 'icon-60@3x.png', size: 180 },
    { name: 'icon-76.png', size: 76 },
    { name: 'icon-76@2x.png', size: 152 },
    { name: 'icon-83.5@2x.png', size: 167 },
    { name: 'icon-1024.png', size: 1024 }
  ];

  const appIconContents = {
    images: [
      { size: "20x20", idiom: "iphone", filename: "icon-20@2x.png", scale: "2x" },
      { size: "20x20", idiom: "iphone", filename: "icon-20@3x.png", scale: "3x" },
      { size: "29x29", idiom: "iphone", filename: "icon-29@2x.png", scale: "2x" },
      { size: "29x29", idiom: "iphone", filename: "icon-29@3x.png", scale: "3x" },
      { size: "40x40", idiom: "iphone", filename: "icon-40@2x.png", scale: "2x" },
      { size: "40x40", idiom: "iphone", filename: "icon-40@3x.png", scale: "3x" },
      { size: "60x60", idiom: "iphone", filename: "icon-60@2x.png", scale: "2x" },
      { size: "60x60", idiom: "iphone", filename: "icon-60@3x.png", scale: "3x" },
      { size: "20x20", idiom: "ipad", filename: "icon-20.png", scale: "1x" },
      { size: "20x20", idiom: "ipad", filename: "icon-20@2x.png", scale: "2x" },
      { size: "29x29", idiom: "ipad", filename: "icon-29.png", scale: "1x" },
      { size: "29x29", idiom: "ipad", filename: "icon-29@2x.png", scale: "2x" },
      { size: "40x40", idiom: "ipad", filename: "icon-40.png", scale: "1x" },
      { size: "40x40", idiom: "ipad", filename: "icon-40@2x.png", scale: "2x" },
      { size: "76x76", idiom: "ipad", filename: "icon-76.png", scale: "1x" },
      { size: "76x76", idiom: "ipad", filename: "icon-76@2x.png", scale: "2x" },
      { size: "83.5x83.5", idiom: "ipad", filename: "icon-83.5@2x.png", scale: "2x" },
      { size: "1024x1024", idiom: "ios-marketing", filename: "icon-1024.png", scale: "1x" },
      { size: "1024x1024", idiom: "universal", platform: "ios", filename: "icon-1024.png", scale: "1x" }
    ],
    info: {
      version: 1,
      author: "xcode"
    }
  };

  const iosTargetDirs = [
    path.join(SHARED_DIR, 'Assets.xcassets/AppIcon.appiconset'),
    IOS_ASSETS_DIR,
    path.join(BASE_DIR, 'ios/DoIt/Assets.xcassets/AppIcon.appiconset')
  ];

  for (const dir of iosTargetDirs) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'Contents.json'), JSON.stringify(appIconContents, null, 2));
    
    // Also write top-level Contents.json for xcassets root
    const rootXcassetsDir = path.dirname(dir);
    const rootContents = {
      info: {
        version: 1,
        author: "xcode"
      }
    };
    fs.writeFileSync(path.join(rootXcassetsDir, 'Contents.json'), JSON.stringify(rootContents, null, 2));
  }

  console.log('Rendering iOS PNG assets...');
  for (const icon of iosSizes) {
    const pngBuffer = await sharp(svgSource)
      .resize(icon.size, icon.size)
      .removeAlpha() // App Store requirement: NO alpha channel on icons
      .png({ quality: 100, compressionLevel: 9 })
      .toBuffer();

    for (const dir of iosTargetDirs) {
      fs.writeFileSync(path.join(dir, icon.name), pngBuffer);
    }
  }

  // 5. Generate Android legacy mipmaps & Play Store 512x512
  const androidMipmaps = [
    { dir: 'mipmap-mdpi', size: 48 },
    { dir: 'mipmap-hdpi', size: 72 },
    { dir: 'mipmap-xhdpi', size: 96 },
    { dir: 'mipmap-xxhdpi', size: 144 },
    { dir: 'mipmap-xxxhdpi', size: 192 }
  ];

  for (const mm of androidMipmaps) {
    const pngBuffer = await sharp(svgSource)
      .resize(mm.size, mm.size)
      .png({ quality: 100 })
      .toBuffer();

    const sharedMmDir = path.join(SHARED_DIR, 'res', mm.dir);
    const appMmDir = path.join(ANDROID_RES_DIR, mm.dir);
    fs.mkdirSync(sharedMmDir, { recursive: true });
    fs.mkdirSync(appMmDir, { recursive: true });

    fs.writeFileSync(path.join(sharedMmDir, 'ic_launcher.png'), pngBuffer);
    fs.writeFileSync(path.join(sharedMmDir, 'ic_launcher_round.png'), pngBuffer);
    fs.writeFileSync(path.join(appMmDir, 'ic_launcher.png'), pngBuffer);
    fs.writeFileSync(path.join(appMmDir, 'ic_launcher_round.png'), pngBuffer);
  }

  // Play Store 512x512 PNG
  const playStore512 = await sharp(svgSource)
    .resize(512, 512)
    .removeAlpha()
    .png({ quality: 100 })
    .toBuffer();

  fs.writeFileSync(path.join(SHARED_DIR, 'ic_launcher-512.png'), playStore512);
  fs.writeFileSync(path.join(BASE_DIR, 'android/ic_launcher-512.png'), playStore512);

  console.log('Mobile assets successfully generated!');
}

main().catch(err => {
  console.error('Generation failed:', err);
  process.exit(1);
});

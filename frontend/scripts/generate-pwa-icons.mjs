/**
 * PWA 图标生成器
 * ============================================
 * 从 public/icons/icon-512.svg 生成所有需要的 PNG 图标：
 *  - icon-192.png / icon-512.png          标准 PWA 图标
 *  - icon-maskable-192.png / -512.png      maskable 变体（中心安全区）
 *  - apple-touch-icon.png                  iOS 主屏图标 (180x180)
 *  - favicon-32.png / favicon-16.png       浏览器标签
 *  - apple-splash-*.png                    iOS 启动画面（主流机型）
 *
 * 用法: node scripts/generate-pwa-icons.mjs
 * 依赖: sharp (devDependency)
 */
import sharp from "sharp";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(__dirname, "..");
const ICONS_DIR = resolve(FRONTEND, "public", "icons");
const SOURCE_SVG = resolve(ICONS_DIR, "icon-512.svg");

const BG_COLOR = "#0f172a";
const BRAND_COLOR = "#6366f1";

mkdirSync(ICONS_DIR, { recursive: true });

const svgBuffer = readFileSync(SOURCE_SVG);

// ── 1. 标准 PNG 图标 ──────────────────────────
async function genStandard(size, name) {
  const out = resolve(ICONS_DIR, name);
  await sharp(svgBuffer).resize(size, size).png().toFile(out);
  console.log(`✓ ${name} (${size}x${size})`);
}

// ── 2. Maskable 图标（logo 缩到 70%，全出血背景）──
async function genMaskable(size, name) {
  // 用 SVG composite: 全色背景 + 居中缩小的 logo
  const padding = Math.round(size * 0.15); // 15% padding each side → logo 70%
  const logoSize = size - padding * 2;
  const bg = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 }, // #0f172a
    },
  }).png().toBuffer();
  const logo = await sharp(svgBuffer).resize(logoSize, logoSize).png().toBuffer();
  await sharp(bg)
    .composite([{ input: logo, top: padding, left: padding }])
    .png()
    .toFile(resolve(ICONS_DIR, name));
  console.log(`✓ ${name} (maskable ${size}x${size})`);
}

// ── 3. Apple touch icon (180x180, 方角无透明) ──
async function genAppleTouch() {
  const size = 180;
  const bg = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 },
    },
  }).png().toBuffer();
  const logo = await sharp(svgBuffer).resize(size, size).png().toBuffer();
  await sharp(bg)
    .composite([{ input: logo, top: 0, left: 0 }])
    .png()
    .toFile(resolve(ICONS_DIR, "apple-touch-icon.png"));
  console.log(`✓ apple-touch-icon.png (180x180)`);
}

// ── 4. Favicon ──────────────────────────────
async function genFavicon() {
  await sharp(svgBuffer).resize(32, 32).png().toFile(resolve(ICONS_DIR, "favicon-32.png"));
  await sharp(svgBuffer).resize(16, 16).png().toFile(resolve(ICONS_DIR, "favicon-16.png"));
  // ICO: sharp 不直接支持 ICO，用 32px PNG 作为 favicon.ico（多数浏览器接受）
  await sharp(svgBuffer).resize(32, 32).png().toFile(resolve(ICONS_DIR, "favicon.ico"));
  console.log(`✓ favicon-32.png / favicon-16.png / favicon.ico`);
}

// ── 5. iOS 启动画面 ─────────────────────────
// 主流 iPhone 竖屏尺寸（设备像素）
const SPLASH_SIZES = [
  { w: 1170, h: 2532, name: "apple-splash-1170-2532.png" }, // iPhone 12/13/14/15
  { w: 1290, h: 2796, name: "apple-splash-1290-2796.png" }, // iPhone 14/15 Pro Max
  { w: 1080, h: 1920, name: "apple-splash-1080-1920.png" }, // iPhone 8/SE 老
  { w: 2778, h: 1284, name: "apple-splash-2778-1284.png" }, // iPad Pro 12.9 横
  { w: 2048, h: 1536, name: "apple-splash-2048-1536.png" }, // iPad
];

async function genSplash(w, h, name) {
  const bg = await sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 },
    },
  }).png().toBuffer();
  // logo 占短边 35%，居中
  const logoSize = Math.round(Math.min(w, h) * 0.35);
  const logo = await sharp(svgBuffer).resize(logoSize, logoSize).png().toBuffer();
  const top = Math.round((h - logoSize) / 2);
  const left = Math.round((w - logoSize) / 2);
  await sharp(bg)
    .composite([{ input: logo, top, left }])
    .png()
    .toFile(resolve(ICONS_DIR, name));
  console.log(`✓ ${name} (${w}x${h})`);
}

// ── 主流程 ─────────────────────────────────
async function main() {
  console.log("Generating PWA icons from icon-512.svg...\n");
  await genStandard(192, "icon-192.png");
  await genStandard(512, "icon-512.png");
  await genMaskable(192, "icon-maskable-192.png");
  await genMaskable(512, "icon-maskable-512.png");
  await genAppleTouch();
  await genFavicon();
  for (const s of SPLASH_SIZES) {
    await genSplash(s.w, s.h, s.name);
  }
  console.log("\n✅ All PWA icons generated.");
}

main().catch((err) => {
  console.error("Failed to generate icons:", err);
  process.exit(1);
});

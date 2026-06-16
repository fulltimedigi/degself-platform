/**
 * Branded image render engine for @degselfkw.
 * Pure canvas (no browser). Black/yellow brand. Correct Arabic RTL shaping.
 * Output: 1080x1350 portrait JPGs (best feed ratio) into public/social/.
 */
const { createCanvas, GlobalFonts, loadImage } = require("@napi-rs/canvas");
const fs = require("fs");
const path = require("path");

// ---- brand ----
const BRAND = {
  bg: "#0A0A0A",
  bg2: "#141414",
  card: "#1A1A1A",
  yellow: "#FFD60A",
  white: "#FFFFFF",
  muted: "#9AA0A6",
  line: "#2A2A2A",
};
const W = 1080,
  H = 1350;

// ---- fonts ----
(function registerFonts() {
  // Cairo = same font the site uses; full Arabic + Latin + symbol coverage.
  const cairo = path.join(__dirname, "fonts/Cairo.ttf");
  if (fs.existsSync(cairo)) GlobalFonts.registerFromPath(cairo, "AR");
  else GlobalFonts.registerFromPath("/System/Library/Fonts/SFArabic.ttf", "AR");
})();

// ---- primitives ----
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// faux-bold via stroke so headlines read heavy with the single-weight SF font
function setFont(ctx, size, { weight = "regular", fam = "AR" } = {}) {
  ctx.font = `${size}px ${fam}`;
  ctx.textAlign = "right";
  ctx.direction = "rtl";
  ctx._bold = weight === "bold" ? Math.max(0.6, size / 60) : 0;
}
function drawText(ctx, text, x, y, color) {
  text = stripEmoji(text);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  if (ctx._bold) {
    ctx.strokeStyle = color;
    ctx.lineWidth = ctx._bold;
    ctx.strokeText(text, x, y);
  }
}

// Cairo has no emoji glyphs → strip them from on-image text (captions keep them)
function stripEmoji(s) {
  return String(s)
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{200D}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

// RTL word-wrap → array of lines fitting maxWidth
function wrap(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (ctx.measureText(t).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

// draw a wrapped paragraph, returns the y after the last line
function paragraph(ctx, text, xRight, y, maxWidth, size, opts = {}) {
  const lh = opts.lineHeight || size * 1.45;
  setFont(ctx, size, opts);
  const color = opts.color || BRAND.white;
  for (const line of wrap(ctx, stripEmoji(text), maxWidth)) {
    drawText(ctx, line, xRight, y, color);
    y += lh;
  }
  return y;
}

// yellow pill label (e.g. a content tag)
function pill(ctx, text, xRight, y, size = 30) {
  text = stripEmoji(text);
  setFont(ctx, size, { weight: "bold" });
  const padX = 26,
    h = size + 34;
  const tw = ctx.measureText(text).width;
  const w = tw + padX * 2;
  roundRect(ctx, xRight - w, y, w, h, h / 2);
  ctx.fillStyle = BRAND.yellow;
  ctx.fill();
  drawText(ctx, text, xRight - padX, y + size + 6, BRAND.bg);
  return h;
}

// background: near-black with a soft yellow glow top-right
function background(ctx, glow = true) {
  ctx.fillStyle = BRAND.bg;
  ctx.fillRect(0, 0, W, H);
  if (glow) {
    const g = ctx.createRadialGradient(W - 120, 140, 40, W - 120, 140, 760);
    g.addColorStop(0, "rgba(255,214,10,0.16)");
    g.addColorStop(1, "rgba(255,214,10,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}

let LOGO;
async function brandFooter(ctx, slide) {
  const margin = 72;
  const y = H - 96;
  // divider
  ctx.strokeStyle = BRAND.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin, y - 34);
  ctx.lineTo(W - margin, y - 34);
  ctx.stroke();
  // logo mark (right)
  try {
    if (!LOGO) LOGO = await loadImage(path.join(process.cwd(), "public/icons/icon-512.png"));
    const s = 64;
    roundRect(ctx, W - margin - s, y - 14, s, s, 16);
    ctx.save();
    ctx.clip();
    ctx.drawImage(LOGO, W - margin - s, y - 14, s, s);
    ctx.restore();
  } catch {}
  // wordmark
  setFont(ctx, 38, { weight: "bold" });
  drawText(ctx, "دق سلف", W - margin - 80, y + 26, BRAND.yellow);
  // handle + site (left side, LTR)
  ctx.direction = "ltr";
  ctx.textAlign = "left";
  ctx.font = "30px AR";
  ctx.fillStyle = BRAND.muted;
  ctx.fillText("@degselfkw · degself.com", margin, y + 24);
  // slide counter
  if (slide) {
    ctx.textAlign = "right";
    ctx.fillStyle = BRAND.yellow;
    ctx.font = "28px AR";
    ctx.fillText(slide, W - margin, y - 50);
  }
}

// create a fresh canvas+ctx
function newCard() {
  const canvas = createCanvas(W, H);
  return { canvas, ctx: canvas.getContext("2d") };
}

function save(canvas, name) {
  const dir = path.join(process.cwd(), "public/social");
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, name);
  fs.writeFileSync(out, canvas.toBuffer("image/jpeg"));
  return `public/social/${name}`;
}

module.exports = {
  BRAND,
  W,
  H,
  newCard,
  save,
  roundRect,
  setFont,
  drawText,
  wrap,
  paragraph,
  pill,
  background,
  brandFooter,
};

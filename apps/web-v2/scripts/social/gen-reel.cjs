/**
 * Faceless vertical Reel generator for @degselfkw — no filming needed.
 * Renders animated 1080x1920 frames in canvas (correct Arabic via Cairo),
 * then assembles an IG-compatible reel with ffmpeg (H.264 + silent AAC + faststart).
 *
 *   node scripts/social/gen-reel.cjs            # build public/social/reel-sounds.mp4
 *
 * NOTE: API-published reels can't use Instagram's in-app trending audio (that's
 * app-only). This produces a clean silent motion reel — still far better reach
 * than a static image on a new account.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { createCanvas } = require("@napi-rs/canvas");
const FF = require("ffmpeg-static");
const L = require("./lib.cjs"); // reuses brand + Cairo + draw primitives

const W = 1080, H = 1920, FPS = 30;
const XR = W - 80, MAXW = W - 160;
const TMP = path.join(process.cwd(), "scripts/social/.frames");

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOut = (p) => 1 - Math.pow(1 - clamp(p, 0, 1), 3);
// fade+drift in over `dur` starting at `start`
function reveal(ctx, t, start, dur = 0.45) {
  const p = easeOut((t - start) / dur);
  ctx.globalAlpha = p;
  return (1 - p) * 26; // downward drift that settles to 0
}

// ---- the reel content (3 warning sounds → CTA) ----
const HOOK = "٣ أصوات لو سمعتها\nفي عربيتك… وقّف";
const TIPS = [
  { h: "صرير عند الفرامل", d: "غالبًا التيل خلص" },
  { h: "طقطقة من المكينة", d: "زيت ناقص أو صمامات" },
  { h: "احتكاك عند اللف", d: "مساعدين أو رمان بلية" },
];
const DUR = 9.5; // seconds

function bg(ctx, t) {
  ctx.globalAlpha = 1;
  ctx.fillStyle = L.BRAND.bg;
  ctx.fillRect(0, 0, W, H);
  // gentle pulsing glow
  const pulse = 0.14 + 0.05 * Math.sin(t * 1.6);
  const g = ctx.createRadialGradient(W / 2, 360, 60, W / 2, 360, 900);
  g.addColorStop(0, `rgba(255,214,10,${pulse})`);
  g.addColorStop(1, "rgba(255,214,10,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function progress(ctx, t) {
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(0, 0, W, 10);
  ctx.fillStyle = L.BRAND.yellow;
  ctx.fillRect(0, 0, W * clamp(t / DUR, 0, 1), 10);
}

function brandTop(ctx) {
  ctx.globalAlpha = 1;
  L.setFont(ctx, 40, { weight: "bold" });
  L.drawText(ctx, "دق سلف", XR, 130, L.BRAND.yellow);
  ctx.direction = "ltr";
  ctx.textAlign = "left";
  ctx.font = "30px AR";
  ctx.fillStyle = L.BRAND.muted;
  ctx.fillText("@degselfkw", 80, 124);
}

function multiline(ctx, text, xRight, y, size, lh, color, weight) {
  L.setFont(ctx, size, { weight });
  for (const para of text.split("\n")) {
    for (const line of L.wrap(ctx, para, MAXW)) {
      L.drawText(ctx, line, xRight, y, color);
      y += lh;
    }
  }
  return y;
}

function frame(ctx, t) {
  bg(ctx, t);
  brandTop(ctx);

  // HOOK — big & centered early, then settles to upper third
  const moveP = easeOut((t - 2.0) / 0.6);
  const hookY = 560 - moveP * 200;
  const hookSize = 96 - moveP * 22;
  ctx.globalAlpha = easeOut(t / 0.4);
  multiline(ctx, HOOK, XR, hookY, hookSize, hookSize * 1.28, L.BRAND.white, "bold");

  // TIPS reveal one by one, starting at 2.4s, 1.1s apart
  let y = 760;
  TIPS.forEach((tip, i) => {
    const start = 2.4 + i * 1.1;
    if (t < start) return;
    const drift = reveal(ctx, t, start);
    // number chip
    const s = 76;
    L.roundRect(ctx, XR - s, y + drift - 6, s, s, 20);
    ctx.fillStyle = L.BRAND.yellow;
    ctx.fill();
    L.setFont(ctx, 46, { weight: "bold" });
    ctx.textAlign = "center";
    ctx.fillStyle = L.BRAND.bg;
    ctx.fillText(String(i + 1), XR - s / 2, y + drift + 50);
    // text
    const tx = XR - s - 30;
    L.setFont(ctx, 50, { weight: "bold" });
    L.drawText(ctx, tip.h, tx, y + drift + 36, L.BRAND.white);
    L.setFont(ctx, 38);
    L.drawText(ctx, tip.d, tx, y + drift + 92, L.BRAND.muted);
    y += 175;
  });

  // CTA card slides up at the end
  if (t > 7.4) {
    const drift = reveal(ctx, t, 7.4, 0.5);
    const cardY = 1500 + drift;
    L.roundRect(ctx, 80, cardY, W - 160, 230, 36);
    ctx.fillStyle = "rgba(255,214,10,0.12)";
    ctx.fill();
    L.setFont(ctx, 54, { weight: "bold" });
    L.drawText(ctx, "محتار تروح فين؟", XR, cardY + 92, L.BRAND.yellow);
    L.setFont(ctx, 44);
    L.drawText(ctx, "لاقي كراج متخصص على دق سلف", XR, cardY + 165, L.BRAND.white);
  }
  ctx.globalAlpha = 1;

  progress(ctx, t);
}

(async () => {
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });
  const total = Math.round(DUR * FPS);
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  for (let f = 0; f < total; f++) {
    frame(ctx, f / FPS);
    fs.writeFileSync(path.join(TMP, `f${String(f).padStart(5, "0")}.png`), canvas.toBuffer("image/png"));
  }
  console.log(`🎞️  rendered ${total} frames`);

  const out = path.join(process.cwd(), "public/social/reel-sounds.mp4");
  execFileSync(FF, [
    "-y",
    "-framerate", String(FPS),
    "-i", path.join(TMP, "f%05d.png"),
    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-c:v", "libx264", "-preset", "medium", "-crf", "20",
    "-pix_fmt", "yuv420p", "-r", String(FPS),
    "-c:a", "aac", "-b:a", "128k",
    "-shortest", "-movflags", "+faststart",
    out,
  ], { stdio: ["ignore", "ignore", "inherit"] });
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log("✅ " + out);
  console.log(`   size ${(fs.statSync(out).size / 1e6).toFixed(2)} MB`);
})().catch((e) => { console.error("❌", e.message); process.exit(1); });

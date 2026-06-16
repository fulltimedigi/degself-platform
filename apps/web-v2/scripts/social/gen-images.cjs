/**
 * Generate the @degselfkw post batch: branded JPGs into public/social/ and
 * append scheduled entries to scripts/content-queue.json.
 *
 *   node scripts/social/gen-images.cjs            # render + (re)write queue
 *   node scripts/social/gen-images.cjs --no-queue # just render images
 *
 * Images become public at https://degself.com/social/<file> AFTER git push + Vercel deploy.
 */
const fs = require("fs");
const path = require("path");
const L = require("./lib.cjs");

const SITE = "degself.com";
const XR = L.W - 72; // right margin (RTL anchor)
const MAXW = L.W - 144;

// ---------- layouts ----------
async function hero({ tag, title, sub, file }) {
  const { canvas, ctx } = L.newCard();
  L.background(ctx);
  let y = 150;
  y += L.pill(ctx, tag, XR, y) + 100;
  y = L.paragraph(ctx, title, XR, y, MAXW, 92, { weight: "bold", lineHeight: 122 }) + 24;
  L.paragraph(ctx, sub, XR, y, MAXW, 46, { color: L.BRAND.muted, lineHeight: 70 });
  await L.brandFooter(ctx);
  return L.save(canvas, file);
}

async function statement({ tag, kicker, headline, sub, file }) {
  const { canvas, ctx } = L.newCard();
  L.background(ctx);
  let y = 150;
  y += L.pill(ctx, tag, XR, y) + 56;
  y = L.paragraph(ctx, kicker, XR, y, MAXW, 50, { color: L.BRAND.yellow, lineHeight: 76 }) + 8;
  y = L.paragraph(ctx, headline, XR, y, MAXW, 78, { weight: "bold", lineHeight: 108 }) + 22;
  L.paragraph(ctx, sub, XR, y, MAXW, 44, { color: L.BRAND.muted, lineHeight: 68 });
  await L.brandFooter(ctx);
  return L.save(canvas, file);
}

// numbered tip list (great for saves)
async function tipList({ tag, title, items, footnote, file }) {
  const { canvas, ctx } = L.newCard();
  L.background(ctx);
  let y = 140;
  y += L.pill(ctx, tag, XR, y) + 100;
  y = L.paragraph(ctx, title, XR, y, MAXW, 66, { weight: "bold", lineHeight: 92 }) + 40;
  items.forEach((it, i) => {
    const num = String(i + 1);
    // yellow number chip on the right
    const s = 64;
    L.roundRect(ctx, XR - s, y - 4, s, s, 18);
    ctx.fillStyle = L.BRAND.yellow;
    ctx.fill();
    L.setFont(ctx, 40, { weight: "bold" });
    ctx.textAlign = "center";
    ctx.fillStyle = L.BRAND.bg;
    ctx.fillText(num, XR - s / 2, y + 44);
    // text to the right-left of chip
    const tx = XR - s - 28;
    L.setFont(ctx, 42, { weight: "bold" });
    L.drawText(ctx, it.h, tx, y + 30, L.BRAND.white);
    let yy = y + 30 + 56;
    yy = L.paragraph(ctx, it.d, tx, yy, MAXW - s - 28, 36, {
      color: L.BRAND.muted,
      lineHeight: 50,
    });
    y = yy + 34;
  });
  if (footnote) L.paragraph(ctx, footnote, XR, y + 6, MAXW, 38, { color: L.BRAND.yellow, lineHeight: 56 });
  await L.brandFooter(ctx);
  return L.save(canvas, file);
}

// big trust number
async function bigNumber({ tag, number, label, sub, file }) {
  const { canvas, ctx } = L.newCard();
  L.background(ctx);
  let y = 200;
  y += L.pill(ctx, tag, XR, y) + 120;
  // giant number, centered
  ctx.textAlign = "center";
  ctx.direction = "ltr";
  ctx.font = "240px AR";
  ctx.fillStyle = L.BRAND.yellow;
  ctx.lineWidth = 4;
  ctx.strokeStyle = L.BRAND.yellow;
  ctx.fillText(number, L.W / 2, y + 200);
  ctx.strokeText(number, L.W / 2, y + 200);
  y += 320;
  ctx.direction = "rtl";
  L.setFont(ctx, 64, { weight: "bold" });
  ctx.textAlign = "center";
  L.drawText(ctx, label, L.W / 2, y, L.BRAND.white);
  y += 90;
  L.setFont(ctx, 42);
  ctx.textAlign = "center";
  ctx.fillStyle = L.BRAND.muted;
  for (const line of L.wrap(ctx, sub, MAXW)) {
    ctx.fillText(line, L.W / 2, y);
    y += 64;
  }
  await L.brandFooter(ctx);
  return L.save(canvas, file);
}

// ---------- content ----------
async function build() {
  const posts = [];

  posts.push({
    type: "image",
    file: await hero({
      tag: "مجانًا · بدون تسجيل",
      title: "أكبر دليل كراجات في الكويت",
      sub: "ميكانيكا · كهرباء · بنشر · تكييف · سمكرة ودوكو. كل التخصصات وكل المناطق في مكان واحد.",
      file: "01-hero.jpg",
    }),
    caption:
      "كراجات الكويت كلها في مكان واحد 🔧\n\nدق سلف = أكبر دليل كراجات في الكويت. ابحث بالتخصص والمنطقة، شوف التقييمات، واتصل أو ابعت واتساب بضغطة — مجانًا وبدون تسجيل.\n\nابدأ من اللينك في البايو 👆\n\n#الكويت #كراجات_الكويت #سيارات_الكويت #ميكانيكي_الكويت #صيانة_سيارات #q8 #kuwait #دق_سلف",
  });

  posts.push({
    type: "image",
    file: await statement({
      tag: "مترجم العطل",
      kicker: "مش عارف تشرح العطل للكراج؟",
      headline: "اكتب اللي بيحصل بكلامك… وخده رسالة جاهزة",
      sub: "تكتب «العربية تسحب على جنب وفيه صوت عند الفرامل» → دق سلف يطلّعلك رسالة واتساب مرتّبة للكراج + كراجات قريبة مقترحة.",
      file: "02-translator.jpg",
    }),
    caption:
      "مش عارف تشرح العطل للكراج؟ خليه يشرح نفسه 👇\n\nاكتب مشكلة عربيتك بكلامك العادي، ودق سلف يحوّلها رسالة واتساب جاهزة تبعتها للكراج على طول — من غير لف ودوران.\n\nجرّبه مجانًا — اللينك في البايو 👆\n\n#الكويت #سيارات #كراج #ميكانيكي_الكويت #كهرباء_سيارات #q8 #kuwaitcars #دق_سلف",
  });

  posts.push({
    type: "image",
    file: await tipList({
      tag: "احفظها",
      title: "٣ أصوات لو سمعتها في عربيتك… وقّف",
      items: [
        { h: "صرير عند الفرامل", d: "غالبًا تيل الفرامل خلص — تأجيله بيأذي الهوبات ويغلّي التصليح." },
        { h: "طقطقة من المكينة", d: "ممكن نقص زيت أو صمامات — افحص فورًا قبل ما يكبر." },
        { h: "احتكاك عند اللف", d: "إشارة على المساعدين أو رمان البلية — بيأثر على الأمان." },
      ],
      footnote: "محتار تروح فين؟ لاقي كراج مناسب على دق سلف 👆",
      file: "03-sounds.jpg",
    }),
    caption:
      "أصوات السيارة اللي لازم تاخدها بجدية 🔧🚨\n\nاحفظ البوست عشان تفتكرها وقت الحاجة. وأول ما تسمع أي صوت منهم، لاقي أقرب كراج متخصص على دق سلف.\n\nاللينك في البايو 👆\n\n#الكويت #صيانة_سيارات #ميكانيكي_الكويت #فرامل #كراجات_الكويت #q8 #دق_سلف",
  });

  posts.push({
    type: "image",
    file: await tipList({
      tag: "صيف الكويت ☀️",
      title: "حر الكويت بيدمّر ٤ حاجات في عربيتك",
      items: [
        { h: "البطارية", d: "الحرارة بتفصّلها أسرع وممكن توقفك فجأة." },
        { h: "المكيّف/الكباس", d: "ضعف التبريد = غاز ناقص أو كباس تعبان." },
        { h: "ضغط الكاوتش", d: "الحر يرفع الضغط ويزوّد خطر الانفجار." },
        { h: "مياه التبريد", d: "نقصها بيرفع حرارة المكينة لحد ما تفصل." },
      ],
      footnote: "أقرب كراج تكييف أو بطاريات على دق سلف",
      file: "04-summer.jpg",
    }),
    caption:
      "نصايح صيانة عربيتك في حر الكويت 🌡️🔥\n\nقبل ما الحر يوقفك، جهّز عربيتك. لاقي كراج تكييف أو بطاريات قريب منك على دق سلف.\n\nاللينك في البايو 👆\n\n#الكويت #صيف_الكويت #تكييف_سيارات #بطاريات #صيانة_سيارات #q8 #كراجات_الكويت #دق_سلف",
  });

  posts.push({
    type: "image",
    file: await bigNumber({
      tag: "موثوق",
      number: "+1600",
      label: "كراج موثّق في الكويت",
      sub: "كل التخصصات وكل المناطق — مرتّبة عشان تلاقي اللي يناسبك في ثواني.",
      file: "05-trust.jpg",
    }),
    caption:
      "ليه تضيّع وقتك تدوّر؟ 🕒\n\n+١٦٠٠ كراج موثّق في الكويت، مرتّبين بالتخصص والمنطقة. ابحث، قارن، واتصل بضغطة — مجانًا.\n\nابدأ من اللينك في البايو 👆\n\n#الكويت #كراجات_الكويت #سيارات_الكويت #ميكانيكي_الكويت #q8 #kuwait #دق_سلف",
  });

  posts.push({
    type: "image",
    file: await statement({
      tag: "٣ خطوات",
      kicker: "تلاقي كراج كويس في أقل من دقيقة",
      headline: "ابحث · قارن · اتصل",
      sub: "① اختر التخصص والمنطقة ② شوف التقييمات والمسافة ③ اتصل أو واتساب بضغطة. بدون تسجيل وبدون أي رسوم.",
      file: "06-howto.jpg",
    }),
    caption:
      "تلاقي كراج كويس في ٣ خطوات 👇\n\n① اختر التخصص والمنطقة\n② قارن التقييمات والمسافة\n③ اتصل أو ابعت واتساب بضغطة\n\nكله مجانًا — اللينك في البايو 👆\n\n#الكويت #كراجات_الكويت #سيارات #ميكانيكي_الكويت #q8 #kuwaitcars #دق_سلف",
  });

  return posts;
}

// ---------- queue ----------
function schedule(posts) {
  // evenings at Kuwait peak: 21:00 Kuwait = 18:00 UTC, starting tomorrow
  const QF = path.join(process.cwd(), "scripts/content-queue.json");
  const base = new Date();
  base.setUTCHours(18, 0, 0, 0);
  base.setUTCDate(base.getUTCDate() + 1);
  const entries = posts.map((p, i) => {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() + i);
    return {
      id: path.basename(p.file).replace(/\.(jpg|mp4)$/, ""),
      status: "draft", // flip to "scheduled" after approval
      publish_at: d.toISOString(),
      type: p.type,
      media_url: `https://${SITE}/${p.file}`,
      caption: p.caption,
    };
  });
  fs.writeFileSync(QF, JSON.stringify(entries, null, 2) + "\n");
  return entries;
}

(async () => {
  const posts = await build();
  console.log("✅ rendered " + posts.length + " images:");
  posts.forEach((p) => console.log("  - " + p.file));
  if (!process.argv.includes("--no-queue")) {
    const e = schedule(posts);
    console.log("\n🗓️  queued " + e.length + " posts (status=draft) starting " + e[0].publish_at);
  }
})().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});

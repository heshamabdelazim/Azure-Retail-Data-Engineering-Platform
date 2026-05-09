import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.join(rootDir, "docs");
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(rootDir, relative), "utf8"));

const executive = readJson("reports/executive_summary.json");
const quality = readJson("reports/data_quality_report.json");
const pipeline = readJson("reports/pipeline_summary.json");

const EMU = 914400;
const W = 12192000;
const H = 6858000;
const inch = (value) => Math.round(value * EMU);

const colors = {
  navy: "0B1F33",
  ink: "17202A",
  muted: "64748B",
  blue: "1F4E79",
  teal: "1B998B",
  green: "2F9E44",
  gold: "F2B84B",
  coral: "E76F51",
  purple: "7057A3",
  white: "FFFFFF",
  bg: "F7F9FB",
  soft: "EAF1F8",
  line: "D6E4F0",
};

class Slide {
  constructor(title, accent = colors.teal) {
    this.title = title;
    this.accent = accent;
    this.elements = [];
    this.id = 2;
  }

  bg(fill = colors.bg) {
    this.rect(0, 0, W, H, fill, null);
    this.rect(0, 0, W, inch(0.18), this.accent, this.accent);
  }

  titleBlock(title, subtitle = "") {
    this.text(inch(0.55), inch(0.42), inch(12.15), inch(0.52), title, { size: 30, bold: true, color: colors.navy });
    if (subtitle) this.text(inch(0.58), inch(0.94), inch(12.0), inch(0.34), subtitle, { size: 15, color: colors.muted });
  }

  footer(label = "Smart Retail Pro | Specialized Presentation") {
    this.text(inch(0.6), inch(6.92), inch(12.1), inch(0.24), label, { size: 10, color: colors.muted, align: "center", rtl: false });
  }

  rect(x, y, w, h, fill, line = colors.line, radius = false) {
    this.elements.push(shape(this.nextId(), x, y, w, h, { fill, line, preset: radius ? "roundRect" : "rect" }));
  }

  text(x, y, w, h, value, options = {}) {
    this.elements.push(shape(this.nextId(), x, y, w, h, {
      fill: null,
      line: null,
      preset: "rect",
      text: Array.isArray(value) ? value : [value],
      textOptions: options,
    }));
  }

  cover(title, subtitle, tags = []) {
    this.rect(0, 0, W, H, colors.navy, null);
    this.rect(0, 0, W, inch(0.28), this.accent, this.accent);
    this.text(inch(0.75), inch(1.05), inch(11.8), inch(0.55), "Smart Retail Pro", { size: 22, color: "D9EAF7", align: "center", rtl: false });
    this.text(inch(0.85), inch(1.7), inch(11.55), inch(0.9), title, { size: 38, bold: true, color: colors.white, align: "center" });
    this.text(inch(1.25), inch(2.75), inch(10.75), inch(0.85), subtitle, { size: 22, color: colors.bg, align: "center" });
    tags.forEach((tag, index) => this.badge(inch(1.3 + index * 3.05), inch(4.45), inch(2.45), inch(0.58), tag));
    this.text(inch(0.8), inch(6.45), inch(11.8), inch(0.35), new Date().toLocaleDateString("ar-EG"), { size: 13, color: "D9EAF7", align: "center" });
  }

  card(x, y, w, h, title, bullets, accent = this.accent) {
    this.rect(x, y, w, h, colors.white, colors.line, true);
    this.rect(x + w - inch(0.13), y, inch(0.13), h, accent, accent);
    this.text(x + inch(0.25), y + inch(0.18), w - inch(0.55), inch(0.38), title, { size: 19, bold: true, color: accent });
    this.text(x + inch(0.25), y + inch(0.72), w - inch(0.55), h - inch(0.88), bullets.map((item) => `• ${item}`), { size: 13, color: colors.ink });
  }

  metric(x, y, w, h, label, value, accent = this.accent) {
    this.rect(x, y, w, h, colors.white, colors.line, true);
    this.text(x + inch(0.14), y + inch(0.18), w - inch(0.28), inch(0.3), label, { size: 14, color: colors.muted, align: "center" });
    this.text(x + inch(0.14), y + inch(0.62), w - inch(0.28), inch(0.46), value, { size: 23, bold: true, color: accent, align: "center", rtl: false });
  }

  badge(x, y, w, h, label) {
    this.elements.push(shape(this.nextId(), x, y, w, h, {
      fill: "153449",
      line: "4CA7A1",
      preset: "roundRect",
      text: [label],
      textOptions: { size: 14, bold: true, color: colors.white, align: "center", rtl: false },
    }));
  }

  code(x, y, w, h, value) {
    this.elements.push(shape(this.nextId(), x, y, w, h, {
      fill: "101820",
      line: "203040",
      preset: "roundRect",
      text: String(value).split("\n"),
      textOptions: { size: 10, color: "DDE7F3", align: "left", rtl: false, font: "Consolas" },
    }));
  }

  table(x, y, w, h, headers, rows, widths) {
    const rh = h / (rows.length + 1);
    let cx = x;
    headers.forEach((header, i) => {
      const cw = w * widths[i];
      this.elements.push(shape(this.nextId(), cx, y, cw, rh, {
        fill: this.accent,
        line: colors.white,
        preset: "rect",
        text: [header],
        textOptions: { size: 13, bold: true, color: colors.white, align: "center" },
      }));
      cx += cw;
    });
    rows.forEach((row, r) => {
      cx = x;
      row.forEach((cell, i) => {
        const cw = w * widths[i];
        this.elements.push(shape(this.nextId(), cx, y + rh * (r + 1), cw, rh, {
          fill: r % 2 ? "F0F5FA" : colors.white,
          line: colors.line,
          preset: "rect",
          text: [cell],
          textOptions: { size: 10.5, color: colors.ink, align: i === 0 ? "right" : "center" },
        }));
        cx += cw;
      });
    });
  }

  flow(labels, y, accentSet = [colors.coral, colors.gold, colors.teal, colors.green, colors.blue]) {
    labels.forEach((label, i) => {
      const x = inch(0.7 + i * 2.5);
      this.elements.push(shape(this.nextId(), x, y, inch(1.82), inch(0.88), {
        fill: accentSet[i % accentSet.length],
        line: accentSet[i % accentSet.length],
        preset: "roundRect",
        text: [label],
        textOptions: { size: 17, bold: true, color: colors.white, align: "center", rtl: false },
      }));
      if (i < labels.length - 1) this.arrow(x + inch(1.85), y + inch(0.44), inch(0.48), colors.muted);
    });
  }

  bar(x, y, w, h, label, value, max, accent = this.accent) {
    this.text(x, y, inch(2.0), h, label, { size: 14, bold: true, color: colors.ink });
    this.rect(x + inch(2.05), y + inch(0.1), w - inch(3.1), h - inch(0.2), "E8EEF5", null);
    this.rect(x + inch(2.05), y + inch(0.1), Math.max(inch(0.04), (w - inch(3.1)) * (value / max)), h - inch(0.2), accent, null);
    this.text(x + w - inch(0.95), y, inch(0.95), h, format(value), { size: 13, bold: true, color: accent, rtl: false, align: "left" });
  }

  arrow(x, y, w, color) {
    this.elements.push(connector(this.nextId(), x, y, w, 0, color));
  }

  nextId() {
    this.id += 1;
    return this.id;
  }

  xml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree>${groupBoilerplate()}${this.elements.join("")}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
  }
}

function standard(title, subtitle, accent) {
  const s = new Slide(title, accent);
  s.bg();
  s.titleBlock(title, subtitle);
  return s;
}

function makeDecks() {
  return [
    databaseDeck(),
    pipelineDeck(),
    uxDeck(),
    deploymentDeck(),
    pythonDeck(),
    testingDeck(),
    businessDeck(),
    defenseDeck(),
  ];
}

function databaseDeck() {
  const accent = colors.blue;
  return {
    file: "SmartRetailPro_Database_SQL.pptx",
    slides: [
      cover("شرح قاعدة البيانات وSQL", "الجداول، الـ Views، أمثلة الاستعلامات، وكيف تخدم التحليل", accent, ["SQLite", "Tables", "Views", "SQL"]),
      agenda(accent, ["نموذج البيانات", "الجداول الأساسية", "الجداول التجميعية", "الـ Views", "أمثلة SQL", "كيف تشرح قاعدة البيانات"]),
      (() => { const s = standard("نموذج البيانات", "مستودع SQLite محلي قابل للاستعلام مباشرة", accent); s.flow(["Dimensions", "Facts", "Aggregates", "Views", "Dashboard"], inch(2.4), [colors.teal, colors.blue, colors.gold, colors.green, colors.purple]); s.card(inch(1.0), inch(4.0), inch(5.3), inch(1.65), "الفكرة", ["فصل الأبعاد عن الحقائق.", "بناء تجميعات جاهزة بدل الحساب اليدوي المتكرر.", "توفير Views سهلة للإدارة والتحليل."], accent); s.card(inch(6.8), inch(4.0), inch(5.3), inch(1.65), "القيمة", ["استعلامات أسرع وأسهل.", "تسهيل ربط Dashboard.", "نموذج مناسب للشرح والتوسع."], colors.teal); s.footer(); return s; })(),
      (() => { const s = standard("الجداول الأساسية", "Dimensions وFacts", accent); s.table(inch(0.85), inch(1.45), inch(11.65), inch(4.9), ["الجدول", "النوع", "الدور"], [["dim_customer", "Dimension", "بيانات العملاء والمدينة والشريحة"], ["dim_product", "Dimension", "بيانات المنتجات والفئات والأسعار"], ["fact_sales", "Fact", "صف لكل بند طلب صالح بعد التنظيف"], ["fact_web_event", "Fact", "صف لكل حدث Web/App صالح"]], [0.27, 0.2, 0.53]); s.footer(); return s; })(),
      (() => { const s = standard("الجداول التجميعية", "Gold layer داخل SQLite", accent); s.table(inch(0.75), inch(1.35), inch(11.9), inch(5.05), ["الجدول", "الاستخدام"], [["agg_daily_sales_kpis", "KPIs يومية مثل الإيراد والطلبات ومتوسط الطلب"], ["agg_product_performance", "ترتيب المنتجات حسب الإيراد والكمية"], ["agg_city_segment_performance", "تحليل المدينة وشريحة العميل"], ["agg_channel_sales", "أداء قنوات البيع ونسبة الإيراد"], ["agg_behavior_funnel", "قمع السلوك من المشاهدة إلى الدفع"]], [0.35, 0.65]); s.footer(); return s; })(),
      (() => { const s = standard("SQL Views الجاهزة", "طبقة قراءة سهلة فوق الجداول", accent); s.code(inch(0.8), inch(1.35), inch(5.7), inch(4.7), snip("app/sql/schema.sql", 78, 120)); s.card(inch(6.8), inch(1.35), inch(5.5), inch(4.7), "متى تستخدم Views؟", ["عرض KPI للإدارة.", "أفضل المنتجات.", "مبيعات المدن والشرائح.", "صحة جودة البيانات.", "تحليل قمع السلوك."], colors.green); s.footer(); return s; })(),
      (() => { const s = standard("أمثلة SQL للعرض", "استعلامات جاهزة للشرح أو العرض المباشر", accent); s.code(inch(0.8), inch(1.45), inch(11.8), inch(2.1), "SELECT * FROM vw_retail_kpi_scorecard;\nSELECT * FROM vw_top_products LIMIT 10;\nSELECT * FROM vw_city_segment_sales LIMIT 20;\nSELECT * FROM vw_data_quality_health;"); s.card(inch(1.0), inch(4.15), inch(11.3), inch(1.25), "نقطة مهمة", ["الواجهة تمنع أوامر التعديل وتسمح باستعلامات قراءة فقط مثل SELECT/WITH/PRAGMA، وهذا يحافظ على سلامة قاعدة البيانات."], colors.teal); s.footer(); return s; })(),
      summarySlide("خلاصة قاعدة البيانات", ["SQLite جعل المشروع خفيفًا وسهل النقل.", "الجداول منظمة حسب Dimensions/Facts/Aggregates.", "الـ Views تجعل التحليل بسيطًا وواضحًا.", "الاستعلامات قابلة للتنفيذ من واجهة المشروع."], accent),
    ],
  };
}

function pipelineDeck() {
  const accent = colors.teal;
  const stages = pipeline.stages.map((stage) => [stage.stage, `${stage.duration_ms} ms`, Object.entries(stage).filter(([k]) => !["stage", "duration_ms"].includes(k)).map(([k, v]) => `${k}: ${v}`).join(" | ")]);
  return {
    file: "SmartRetailPro_Data_Pipeline_Deep_Dive.pptx",
    slides: [
      cover("شرح Data Pipeline بالتفصيل", "من البيانات الخام إلى التقارير التنفيذية", accent, ["Source", "Bronze", "Silver", "Gold"]),
      agenda(accent, ["فلسفة Medallion", "Source Generation", "Bronze Ingestion", "Silver Quality", "Gold Publishing", "Warehouse & Reports"]),
      (() => { const s = standard("فلسفة Medallion Architecture", "فصل مراحل المعالجة حسب نضج البيانات", accent); s.flow(["Source", "Bronze", "Silver", "Gold", "Warehouse"], inch(2.35)); s.card(inch(1.0), inch(4.05), inch(3.45), inch(1.55), "Bronze", ["خام كما هو.", "Manifest وHash."], colors.gold); s.card(inch(4.85), inch(4.05), inch(3.45), inch(1.55), "Silver", ["تنظيف.", "رفض غير الصالح."], colors.teal); s.card(inch(8.7), inch(4.05), inch(3.45), inch(1.55), "Gold", ["KPIs.", "تجميعات أعمال."], colors.green); s.footer(); return s; })(),
      (() => { const s = standard("Source Generation", "توليد بيانات واقعية قابلة للاختبار", accent); s.card(inch(0.8), inch(1.4), inch(4.0), inch(4.3), "ما يتم إنشاؤه", ["customers.csv", "products.csv", "sales/date=...", "events/date=...", "source_manifest.json"], colors.blue); s.code(inch(5.05), inch(1.4), inch(7.35), inch(4.3), snip("app/pipeline.mjs", 84, 128)); s.footer(); return s; })(),
      (() => { const s = standard("Bronze Ingestion", "حفظ الخام مع تتبع الملفات", accent); s.code(inch(0.8), inch(1.35), inch(6.0), inch(4.55), snip("app/pipeline.mjs", 165, 178)); s.card(inch(7.1), inch(1.35), inch(5.2), inch(4.55), "لماذا Bronze؟", ["يسمح بإعادة المعالجة.", "يحافظ على نسخة المصدر.", "يسجل SHA256 وحجم كل ملف.", "يفصل الاستيعاب عن التنظيف."], colors.gold); s.footer(); return s; })(),
      (() => { const s = standard("Silver Transformation", "تنظيف البيانات وقواعد الجودة", accent); s.card(inch(0.8), inch(1.35), inch(3.7), inch(4.65), "قواعد الجودة", ["Duplicate order line", "Missing critical field", "Invalid quantity", "Invalid amount", "Invalid reference"], colors.coral); s.code(inch(4.8), inch(1.35), inch(7.6), inch(4.65), snip("app/pipeline.mjs", 194, 248)); s.footer(); return s; })(),
      (() => { const s = standard("Gold Publishing", "تحويل البيانات النظيفة إلى مؤشرات أعمال", accent); s.metric(inch(0.85), inch(1.45), inch(2.7), inch(1.3), "Revenue", money(executive.business_kpis.total_sales_revenue), colors.green); s.metric(inch(3.75), inch(1.45), inch(2.7), inch(1.3), "Orders", format(executive.business_kpis.total_orders), colors.blue); s.metric(inch(6.65), inch(1.45), inch(2.7), inch(1.3), "Items", format(executive.business_kpis.total_items_sold), colors.gold); s.metric(inch(9.55), inch(1.45), inch(2.7), inch(1.3), "AOV", money(executive.business_kpis.average_order_value), colors.teal); s.code(inch(0.95), inch(3.35), inch(11.45), inch(2.1), snip("app/pipeline.mjs", 264, 316)); s.footer(); return s; })(),
      (() => { const s = standard("مقاييس آخر تشغيل", "كيف نثبت أن الـ Pipeline يعمل؟", accent); s.table(inch(0.55), inch(1.35), inch(12.3), inch(5.1), ["المرحلة", "المدة", "مقاييس"], stages, [0.28, 0.16, 0.56]); s.footer(); return s; })(),
      summarySlide("خلاصة Pipeline", ["كل مرحلة منفصلة وقابلة للشرح.", "هناك تتبع للمخرجات وزمن التنفيذ.", "جودة البيانات مقاسة لا مفترضة.", "المخرجات تنتقل إلى SQLite والتقارير تلقائيًا."], accent),
    ],
  };
}

function uxDeck() {
  const accent = colors.purple;
  return {
    file: "SmartRetailPro_UX_UI_Walkthrough.pptx",
    slides: [
      cover("شرح UX/UI للواجهة", "كيف صُممت الواجهة لتسهيل استخدام مشروع هندسة البيانات", accent, ["RTL", "Dashboard", "SQL", "Files"]),
      agenda(accent, ["مبادئ التصميم", "التبويبات", "رحلة المستخدم", "عرض الملفات", "قاعدة البيانات", "التقارير"]),
      (() => { const s = standard("مبادئ التصميم", "واجهة عملية وليست صفحة تسويقية", accent); s.card(inch(0.8), inch(1.45), inch(3.75), inch(3.9), "وضوح", ["قائمة جانبية ثابتة.", "أسماء تبويبات مباشرة.", "أزرار قليلة ومفهومة."], colors.blue); s.card(inch(4.8), inch(1.45), inch(3.75), inch(3.9), "وصول سريع", ["تشغيل Pipeline.", "فتح الأكواد.", "استعلام قاعدة البيانات.", "عرض التقارير."], colors.teal); s.card(inch(8.8), inch(1.45), inch(3.75), inch(3.9), "لغة المستخدم", ["واجهة عربية RTL.", "نصوص مختصرة.", "نتائج واضحة."], colors.purple); s.footer(); return s; })(),
      (() => { const s = standard("تبويبات الواجهة", "كل تبويب يمثل وظيفة أساسية", accent); s.table(inch(0.75), inch(1.35), inch(11.9), inch(5.0), ["التبويب", "الوظيفة"], [["نظرة عامة", "KPIs وخريطة المشروع والوصول السريع"], ["تشغيل المشروع", "تشغيل Pipeline ومتابعة السجل"], ["الملفات والكود", "استعراض الأكواد والبيانات"], ["قاعدة البيانات", "Tables, Views, SQL editor"], ["التقارير", "Dashboard وتقارير"], ["المساعد", "توليد SQL سريع"]], [0.3, 0.7]); s.footer(); return s; })(),
      (() => { const s = standard("رحلة المستخدم", "من فتح EXE إلى تحليل البيانات", accent); s.flow(["EXE", "Browser", "Overview", "Run", "SQL", "Reports"], inch(2.35), [colors.green, colors.blue, colors.teal, colors.gold, colors.coral, colors.purple]); s.card(inch(1.2), inch(4.0), inch(10.8), inch(1.35), "الفكرة", ["المستخدم لا يحتاج معرفة الأوامر. الواجهة تجمع التشغيل، الفحص، التحليل، والوصول للملفات في مكان واحد."], accent); s.footer(); return s; })(),
      (() => { const s = standard("كود الواجهة", "HTML + JavaScript بدون تعقيد زائد", accent); s.code(inch(0.75), inch(1.35), inch(5.8), inch(4.75), snip("app/public/index.html", 10, 35)); s.code(inch(6.85), inch(1.35), inch(5.8), inch(4.75), snip("app/public/app.js", 15, 41)); s.footer(); return s; })(),
      (() => { const s = standard("تصميم قاعدة البيانات داخل الواجهة", "استعلام آمن وسهل", accent); s.card(inch(0.8), inch(1.45), inch(4.0), inch(3.8), "المستخدم يرى", ["قائمة الجداول والـ Views.", "مربع SQL.", "نتائج في جدول.", "عدد الصفوف وزمن التنفيذ."], colors.blue); s.code(inch(5.1), inch(1.45), inch(7.3), inch(3.8), snip("app/server.mjs", 112, 134)); s.footer(); return s; })(),
      summarySlide("خلاصة UX/UI", ["الواجهة تجعل المشروع قابلًا للاستخدام لا مجرد كود.", "RTL عربي مناسب للمستخدم.", "كل مكون يمكن الوصول إليه من الشاشة.", "التصميم عملي ومناسب لأداة بيانات."], accent),
    ],
  };
}

function deploymentDeck() {
  const accent = colors.green;
  return {
    file: "SmartRetailPro_Deployment_Run_Guide.pptx",
    slides: [
      cover("شرح التشغيل والتسليم", "كيف يعمل المشروع بسهولة على Windows x64", accent, ["EXE", "Portable", "Runtime", "Localhost"]),
      agenda(accent, ["مشكلة التشغيل", "حل EXE", "Runtime المحلي", "النسخة المحمولة", "سيناريو التشغيل", "الأخطاء المتوقعة"]),
      (() => { const s = standard("المشكلة التي تم حلها", "node is not recognized", accent); s.card(inch(0.9), inch(1.5), inch(5.2), inch(3.8), "قبل الحل", ["المستخدم يحتاج Node مثبت.", "PATH قد لا يحتوي node.", "أوامر الطرفية تسبب ارتباكًا."], colors.coral); s.card(inch(6.7), inch(1.5), inch(5.2), inch(3.8), "بعد الحل", ["runtime/node.exe داخل المشروع.", "SmartRetailProject.exe يبدأ التشغيل.", "المتصفح يفتح تلقائيًا."], accent); s.footer(); return s; })(),
      (() => { const s = standard("Launcher EXE", "ماذا يفعل SmartRetailProject.exe؟", accent); s.code(inch(0.85), inch(1.35), inch(6.0), inch(4.75), snip("launcher/Program.cs", 4, 34)); s.card(inch(7.1), inch(1.35), inch(5.2), inch(4.75), "خطواته", ["يحدد baseDir.", "يبحث عن node runtime.", "يشغل server.mjs.", "ينتظر /api/overview.", "يفتح المتصفح."], accent); s.footer(); return s; })(),
      (() => { const s = standard("النسخة المحمولة", "ما الذي يجب نقله لجهاز آخر؟", accent); s.table(inch(0.9), inch(1.4), inch(11.45), inch(4.75), ["المكون", "الغرض"], [["SmartRetailProject.exe", "تشغيل المشروع"], ["runtime/node.exe", "تشغيل Node دون تثبيت خارجي"], ["app", "الكود والخادم والواجهة"], ["data/warehouse/reports/docs", "المخرجات والقاعدة والتقارير"], ["START_PROJECT.cmd", "بديل تشغيل"]], [0.35, 0.65]); s.footer(); return s; })(),
      (() => { const s = standard("سيناريو التشغيل", "ما الذي يراه المستخدم؟", accent); s.flow(["Open EXE", "Start Server", "Check API", "Open Browser", "Use GUI"], inch(2.4), [colors.green, colors.blue, colors.teal, colors.gold, colors.purple]); s.card(inch(1.0), inch(4.15), inch(11.2), inch(1.3), "ملاحظة تشغيل", ["يجب ترك نافذة التشغيل مفتوحة أثناء استخدام الواجهة؛ إغلاقها يوقف الخادم المحلي."], colors.gold); s.footer(); return s; })(),
      (() => { const s = standard("الأخطاء المتوقعة وحلولها", "رسائل سهلة للمستخدم", accent); s.table(inch(0.75), inch(1.35), inch(11.9), inch(5.0), ["المشكلة", "الحل"], [["EXE محظور", "استخدم START_PROJECT.cmd"], ["المنفذ 4173 مشغول", "أغلق التطبيق الآخر أو شغل server.mjs بمنفذ مختلف"], ["runtime مفقود", "انقل مجلد SmartRetailPro كاملًا"], ["Python غير مثبت", "ملف EXE لا يحتاج Python؛ Python فقط للنسخة الإضافية"]], [0.35, 0.65]); s.footer(); return s; })(),
      summarySlide("خلاصة التشغيل", ["طريقة التشغيل الأساسية هي EXE.", "المشروع لا يحتاج Node مثبتًا خارجيًا.", "النسخة المحمولة تحتوي كل الملفات.", "الخادم محلي وآمن على 127.0.0.1."], accent),
    ],
  };
}

function pythonDeck() {
  const accent = colors.teal;
  return {
    file: "SmartRetailPro_Python_Implementation.pptx",
    slides: [
      cover("شرح تنفيذ Python", "المنطق الأساسي للمشروع مكتوب أيضًا ببايثون", accent, ["Python", "ETL", "SQLite", "Reports"]),
      agenda(accent, ["لماذا Python؟", "هيكل الملفات", "run_pipeline", "مراحل المعالجة", "SQLite", "التشغيل والاختبار"]),
      (() => { const s = standard("لماذا أضفنا Python؟", "لتقوية المشروع تقنيًا وتعليميًا", accent); s.card(inch(0.8), inch(1.45), inch(3.7), inch(3.85), "تعليميًا", ["Python شائع في هندسة البيانات.", "سهل الشرح في المناقشة.", "يعرض فهم المنطق لا الأداة فقط."], colors.blue); s.card(inch(4.8), inch(1.45), inch(3.7), inch(3.85), "تقنيًا", ["csv/json/sqlite3 من المكتبة القياسية.", "لا يعتمد على مكتبات خارجية.", "ينفذ نفس الطبقات الأساسية."], accent); s.card(inch(8.8), inch(1.45), inch(3.7), inch(3.85), "عمليًا", ["RUN_PYTHON_PIPELINE.cmd.", "اختبار Python جاهز.", "يتطلب Python 3.10+."], colors.green); s.footer(); return s; })(),
      (() => { const s = standard("هيكل ملفات Python", "داخل app/python", accent); s.table(inch(0.9), inch(1.45), inch(11.45), inch(4.6), ["الملف", "الدور"], [["smart_retail_pipeline.py", "تنفيذ Pipeline كامل"], ["test_python_pipeline.py", "اختبار تشغيل نسخة Python"], ["__init__.py", "تعريف المجلد كحزمة Python"], ["RUN_PYTHON_PIPELINE.cmd", "تشغيل مباشر من Windows"], ["README_PYTHON_AR.md", "شرح عربي لطريقة الاستخدام"]], [0.36, 0.64]); s.footer(); return s; })(),
      (() => { const s = standard("الدالة الرئيسية run_pipeline", "تنظم كل مراحل المعالجة", accent); s.code(inch(0.75), inch(1.3), inch(12.0), inch(4.85), snip("app/python/smart_retail_pipeline.py", 71, 111)); s.footer(); return s; })(),
      (() => { const s = standard("مراحل Python", "مطابقة للمراحل الأساسية في المشروع", accent); s.flow(["Source", "Bronze", "Silver", "Gold", "SQLite", "Reports"], inch(2.3)); s.card(inch(1.0), inch(4.1), inch(5.25), inch(1.4), "المخرجات", ["CSV, JSONL, JSON, SQLite, HTML Dashboard"], colors.blue); s.card(inch(6.9), inch(4.1), inch(5.25), inch(1.4), "القواعد", ["رفض التكرار، القيم الخاطئة، المراجع غير الموجودة، الحقول الحرجة الفارغة."], colors.coral); s.footer(); return s; })(),
      (() => { const s = standard("SQLite في Python", "استخدام sqlite3 من المكتبة القياسية", accent); s.code(inch(0.8), inch(1.35), inch(11.85), inch(4.75), snip("app/python/smart_retail_pipeline.py", 487, 512)); s.footer(); return s; })(),
      (() => { const s = standard("تشغيل واختبار Python", "الأوامر الجاهزة", accent); s.code(inch(0.9), inch(1.6), inch(11.5), inch(1.55), "RUN_PYTHON_PIPELINE.cmd\npy -3 app\\python\\smart_retail_pipeline.py run --days 14 --customers 160 --products 50\nRUN_PYTHON_TESTS.cmd"); s.card(inch(1.0), inch(4.0), inch(11.2), inch(1.45), "ملاحظة مهمة", ["الجهاز الحالي لا يحتوي Python مثبتًا فعليًا، لذلك كود Python جاهز لكنه يحتاج تثبيت Python 3.10+ لتشغيله. تشغيل المشروع الأساسي لا يتطلب Python."], colors.gold); s.footer(); return s; })(),
      summarySlide("خلاصة Python", ["نسخة Python تنفذ المنطق الأساسي.", "تستخدم مكتبات قياسية فقط.", "تجعل المشروع أقوى في الشرح والمناقشة.", "ملف EXE يظل الطريقة الأسهل للمستخدم النهائي."], accent),
    ],
  };
}

function testingDeck() {
  const accent = colors.coral;
  const q = quality.sales_quality;
  return {
    file: "SmartRetailPro_Testing_QA.pptx",
    slides: [
      cover("شرح Testing & QA", "اختبارات الكود وجودة البيانات والتحقق من التشغيل", accent, ["Tests", "QA", "Data Quality", "Validation"]),
      agenda(accent, ["أنواع الاختبارات", "اختبارات Node", "اختبارات Python", "جودة البيانات", "سلامة SQL", "مخاطر وحلول"]),
      (() => { const s = standard("أنواع الاختبارات في المشروع", "الكود + البيانات + التشغيل", accent); s.card(inch(0.8), inch(1.45), inch(3.7), inch(3.8), "Code Tests", ["parseCsv", "runPipeline", "وجود SQLite", "وجود التقارير"], colors.blue); s.card(inch(4.8), inch(1.45), inch(3.7), inch(3.8), "Data QA", ["Retention rate", "Duplicate rate", "Invalid amount", "Rejected rows"], accent); s.card(inch(8.8), inch(1.45), inch(3.7), inch(3.8), "Runtime QA", ["EXE يعمل", "API يستجيب", "واجهة تفتح", "ملفات موجودة"], colors.green); s.footer(); return s; })(),
      (() => { const s = standard("اختبارات Node", "app/tests.mjs", accent); s.code(inch(0.8), inch(1.4), inch(6.0), inch(4.55), snip("app/tests.mjs", 1, 13)); s.card(inch(7.1), inch(1.4), inch(5.2), inch(4.55), "النتيجة", ["All Smart Retail Pro checks passed.", "تم تشغيل Pipeline الرئيسي بعد الإضافات.", "تم التحقق من SQLite Views."], colors.green); s.footer(); return s; })(),
      (() => { const s = standard("جودة البيانات", "مقاييس فعلية من آخر تشغيل", accent); const max = q.before; s.bar(inch(1.0), inch(1.65), inch(10.8), inch(0.52), "Before", q.before, max, accent); s.bar(inch(1.0), inch(2.55), inch(10.8), inch(0.52), "After", q.after, max, colors.green); s.bar(inch(1.0), inch(3.45), inch(10.8), inch(0.52), "Rejected", q.rejected, max, colors.gold); s.metric(inch(1.0), inch(4.7), inch(3.1), inch(1.1), "Retention", `${(q.retention_rate * 100).toFixed(2)}%`, colors.green); s.metric(inch(4.9), inch(4.7), inch(3.1), inch(1.1), "Duplicate", `${(q.duplicate_rate * 100).toFixed(2)}%`, colors.blue); s.metric(inch(8.8), inch(4.7), inch(3.1), inch(1.1), "Invalid Amount", `${(q.invalid_amount_rate * 100).toFixed(2)}%`, accent); s.footer(); return s; })(),
      (() => { const s = standard("سلامة الاستعلامات", "Read-only SQL", accent); s.code(inch(0.8), inch(1.35), inch(6.0), inch(4.6), snip("app/server.mjs", 124, 135)); s.card(inch(7.1), inch(1.35), inch(5.2), inch(4.6), "سبب الحماية", ["منع INSERT/UPDATE/DELETE من الواجهة.", "منع تنفيذ أكثر من استعلام في نفس الطلب.", "حماية قاعدة البيانات من التعديل غير المقصود."], colors.blue); s.footer(); return s; })(),
      (() => { const s = standard("سلامة الملفات والمسارات", "حماية الوصول داخل المشروع", accent); s.code(inch(0.8), inch(1.35), inch(6.0), inch(4.6), snip("app/server.mjs", 193, 200)); s.card(inch(7.1), inch(1.35), inch(5.2), inch(4.6), "ما الذي تمنعه؟", ["الخروج خارج مجلد المشروع.", "فتح ملفات غير مصرح بها.", "تصفح جذور غير معرفة في الواجهة."], colors.teal); s.footer(); return s; })(),
      (() => { const s = standard("مخاطر وحلول", "كيف ترد في المناقشة؟", accent); s.table(inch(0.8), inch(1.4), inch(11.8), inch(4.9), ["الخطر", "الحل داخل المشروع"], [["عدم وجود Node", "Runtime محلي داخل runtime/node.exe"], ["عدم وجود Python", "Python اختياري؛ EXE لا يحتاجه"], ["بيانات غير نظيفة", "Silver rejects + quality report"], ["استعلامات خطرة", "Read-only SQL validation"], ["نقل ناقص للملفات", "Portable zip يحتوي المجلد كاملًا"]], [0.36, 0.64]); s.footer(); return s; })(),
      summarySlide("خلاصة الاختبارات والجودة", ["الاختبارات تغطي تشغيل Pipeline الأساسي.", "جودة البيانات لها أرقام وتقارير.", "الواجهة تحمي SQL والملفات.", "المخاطر معروفة ولها حلول واضحة."], accent),
    ],
  };
}

function businessDeck() {
  const accent = colors.green;
  const k = executive.business_kpis;
  return {
    file: "SmartRetailPro_Business_Value.pptx",
    slides: [
      cover("القيمة التجارية للمشروع", "كيف يحول المشروع البيانات إلى قرارات أعمال", accent, ["KPIs", "Retail", "Insights", "Dashboard"]),
      agenda(accent, ["سؤال العمل", "KPIs", "أفضل المنتجات", "القنوات", "المدن والشرائح", "قيمة المشروع"]),
      (() => { const s = standard("سؤال العمل", "ما الذي تريد الإدارة معرفته؟", accent); s.card(inch(0.85), inch(1.45), inch(3.7), inch(3.8), "المبيعات", ["كم الإيراد؟", "كم عدد الطلبات؟", "ما متوسط الطلب؟"], colors.blue); s.card(inch(4.85), inch(1.45), inch(3.7), inch(3.8), "المنتجات", ["ما الأفضل؟", "ما الأكثر بيعًا؟", "أي فئة تحقق قيمة؟"], accent); s.card(inch(8.85), inch(1.45), inch(3.7), inch(3.8), "العملاء", ["أي مدينة أقوى؟", "أي شريحة أفضل؟", "أي قناة تكسب؟"], colors.teal); s.footer(); return s; })(),
      (() => { const s = standard("مؤشرات الأداء", "KPIs من آخر تشغيل", accent); s.metric(inch(0.8), inch(1.55), inch(2.8), inch(1.55), "Revenue", money(k.total_sales_revenue), accent); s.metric(inch(3.75), inch(1.55), inch(2.8), inch(1.55), "Orders", format(k.total_orders), colors.blue); s.metric(inch(6.7), inch(1.55), inch(2.8), inch(1.55), "Items", format(k.total_items_sold), colors.gold); s.metric(inch(9.65), inch(1.55), inch(2.8), inch(1.55), "AOV", money(k.average_order_value), colors.teal); s.card(inch(1.0), inch(4.0), inch(11.25), inch(1.35), "ماذا تعني هذه الأرقام؟", ["توفر الإدارة صورة فورية عن حجم المبيعات وعدد الطلبات ومتوسط قيمة الطلب دون فتح ملفات CSV أو كتابة كود."], accent); s.footer(); return s; })(),
      (() => { const s = standard("أفضل المنتجات", "Product Performance", accent); const top = executive.leaders.top_product; s.card(inch(0.9), inch(1.5), inch(5.0), inch(3.8), "Top Product", [top.product_name, `Revenue: ${money(top.total_sales_revenue)}`, `Orders: ${format(top.total_orders)}`, `Items: ${format(top.total_items_sold)}`], accent); s.card(inch(6.5), inch(1.5), inch(5.0), inch(3.8), "قيمة التحليل", ["تحديد المنتجات التي تستحق حملات تسويقية.", "دعم قرارات المخزون.", "فهم الفئات الأقوى."], colors.blue); s.footer(); return s; })(),
      (() => { const s = standard("قنوات البيع", "Channel Performance", accent); const channel = executive.leaders.top_channel; s.card(inch(0.9), inch(1.5), inch(5.0), inch(3.8), "أفضل قناة", [channel.sales_channel, `Revenue: ${money(channel.total_sales_revenue)}`, `Share: ${(channel.revenue_share * 100).toFixed(1)}%`], colors.teal); s.card(inch(6.5), inch(1.5), inch(5.0), inch(3.8), "قرارات ممكنة", ["توجيه الميزانية للقنوات الأقوى.", "تحسين القنوات الضعيفة.", "قياس أثر التطبيق والموقع والمتجر."], accent); s.footer(); return s; })(),
      (() => { const s = standard("المدن والشرائح", "City / Segment Analysis", accent); const seg = executive.leaders.top_city_segment; s.card(inch(0.9), inch(1.5), inch(5.0), inch(3.8), "أفضل مدينة/شريحة", [`${seg.city} / ${seg.segment}`, `Revenue: ${money(seg.total_sales_revenue)}`, `AOV: ${money(seg.average_order_value)}`], colors.blue); s.card(inch(6.5), inch(1.5), inch(5.0), inch(3.8), "القيمة", ["تخصيص العروض حسب المدينة.", "فهم شرائح العملاء.", "تحسين قرارات التسويق الجغرافي."], accent); s.footer(); return s; })(),
      (() => { const s = standard("من البيانات إلى القرار", "قيمة هندسة البيانات للأعمال", accent); s.flow(["Raw Data", "Clean Data", "KPIs", "Insights", "Decisions"], inch(2.35), [colors.coral, colors.teal, colors.green, colors.blue, colors.gold]); s.card(inch(1.0), inch(4.05), inch(11.2), inch(1.35), "الخلاصة", ["قيمة المشروع ليست في تخزين البيانات فقط، بل في تحويلها إلى مؤشرات يمكن اتخاذ قرار بناءً عليها."], accent); s.footer(); return s; })(),
      summarySlide("خلاصة القيمة التجارية", ["Dashboard يعطي نظرة إدارية سريعة.", "KPIs قابلة للقياس والتحديث.", "التحليل يدعم المنتج والقناة والعميل.", "المشروع يربط التقنية بنتائج الأعمال."], accent),
    ],
  };
}

function defenseDeck() {
  const accent = colors.gold;
  return {
    file: "SmartRetailPro_Project_Defense_QA.pptx",
    slides: [
      cover("عرض المناقشة والدفاع عن المشروع", "إجابات منظمة للأسئلة المتوقعة في التقييم", accent, ["Q&A", "Defense", "Architecture", "Decisions"]),
      agenda(accent, ["ملخص سريع", "لماذا هذه التقنيات؟", "لماذا Medallion؟", "كيف تضمن الجودة؟", "كيف يعمل EXE؟", "أسئلة متوقعة"]),
      (() => { const s = standard("ملخص المشروع في دقيقة", "الإجابة الافتتاحية المقترحة", accent); s.card(inch(1.0), inch(1.55), inch(11.2), inch(3.6), "صياغة مختصرة", ["المشروع عبارة عن منصة هندسة بيانات للتجزئة تعمل محليًا. تولد بيانات خام، تمررها عبر Source وBronze وSilver وGold، تنظفها وتقيس جودتها، ثم تحملها في SQLite وتعرضها من واجهة رسومية مع تقارير وDashboard وتشغيل مباشر بملف EXE."], colors.blue); s.footer(); return s; })(),
      (() => { const s = standard("لماذا هذه التقنيات؟", "قرارات تصميم قابلة للدفاع", accent); s.table(inch(0.75), inch(1.35), inch(11.9), inch(5.0), ["التقنية", "سبب الاختيار"], [["Node.js", "Runtime مرفق وتشغيل واجهة وخادم محلي بسهولة"], ["SQLite", "خفيف، محلي، مناسب للتسليم والتحليل"], ["Python", "إضافة واضحة للمنطق الأساسي بلغة شائعة في البيانات"], ["HTML/CSS/JS", "واجهة خفيفة لا تحتاج Framework خارجي"], [".NET EXE", "تجربة تشغيل سهلة للمستخدم النهائي"]], [0.27, 0.73]); s.footer(); return s; })(),
      (() => { const s = standard("لماذا Medallion؟", "فصل البيانات حسب درجة النضج", accent); s.flow(["Source", "Bronze", "Silver", "Gold", "Warehouse"], inch(2.3), [colors.coral, colors.gold, colors.teal, colors.green, colors.blue]); s.card(inch(1.0), inch(4.0), inch(11.2), inch(1.35), "الإجابة", ["لأنها تجعل البيانات الخام محفوظة، والتنظيف منفصلًا، والمؤشرات النهائية واضحة، مما يسهل التتبع وإعادة المعالجة والشرح."], accent); s.footer(); return s; })(),
      (() => { const s = standard("كيف تضمن جودة البيانات؟", "قواعد وقياسات لا وعود عامة", accent); const q = quality.sales_quality; s.metric(inch(0.8), inch(1.5), inch(3.0), inch(1.3), "Before", format(q.before), colors.coral); s.metric(inch(4.0), inch(1.5), inch(3.0), inch(1.3), "After", format(q.after), colors.green); s.metric(inch(7.2), inch(1.5), inch(3.0), inch(1.3), "Rejected", format(q.rejected), colors.gold); s.metric(inch(10.4), inch(1.5), inch(2.1), inch(1.3), "Retention", `${(q.retention_rate * 100).toFixed(1)}%`, colors.teal); s.card(inch(1.0), inch(3.7), inch(11.2), inch(1.65), "قواعد الجودة", ["تكرار، حقول حرجة فارغة، كمية غير صالحة، مبلغ غير صالح، مراجع عملاء/منتجات غير موجودة."], colors.blue); s.footer(); return s; })(),
      (() => { const s = standard("كيف يعمل ملف EXE؟", "رد واضح على سؤال التشغيل", accent); s.card(inch(0.8), inch(1.4), inch(4.0), inch(4.3), "الخطوات", ["يبحث عن runtime/node.exe.", "يشغل app/server.mjs.", "ينتظر API.", "يفتح المتصفح."], colors.green); s.code(inch(5.1), inch(1.4), inch(7.3), inch(4.3), snip("launcher/Program.cs", 30, 60)); s.footer(); return s; })(),
      (() => { const s = standard("أسئلة متوقعة وإجابات", "للاستخدام أثناء المناقشة", accent); s.table(inch(0.65), inch(1.25), inch(12.1), inch(5.35), ["السؤال", "الإجابة المختصرة"], [["هل المشروع Python؟", "المنطق الأساسي مضاف بـ Python، والتشغيل الكامل يستخدم Node Runtime مرفق."], ["لماذا SQLite؟", "لأنه محلي وخفيف وسهل النقل ومناسب لمشروع قابل للتشغيل بملف واحد."], ["هل يعمل دون Node؟", "نعم، لأن node.exe مرفق داخل runtime."], ["كيف تحمي SQL؟", "الواجهة تقبل SELECT/WITH/PRAGMA فقط."], ["هل البيانات حقيقية؟", "بيانات مولدة واقعيًا لمحاكاة retail مع أخطاء جودة مقصودة."]], [0.38, 0.62]); s.footer(); return s; })(),
      (() => { const s = standard("نقاط القوة", "ما الذي يجب التأكيد عليه؟", accent); s.card(inch(0.8), inch(1.45), inch(3.7), inch(3.9), "اكتمال", ["بيانات، Pipeline، SQLite، واجهة، تقارير، EXE."], colors.green); s.card(inch(4.8), inch(1.45), inch(3.7), inch(3.9), "قابلية الشرح", ["عروض، تقرير Word، عرض أكواد، Q&A."], colors.blue); s.card(inch(8.8), inch(1.45), inch(3.7), inch(3.9), "احترافية", ["UX، اختبارات، تشغيل محمول، Python."], accent); s.footer(); return s; })(),
      summarySlide("خلاصة الدفاع", ["اشرح المشروع كتدفق بيانات لا كملفات متفرقة.", "اربط كل تقنية بسبب عملي.", "استخدم أرقام الجودة والـ KPIs في الإجابة.", "أكد أن التشغيل المباشر حل مشكلة البيئة."], accent),
    ],
  };
}

function agenda(accent, items) {
  const s = standard("محتويات العرض", "المحاور التي سيتم شرحها", accent);
  items.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    s.card(inch(0.95 + col * 5.95), inch(1.55 + row * 1.45), inch(5.35), inch(1.05), `${i + 1}. ${item}`, ["محور أساسي في العرض"], [colors.blue, colors.teal, colors.gold, colors.green, colors.coral, colors.purple][i % 6]);
  });
  s.footer();
  return s;
}

function cover(title, subtitle, accent, tags) {
  const s = new Slide(title, accent);
  s.cover(title, subtitle, tags);
  return s;
}

function summarySlide(title, bullets, accent) {
  const s = standard(title, "النقاط الأساسية التي يجب تذكرها", accent);
  s.card(inch(1.15), inch(1.55), inch(10.95), inch(4.35), "الخلاصة", bullets, accent);
  s.footer();
  return s;
}

function snip(relative, start, end) {
  const lines = fs.readFileSync(path.join(rootDir, relative), "utf8").split(/\r?\n/);
  return lines.slice(start - 1, end).map((line, i) => `${String(start + i).padStart(3, " ")} | ${line}`).join("\n");
}

function shape(id, x, y, w, h, options) {
  const fill = options.fill ? `<a:solidFill><a:srgbClr val="${options.fill}"/></a:solidFill>` : "<a:noFill/>";
  const line = options.line ? `<a:ln w="9525"><a:solidFill><a:srgbClr val="${options.line}"/></a:solidFill></a:ln>` : "<a:ln><a:noFill/></a:ln>";
  const text = options.text ? txBody(options.text, options.textOptions || {}) : "";
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Shape ${id}"/><p:cNvSpPr${options.text ? ' txBox="1"' : ""}/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${Math.round(x)}" y="${Math.round(y)}"/><a:ext cx="${Math.round(w)}" cy="${Math.round(h)}"/></a:xfrm><a:prstGeom prst="${options.preset || "rect"}"><a:avLst/></a:prstGeom>${fill}${line}</p:spPr>${text}</p:sp>`;
}

function connector(id, x, y, w, h, color) {
  return `<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="${id}" name="Arrow ${id}"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm><a:off x="${Math.round(x)}" y="${Math.round(y)}"/><a:ext cx="${Math.round(w)}" cy="${Math.round(h)}"/></a:xfrm><a:prstGeom prst="straightConnector1"><a:avLst/></a:prstGeom><a:ln w="25400"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:headEnd type="triangle"/></a:ln></p:spPr></p:cxnSp>`;
}

function txBody(lines, options) {
  const size = options.size || 13;
  const color = options.color || colors.ink;
  const bold = options.bold ? ' b="1"' : "";
  const align = { center: "ctr", left: "l", right: "r" }[options.align || "right"];
  const rtl = options.rtl === false ? "" : ' rtl="1"';
  const font = options.font || "Arial";
  return `<p:txBody><a:bodyPr rtlCol="${options.rtl === false ? "0" : "1"}" anchor="mid" wrap="square"><a:normAutofit/></a:bodyPr><a:lstStyle/>${lines.map((line) => `<a:p><a:pPr algn="${align}"${rtl}/><a:r><a:rPr lang="${options.rtl === false ? "en-US" : "ar-EG"}" sz="${Math.round(size * 100)}"${bold}><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="${font}"/><a:ea typeface="${font}"/><a:cs typeface="${font}"/></a:rPr><a:t>${escapeXml(String(line))}</a:t></a:r></a:p>`).join("")}</p:txBody>`;
}

function groupBoilerplate() {
  return `<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>`;
}

function buildPackage(slides) {
  const files = {
    "[Content_Types].xml": contentTypesXml(slides.length),
    "_rels/.rels": rootRelsXml(),
    "docProps/core.xml": coreXml(),
    "docProps/app.xml": appXml(slides.length),
    "ppt/presentation.xml": presentationXml(slides.length),
    "ppt/_rels/presentation.xml.rels": presentationRelsXml(slides.length),
    "ppt/slideMasters/slideMaster1.xml": slideMasterXml(),
    "ppt/slideMasters/_rels/slideMaster1.xml.rels": slideMasterRelsXml(),
    "ppt/slideLayouts/slideLayout1.xml": slideLayoutXml(),
    "ppt/slideLayouts/_rels/slideLayout1.xml.rels": slideLayoutRelsXml(),
    "ppt/theme/theme1.xml": themeXml(),
  };
  slides.forEach((slide, i) => {
    files[`ppt/slides/slide${i + 1}.xml`] = slide.xml();
    files[`ppt/slides/_rels/slide${i + 1}.xml.rels`] = slideRelsXml();
  });
  return files;
}

function contentTypesXml(count) {
  const overrides = Array.from({ length: count }, (_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${overrides}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`;
}

function rootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`;
}

function presentationXml(count) {
  const ids = Array.from({ length: count }, (_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${ids}</p:sldIdLst><p:sldSz cx="${W}" cy="${H}" type="wide"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`;
}

function presentationRelsXml(count) {
  const slides = Array.from({ length: count }, (_, i) => `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>${slides}</Relationships>`;
}

function slideMasterXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree>${groupBoilerplate()}</p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`;
}

function slideMasterRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`;
}

function slideLayoutXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>${groupBoilerplate()}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;
}

function slideLayoutRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`;
}

function slideRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`;
}

function themeXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Smart Retail Specialized"><a:themeElements><a:clrScheme name="SmartRetail"><a:dk1><a:srgbClr val="${colors.navy}"/></a:dk1><a:lt1><a:srgbClr val="${colors.white}"/></a:lt1><a:dk2><a:srgbClr val="${colors.ink}"/></a:dk2><a:lt2><a:srgbClr val="${colors.bg}"/></a:lt2><a:accent1><a:srgbClr val="${colors.blue}"/></a:accent1><a:accent2><a:srgbClr val="${colors.teal}"/></a:accent2><a:accent3><a:srgbClr val="${colors.gold}"/></a:accent3><a:accent4><a:srgbClr val="${colors.green}"/></a:accent4><a:accent5><a:srgbClr val="${colors.coral}"/></a:accent5><a:accent6><a:srgbClr val="${colors.purple}"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme><a:fontScheme name="SmartRetail"><a:majFont><a:latin typeface="Arial"/><a:ea typeface="Arial"/><a:cs typeface="Arial"/></a:majFont><a:minFont><a:latin typeface="Arial"/><a:ea typeface="Arial"/><a:cs typeface="Arial"/></a:minFont></a:fontScheme><a:fmtScheme name="SmartRetail"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="25400"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="38100"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>`;
}

function coreXml() {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Smart Retail Pro Specialized Presentation</dc:title><dc:creator>Codex</dc:creator><dc:description>Specialized PowerPoint deck for Smart Retail Pro.</dc:description><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`;
}

function appXml(slideCount) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Smart Retail Pro Specialized Presentation Generator</Application><PresentationFormat>Widescreen</PresentationFormat><Slides>${slideCount}</Slides></Properties>`;
}

function escapeXml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function money(value) {
  return `$${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function format(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function createZip(entries) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const now = dosDateTime(new Date());
  for (const [name, data] of Object.entries(entries)) {
    const nameBuf = Buffer.from(name, "utf8");
    const dataBuf = Buffer.from(data, "utf8");
    const crc = crc32(dataBuf);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(10, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(now.time, 10);
    local.writeUInt16LE(now.date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(dataBuf.length, 18);
    local.writeUInt32LE(dataBuf.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    chunks.push(local, nameBuf, dataBuf);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(10, 6);
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(0, 10);
    dir.writeUInt16LE(now.time, 12);
    dir.writeUInt16LE(now.date, 14);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(dataBuf.length, 20);
    dir.writeUInt32LE(dataBuf.length, 24);
    dir.writeUInt16LE(nameBuf.length, 28);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, nameBuf);
    offset += local.length + nameBuf.length + dataBuf.length;
  }
  const centralOffset = offset;
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(entries).length, 8);
  end.writeUInt16LE(Object.keys(entries).length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(centralOffset, 16);
  return Buffer.concat([...chunks, centralBuf, end]);
}

function dosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  return { time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2), date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate() };
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) crc = (crc >>> 8) ^ crcTable[(crc ^ buffer[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  return c >>> 0;
});

fs.mkdirSync(docsDir, { recursive: true });
const decks = makeDecks();
for (const deck of decks) {
  fs.writeFileSync(path.join(docsDir, deck.file), createZip(buildPackage(deck.slides)));
  console.log(path.join(docsDir, deck.file));
}

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.join(rootDir, "docs");
const codeMode = process.argv.includes("--code");
const outputFile = path.join(docsDir, codeMode ? "SmartRetailPro_Code_Walkthrough.pptx" : "SmartRetailPro_Presentation.pptx");

const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(rootDir, relative), "utf8"));
const executive = readJson("reports/executive_summary.json");
const quality = readJson("reports/data_quality_report.json");
const pipeline = readJson("reports/pipeline_summary.json");

const W = 12192000;
const H = 6858000;
const EMU = 914400;
const inch = (value) => Math.round(value * EMU);

const palette = {
  navy: "0B1F33",
  blue: "1F4E79",
  teal: "1B998B",
  green: "2F9E44",
  gold: "F2B84B",
  coral: "E76F51",
  offWhite: "F7F9FB",
  light: "EAF1F8",
  mid: "D9EAF7",
  text: "17202A",
  muted: "64748B",
  white: "FFFFFF",
};

function writePresentation() {
  const slides = codeMode ? codeWalkthroughSlides() : [
      coverSlide(),
      problemSlide(),
      objectivesSlide(),
      architectureSlide(),
      pipelineSlide(),
      databaseSlide(),
      uiSlide(),
      resultsSlide(),
      qualitySlide(),
      pythonSlide(),
      operationsSlide(),
      testingSlide(),
      deliverablesSlide(),
      closingSlide(),
    ];

  fs.mkdirSync(docsDir, { recursive: true });
  const files = buildPackage(slides);
  fs.writeFileSync(outputFile, createZip(files));
  console.log(outputFile);
}

function coverSlide() {
  const s = new Slide("Smart Retail Pro");
  s.background(palette.navy);
  s.rect(inch(0), inch(0), W, inch(0.28), palette.teal);
  s.text(inch(0.7), inch(0.85), inch(12), inch(0.55), "عرض تقديمي احترافي", { size: 24, color: palette.mid, align: "center" });
  s.text(inch(0.65), inch(1.45), inch(12), inch(0.9), "Smart Retail Pro", { size: 48, bold: true, color: palette.white, align: "center", rtl: false });
  s.text(inch(1.1), inch(2.42), inch(11.1), inch(0.85), "منصة هندسة بيانات للتجزئة مع واجهة رسومية، مستودع SQLite، تقارير تنفيذية، وتشغيل مباشر بملف EXE", { size: 23, color: palette.offWhite, align: "center" });
  s.badge(inch(1.35), inch(4.1), inch(2.35), inch(0.55), "Data Engineering");
  s.badge(inch(3.95), inch(4.1), inch(2.35), inch(0.55), "Medallion Pipeline");
  s.badge(inch(6.55), inch(4.1), inch(2.35), inch(0.55), "SQLite Warehouse");
  s.badge(inch(9.15), inch(4.1), inch(2.35), inch(0.55), "Windows EXE");
  s.text(inch(0.75), inch(6.55), inch(11.85), inch(0.35), `تاريخ العرض: ${new Date().toLocaleDateString("ar-EG")}`, { size: 13, color: palette.mid, align: "center" });
  return s;
}

function problemSlide() {
  const s = standardSlide("فكرة المشروع والقيمة العملية", "تحويل بيانات التجزئة الخام إلى قرارات قابلة للقياس");
  s.card(inch(0.75), inch(1.7), inch(3.8), inch(3.7), "المشكلة", [
    "بيانات المبيعات والعملاء والأحداث تكون متفرقة وغير جاهزة للتحليل.",
    "الأخطاء والتكرارات تقلل الثقة في التقارير.",
    "تشغيل المشاريع التقنية يدويًا يسبب مشاكل على أجهزة مختلفة."
  ], palette.coral);
  s.card(inch(4.75), inch(1.7), inch(3.8), inch(3.7), "الحل", [
    "خط بيانات كامل من Source إلى Gold.",
    "مستودع SQLite محلي مع Views تحليلية.",
    "واجهة رسومية للوصول إلى التشغيل والأكواد والتقارير."
  ], palette.teal);
  s.card(inch(8.75), inch(1.7), inch(3.8), inch(3.7), "القيمة", [
    "تشغيل أسهل بملف EXE.",
    "تقارير تنفيذية ولوحة Dashboard.",
    "مشروع قابل للشرح والتطوير والتسليم."
  ], palette.blue);
  s.footer();
  return s;
}

function objectivesSlide() {
  const s = standardSlide("أهداف المشروع", "ما الذي يثبته المشروع هندسيًا وعمليًا؟");
  const items = [
    ["بناء Pipeline كامل", "Source, Bronze, Silver, Gold"],
    ["تطبيق جودة البيانات", "رفض الصفوف غير الصالحة وقياس معدلات الأخطاء"],
    ["إنشاء مستودع بيانات", "SQLite Tables + SQL Views"],
    ["واجهة سهلة الاستخدام", "تشغيل، تصفح ملفات، SQL، تقارير"],
    ["تشغيل مستقل", "Runtime مرفق وملف EXE"],
    ["توسيع بلغة Python", "منطق أساسي مضاف داخل app/python"]
  ];
  items.forEach(([title, body], index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    s.iconCard(inch(0.9 + col * 6.1), inch(1.55 + row * 1.55), inch(5.55), inch(1.16), title, body, [palette.teal, palette.gold, palette.blue, palette.green, palette.coral, palette.navy][index]);
  });
  s.footer();
  return s;
}

function architectureSlide() {
  const s = standardSlide("معمارية النظام", "بنية واضحة تفصل البيانات، المعالجة، التخزين، والواجهة");
  const labels = ["Source", "Bronze", "Silver", "Gold", "SQLite", "GUI"];
  const colors = [palette.coral, palette.gold, palette.teal, palette.green, palette.blue, palette.navy];
  labels.forEach((label, index) => {
    const x = inch(0.6 + index * 2.08);
    s.roundBox(x, inch(2.1), inch(1.55), inch(1.0), label, colors[index], palette.white, 22, false);
    if (index < labels.length - 1) s.arrow(x + inch(1.55), inch(2.6), inch(0.48), palette.muted);
  });
  s.text(inch(0.8), inch(4.0), inch(11.6), inch(0.55), "التدفق يبدأ من بيانات خام واقعية، ثم طبقات تنظيف وتجميع، ثم مستودع بيانات وتحليل من واجهة محلية.", { size: 22, color: palette.text, align: "center" });
  s.rect(inch(1.0), inch(5.0), inch(11.3), inch(0.8), palette.light, "D6E4F0");
  s.text(inch(1.25), inch(5.15), inch(10.8), inch(0.42), "كل مكون محفوظ داخل مجلد المشروع ويمكن الوصول إليه من تبويب الملفات والكود داخل الواجهة.", { size: 18, color: palette.blue, align: "center" });
  s.footer();
  return s;
}

function pipelineSlide() {
  const s = standardSlide("خط البيانات Data Pipeline", "ست مراحل مترابطة من الإنشاء إلى التقارير");
  const rows = pipeline.stages.map((stage) => [
    stage.stage,
    `${stage.duration_ms} ms`,
    Object.entries(stage).filter(([key]) => !["stage", "duration_ms"].includes(key)).map(([key, value]) => `${key}: ${value}`).join(" | ")
  ]);
  s.table(inch(0.6), inch(1.35), inch(12.15), inch(4.95), ["المرحلة", "المدة", "مقاييس"], rows, [0.27, 0.16, 0.57]);
  s.footer();
  return s;
}

function databaseSlide() {
  const s = standardSlide("نموذج قاعدة البيانات", "SQLite Warehouse جاهز للاستعلام والتحليل");
  const objects = [
    ["Dimensions", "dim_customer, dim_product", palette.teal],
    ["Facts", "fact_sales, fact_web_event", palette.blue],
    ["Aggregates", "daily, product, city, channel, funnel", palette.gold],
    ["Views", "KPI, top products, quality, funnel", palette.green],
  ];
  objects.forEach(([title, body, color], index) => {
    s.card(inch(0.8 + index * 3.05), inch(1.5), inch(2.7), inch(2.4), title, [body], color);
  });
  s.text(inch(0.9), inch(4.55), inch(11.6), inch(0.45), "أمثلة Views جاهزة:", { size: 20, color: palette.blue, bold: true });
  s.code(inch(0.9), inch(5.0), inch(11.6), inch(0.95), "SELECT * FROM vw_retail_kpi_scorecard;\nSELECT * FROM vw_top_products LIMIT 10;\nSELECT * FROM vw_data_quality_health;");
  s.footer();
  return s;
}

function uiSlide() {
  const s = standardSlide("الواجهة وتجربة الاستخدام UX/UI", "كل مكونات المشروع من شاشة واحدة");
  const tabs = [
    ["نظرة عامة", "KPIs وخريطة المشروع"],
    ["تشغيل المشروع", "تشغيل Pipeline ومتابعة السجل"],
    ["الملفات والكود", "فتح الأكواد والبيانات"],
    ["قاعدة البيانات", "Tables, Views, SQL"],
    ["التقارير", "Dashboard وملخصات"],
    ["المساعد", "توليد SQL سريع"]
  ];
  tabs.forEach(([title, body], index) => {
    const x = inch(0.75 + (index % 3) * 4.1);
    const y = inch(1.55 + Math.floor(index / 3) * 1.75);
    s.iconCard(x, y, inch(3.55), inch(1.25), title, body, [palette.blue, palette.teal, palette.gold, palette.green, palette.coral, palette.navy][index]);
  });
  s.text(inch(1.0), inch(5.45), inch(11.3), inch(0.55), "التصميم عربي RTL، بسيط، مباشر، ومناسب لمستخدم يريد تشغيل المشروع وفهم مكوناته دون أوامر معقدة.", { size: 20, color: palette.text, align: "center" });
  s.footer();
  return s;
}

function resultsSlide() {
  const s = standardSlide("نتائج الأعمال الحالية", "مؤشرات مستخرجة من آخر تشغيل كامل للمشروع");
  const k = executive.business_kpis;
  const metrics = [
    ["الإيرادات", money(k.total_sales_revenue), palette.green],
    ["الطلبات", format(k.total_orders), palette.blue],
    ["القطع المباعة", format(k.total_items_sold), palette.gold],
    ["متوسط الطلب", money(k.average_order_value), palette.teal],
  ];
  metrics.forEach(([label, value, color], index) => {
    s.kpiCard(inch(0.75 + index * 3.15), inch(1.45), inch(2.75), inch(1.55), label, value, color);
  });
  const leaders = executive.leaders;
  s.card(inch(0.9), inch(3.65), inch(3.7), inch(1.9), "أفضل منتج", [
    leaders.top_product.product_name,
    `${money(leaders.top_product.total_sales_revenue)}`
  ], palette.green);
  s.card(inch(4.85), inch(3.65), inch(3.7), inch(1.9), "أفضل شريحة/مدينة", [
    `${leaders.top_city_segment.city} / ${leaders.top_city_segment.segment}`,
    `${money(leaders.top_city_segment.total_sales_revenue)}`
  ], palette.blue);
  s.card(inch(8.8), inch(3.65), inch(3.7), inch(1.9), "أفضل قناة", [
    leaders.top_channel.sales_channel,
    `${money(leaders.top_channel.total_sales_revenue)}`
  ], palette.teal);
  s.footer();
  return s;
}

function qualitySlide() {
  const s = standardSlide("جودة البيانات", "قياس واضح لما تم تنظيفه وما تم رفضه");
  const q = quality.sales_quality;
  const max = q.before;
  s.bar(inch(1.0), inch(1.7), inch(10.8), inch(0.55), "قبل التنظيف", q.before, max, palette.coral);
  s.bar(inch(1.0), inch(2.65), inch(10.8), inch(0.55), "بعد التنظيف", q.after, max, palette.green);
  s.bar(inch(1.0), inch(3.6), inch(10.8), inch(0.55), "صفوف مرفوضة", q.rejected, max, palette.gold);
  s.card(inch(1.0), inch(4.75), inch(3.2), inch(1.15), "Retention", [`${(q.retention_rate * 100).toFixed(2)}%`], palette.green);
  s.card(inch(4.65), inch(4.75), inch(3.2), inch(1.15), "Duplicate", [`${(q.duplicate_rate * 100).toFixed(2)}%`], palette.blue);
  s.card(inch(8.3), inch(4.75), inch(3.2), inch(1.15), "Invalid Amount", [`${(q.invalid_amount_rate * 100).toFixed(2)}%`], palette.coral);
  s.footer();
  return s;
}

function pythonSlide() {
  const s = standardSlide("تنفيذ المنطق الأساسي بلغة Python", "إضافة طبقة Python واضحة وقابلة للتطوير");
  s.card(inch(0.75), inch(1.45), inch(5.55), inch(2.5), "ما تمت إضافته", [
    "app/python/smart_retail_pipeline.py",
    "RUN_PYTHON_PIPELINE.cmd",
    "RUN_PYTHON_TESTS.cmd",
    "README_PYTHON_AR.md"
  ], palette.blue);
  s.card(inch(6.55), inch(1.45), inch(5.55), inch(2.5), "ما ينفذه Python", [
    "Source, Bronze, Silver, Gold",
    "SQLite Loading",
    "Reports & Dashboard",
    "Data Quality Checks"
  ], palette.teal);
  s.code(inch(0.9), inch(4.55), inch(11.45), inch(0.85), "py -3 app\\python\\smart_retail_pipeline.py run --days 14 --customers 160 --products 50");
  s.text(inch(0.9), inch(5.6), inch(11.45), inch(0.48), "ملاحظة: ملف EXE يظل طريقة التشغيل الأسهل، بينما Python يوفر تنفيذًا واضحًا للمنطق الأساسي عند توفر Python 3.10+.", { size: 17, color: palette.muted, align: "center" });
  s.footer();
  return s;
}

function operationsSlide() {
  const s = standardSlide("التشغيل والتسليم", "مشروع قابل للنقل والاستخدام بسهولة");
  const items = [
    ["SmartRetailProject.exe", "تشغيل مباشر وفتح المتصفح تلقائيًا"],
    ["runtime/node.exe", "حل مشكلة node is not recognized"],
    ["START_PROJECT.cmd", "بديل تشغيل عند منع EXE"],
    ["SmartRetailPro_Portable.zip", "نسخة مضغوطة للنقل إلى جهاز آخر"]
  ];
  items.forEach(([title, body], index) => {
    s.iconCard(inch(1.0), inch(1.45 + index * 1.25), inch(11.2), inch(0.9), title, body, [palette.green, palette.blue, palette.gold, palette.teal][index]);
  });
  s.footer();
  return s;
}

function testingSlide() {
  const s = standardSlide("الاختبارات والاعتمادية", "التحقق من التشغيل ومنع الأخطاء الشائعة");
  s.card(inch(0.8), inch(1.45), inch(3.75), inch(3.4), "اختبارات", [
    "RUN_TESTS.cmd",
    "All Smart Retail Pro checks passed",
    "فحص إنشاء SQLite والتقارير"
  ], palette.green);
  s.card(inch(4.8), inch(1.45), inch(3.75), inch(3.4), "سلامة", [
    "الخادم محلي 127.0.0.1",
    "استعلامات قراءة فقط",
    "حماية مسارات الملفات"
  ], palette.blue);
  s.card(inch(8.8), inch(1.45), inch(3.75), inch(3.4), "قابلية التشغيل", [
    "Runtime مرفق",
    "واجهة محلية",
    "تقارير وقاعدة بيانات جاهزة"
  ], palette.teal);
  s.text(inch(0.95), inch(5.45), inch(11.55), inch(0.45), `آخر تشغيل كامل: ${pipeline.status} خلال ${(pipeline.duration_ms / 1000).toFixed(2)} ثانية`, { size: 20, color: palette.blue, align: "center", bold: true });
  s.footer();
  return s;
}

function deliverablesSlide() {
  const s = standardSlide("مخرجات المشروع", "كل ما يحتاجه المستخدم أو المقيم موجود داخل المجلد");
  const rows = [
    ["التشغيل", "SmartRetailProject.exe / START_PROJECT.cmd"],
    ["الواجهة", "http://127.0.0.1:4173"],
    ["البيانات", "data/source, bronze, silver, gold"],
    ["قاعدة البيانات", "warehouse/smart_retail.sqlite"],
    ["التقارير", "reports و docs"],
    ["Python", "app/python/smart_retail_pipeline.py"],
    ["التسليم", "SmartRetailPro_Portable.zip"],
  ];
  s.table(inch(1.15), inch(1.45), inch(11.0), inch(4.8), ["المكون", "المسار / الوصف"], rows, [0.28, 0.72]);
  s.footer();
  return s;
}

function closingSlide() {
  const s = new Slide("الخلاصة");
  s.background(palette.navy);
  s.rect(inch(0), inch(0), W, inch(0.25), palette.teal);
  s.text(inch(0.8), inch(1.15), inch(11.8), inch(0.7), "الخلاصة", { size: 42, bold: true, color: palette.white, align: "center" });
  s.text(inch(1.3), inch(2.05), inch(10.7), inch(1.1), "Smart Retail Pro ليس مجرد كود؛ هو مشروع هندسة بيانات كامل قابل للتشغيل والشرح والتسليم، مع واجهة رسومية وتقارير ومستودع بيانات ونسخة Python للمنطق الأساسي.", { size: 25, color: palette.offWhite, align: "center" });
  s.badge(inch(1.25), inch(4.25), inch(3.0), inch(0.6), "جاهز للتشغيل");
  s.badge(inch(5.15), inch(4.25), inch(3.0), inch(0.6), "جاهز للعرض");
  s.badge(inch(9.05), inch(4.25), inch(3.0), inch(0.6), "جاهز للتسليم");
  s.text(inch(0.8), inch(6.35), inch(11.8), inch(0.35), "SmartRetailPro_Presentation.pptx", { size: 15, color: palette.mid, align: "center", rtl: false });
  return s;
}

function codeWalkthroughSlides() {
  return [
    codeCoverSlide(),
    codeMapSlide(),
    entryPointsCodeSlide(),
    launcherCodeSlide(),
    serverCodeSlide(),
    pipelineOrchestratorCodeSlide(),
    sourceBronzeCodeSlide(),
    silverCodeSlide(),
    goldWarehouseCodeSlide(),
    schemaCodeSlide(),
    uiCodeSlide(),
    pythonCodeSlide(),
    testsCodeSlide(),
    codeClosingSlide(),
  ];
}

function codeCoverSlide() {
  const s = new Slide("شرح أكواد المشروع");
  s.background(palette.navy);
  s.rect(inch(0), inch(0), W, inch(0.28), palette.gold);
  s.text(inch(0.7), inch(0.92), inch(12), inch(0.55), "Code Walkthrough", { size: 24, color: palette.mid, align: "center", rtl: false });
  s.text(inch(0.7), inch(1.55), inch(12), inch(0.85), "شرح أكواد مشروع Smart Retail Pro", { size: 40, bold: true, color: palette.white, align: "center" });
  s.text(inch(1.2), inch(2.55), inch(10.9), inch(0.85), "عرض مخصص لتوضيح بنية الكود، ملفات التشغيل، الـ Pipeline، السيرفر، الواجهة، قاعدة البيانات، نسخة Python، والاختبارات.", { size: 22, color: palette.offWhite, align: "center" });
  s.badge(inch(1.55), inch(4.2), inch(2.25), inch(0.55), "Launcher");
  s.badge(inch(4.15), inch(4.2), inch(2.25), inch(0.55), "Pipeline");
  s.badge(inch(6.75), inch(4.2), inch(2.25), inch(0.55), "Server/API");
  s.badge(inch(9.35), inch(4.2), inch(2.25), inch(0.55), "Python");
  s.text(inch(0.8), inch(6.45), inch(11.8), inch(0.35), "ملف العرض: SmartRetailPro_Code_Walkthrough.pptx", { size: 14, color: palette.mid, align: "center", rtl: false });
  return s;
}

function codeMapSlide() {
  const s = standardSlide("خريطة ملفات الكود", "أين يوجد كل جزء من منطق المشروع؟");
  const rows = [
    ["launcher/Program.cs", "يفتح المشروع من ملف EXE ويشغل الخادم المحلي."],
    ["app/server.mjs", "API محلي للواجهة والملفات وقاعدة البيانات وتشغيل Pipeline."],
    ["app/pipeline.mjs", "المنطق الأساسي: Source, Bronze, Silver, Gold, SQLite, Reports."],
    ["app/sql/schema.sql", "تعريف الجداول والـ Views داخل SQLite."],
    ["app/public", "واجهة المستخدم: HTML وCSS وJavaScript."],
    ["app/python", "نسخة Python للمنطق الأساسي."],
    ["app/tests.mjs", "اختبارات تحقق سريعة."],
  ];
  s.table(inch(0.85), inch(1.35), inch(11.65), inch(5.15), ["الملف", "الدور"], rows, [0.32, 0.68]);
  s.footer();
  return s;
}

function entryPointsCodeSlide() {
  const s = standardSlide("نقاط الدخول Entry Points", "كيف يبدأ تشغيل المشروع من المستخدم إلى الكود؟");
  s.card(inch(0.7), inch(1.35), inch(3.9), inch(2.25), "تشغيل المستخدم", [
    "SmartRetailProject.exe",
    "START_PROJECT.cmd",
    "RUN_PIPELINE.cmd"
  ], palette.green);
  s.card(inch(4.8), inch(1.35), inch(3.9), inch(2.25), "تشغيل Node", [
    "runtime/node.exe",
    "app/server.mjs",
    "app/cli.mjs"
  ], palette.blue);
  s.card(inch(8.9), inch(1.35), inch(3.55), inch(2.25), "تشغيل Python", [
    "RUN_PYTHON_PIPELINE.cmd",
    "app/python/smart_retail_pipeline.py"
  ], palette.teal);
  s.code(inch(0.8), inch(4.15), inch(11.65), inch(1.05), snippet("app/cli.mjs", 1, 12));
  s.text(inch(0.8), inch(5.45), inch(11.65), inch(0.42), "ملف cli.mjs يربط أوامر الطرفية بالـ Pipeline: run للتشغيل وclean لتنظيف المخرجات.", { size: 18, color: palette.text, align: "center" });
  s.footer();
  return s;
}

function launcherCodeSlide() {
  const s = standardSlide("كود ملف EXE", "launcher/Program.cs");
  s.card(inch(0.75), inch(1.35), inch(4.1), inch(4.55), "الفكرة", [
    "يحدد مجلد المشروع الحالي.",
    "يبحث عن runtime/node.exe.",
    "يشغل app/server.mjs على المنفذ 4173.",
    "ينتظر استجابة الخادم ثم يفتح المتصفح."
  ], palette.green);
  s.code(inch(5.1), inch(1.35), inch(7.45), inch(4.55), snippet("launcher/Program.cs", 4, 36));
  s.footer();
  return s;
}

function serverCodeSlide() {
  const s = standardSlide("الخادم المحلي وواجهات API", "app/server.mjs");
  s.code(inch(0.75), inch(1.25), inch(12.0), inch(2.35), snippet("app/server.mjs", 18, 47));
  s.card(inch(0.85), inch(4.0), inch(3.65), inch(1.6), "API للواجهة", [
    "/api/overview",
    "/api/tree",
    "/api/file"
  ], palette.blue);
  s.card(inch(4.85), inch(4.0), inch(3.65), inch(1.6), "API للبيانات", [
    "/api/db/meta",
    "/api/db/query"
  ], palette.teal);
  s.card(inch(8.85), inch(4.0), inch(3.65), inch(1.6), "API للتشغيل", [
    "/api/operation/run",
    "/api/operation/status"
  ], palette.green);
  s.footer();
  return s;
}

function pipelineOrchestratorCodeSlide() {
  const s = standardSlide("منسق الـ Pipeline", "runPipeline داخل app/pipeline.mjs");
  s.code(inch(0.75), inch(1.25), inch(12.0), inch(3.1), snippet("app/pipeline.mjs", 26, 62));
  s.text(inch(1.0), inch(4.65), inch(11.35), inch(0.42), "الدالة runPipeline لا تنفذ مرحلة واحدة فقط؛ هي تنظم كل المراحل وتسجل مدة كل مرحلة ومخرجاتها.", { size: 18, color: palette.text, align: "center" });
  s.rect(inch(1.1), inch(5.35), inch(11.1), inch(0.58), palette.light, "D6E4F0");
  s.text(inch(1.25), inch(5.47), inch(10.8), inch(0.28), "source_generation → bronze_ingestion → silver_transformation → gold_publishing → warehouse_loading → documentation_outputs", { size: 13, color: palette.blue, align: "center", rtl: false });
  s.footer();
  return s;
}

function sourceBronzeCodeSlide() {
  const s = standardSlide("توليد البيانات وطبقة Bronze", "generateSource + ingestBronze");
  s.card(inch(0.75), inch(1.25), inch(3.8), inch(4.45), "Source", [
    "ينشئ عملاء ومنتجات.",
    "ينشئ مبيعات يومية.",
    "ينشئ أحداث Web/App.",
    "يحقن أخطاء جودة مقصودة للاختبار."
  ], palette.coral);
  s.card(inch(4.75), inch(1.25), inch(3.8), inch(4.45), "Bronze", [
    "ينسخ البيانات الخام كما هي.",
    "يحافظ على بنية الملفات.",
    "ينشئ ingestion_manifest.csv.",
    "يسجل SHA256 لكل ملف."
  ], palette.gold);
  s.code(inch(8.75), inch(1.25), inch(3.75), inch(4.45), snippet("app/pipeline.mjs", 165, 178));
  s.footer();
  return s;
}

function silverCodeSlide() {
  const s = standardSlide("تنظيف البيانات وقواعد الجودة", "transformSilver داخل app/pipeline.mjs");
  s.code(inch(0.75), inch(1.25), inch(12.0), inch(2.8), snippet("app/pipeline.mjs", 194, 233));
  s.card(inch(0.95), inch(4.4), inch(3.65), inch(1.4), "قواعد الرفض", [
    "تكرار order line",
    "حقول حرجة فارغة"
  ], palette.coral);
  s.card(inch(4.85), inch(4.4), inch(3.65), inch(1.4), "تحقق رقمي", [
    "كمية غير صالحة",
    "مبلغ غير صالح"
  ], palette.gold);
  s.card(inch(8.75), inch(4.4), inch(3.65), inch(1.4), "تحقق مرجعي", [
    "عميل غير موجود",
    "منتج غير موجود"
  ], palette.teal);
  s.footer();
  return s;
}

function goldWarehouseCodeSlide() {
  const s = standardSlide("Gold وSQLite Warehouse", "publishGold + loadWarehouse");
  s.code(inch(0.75), inch(1.25), inch(5.85), inch(4.65), snippet("app/pipeline.mjs", 264, 316));
  s.code(inch(6.85), inch(1.25), inch(5.85), inch(4.65), snippet("app/pipeline.mjs", 318, 337));
  s.footer();
  return s;
}

function schemaCodeSlide() {
  const s = standardSlide("تعريف قاعدة البيانات", "app/sql/schema.sql");
  s.code(inch(0.75), inch(1.25), inch(5.8), inch(4.85), snippet("app/sql/schema.sql", 1, 40));
  s.code(inch(6.85), inch(1.25), inch(5.8), inch(4.85), snippet("app/sql/schema.sql", 78, 120));
  s.footer();
  return s;
}

function uiCodeSlide() {
  const s = standardSlide("كود الواجهة الرسومية", "app/public/index.html و app/public/app.js");
  s.card(inch(0.75), inch(1.25), inch(3.7), inch(4.65), "HTML", [
    "تبويبات الواجهة.",
    "مناطق عرض KPIs.",
    "SQL Editor.",
    "Iframe للتقارير."
  ], palette.blue);
  s.code(inch(4.75), inch(1.25), inch(3.8), inch(4.65), snippet("app/public/index.html", 10, 27));
  s.code(inch(8.75), inch(1.25), inch(3.8), inch(4.65), snippet("app/public/app.js", 15, 35));
  s.footer();
  return s;
}

function pythonCodeSlide() {
  const s = standardSlide("نسخة Python من المنطق الأساسي", "app/python/smart_retail_pipeline.py");
  s.code(inch(0.75), inch(1.25), inch(12.0), inch(2.45), snippet("app/python/smart_retail_pipeline.py", 71, 110));
  s.card(inch(0.95), inch(4.1), inch(3.65), inch(1.65), "مكتبات قياسية", [
    "csv, json, sqlite3",
    "pathlib, shutil, hashlib"
  ], palette.teal);
  s.card(inch(4.85), inch(4.1), inch(3.65), inch(1.65), "نفس المراحل", [
    "Source/Bronze/Silver",
    "Gold/Warehouse/Reports"
  ], palette.green);
  s.card(inch(8.75), inch(4.1), inch(3.65), inch(1.65), "تشغيل مستقل", [
    "RUN_PYTHON_PIPELINE.cmd",
    "يتطلب Python 3.10+"
  ], palette.gold);
  s.footer();
  return s;
}

function testsCodeSlide() {
  const s = standardSlide("الاختبارات والتحقق", "app/tests.mjs و test_python_pipeline.py");
  s.code(inch(0.75), inch(1.25), inch(5.85), inch(4.4), snippet("app/tests.mjs", 1, 12));
  s.code(inch(6.85), inch(1.25), inch(5.85), inch(4.4), snippet("app/python/test_python_pipeline.py", 1, 16));
  s.text(inch(0.9), inch(5.9), inch(11.6), inch(0.35), "اختبارات Node تعمل حاليًا. اختبارات Python جاهزة، لكنها تحتاج تثبيت Python فعلي على الجهاز.", { size: 16, color: palette.muted, align: "center" });
  s.footer();
  return s;
}

function codeClosingSlide() {
  const s = new Slide("الخلاصة التقنية");
  s.background(palette.navy);
  s.rect(inch(0), inch(0), W, inch(0.25), palette.gold);
  s.text(inch(0.85), inch(1.05), inch(11.6), inch(0.7), "الخلاصة التقنية", { size: 40, bold: true, color: palette.white, align: "center" });
  s.text(inch(1.25), inch(2.0), inch(10.8), inch(1.25), "الكود مقسم إلى طبقات واضحة: تشغيل، خادم، Pipeline، قاعدة بيانات، واجهة، Python، واختبارات. هذا التقسيم يجعل المشروع قابلًا للفهم، العرض، الصيانة، والتطوير.", { size: 24, color: palette.offWhite, align: "center" });
  s.badge(inch(1.5), inch(4.35), inch(2.7), inch(0.6), "واضح البنية");
  s.badge(inch(5.25), inch(4.35), inch(2.7), inch(0.6), "قابل للشرح");
  s.badge(inch(9.0), inch(4.35), inch(2.7), inch(0.6), "قابل للتطوير");
  s.text(inch(0.8), inch(6.42), inch(11.8), inch(0.32), "SmartRetailPro_Code_Walkthrough.pptx", { size: 14, color: palette.mid, align: "center", rtl: false });
  return s;
}

function standardSlide(title, subtitle) {
  const s = new Slide(title);
  s.background(palette.offWhite);
  s.rect(0, 0, W, inch(0.18), palette.teal);
  s.text(inch(0.55), inch(0.42), inch(12.15), inch(0.5), title, { size: 30, bold: true, color: palette.navy });
  s.text(inch(0.58), inch(0.95), inch(12.0), inch(0.35), subtitle, { size: 16, color: palette.muted });
  return s;
}

function snippet(relative, start, end) {
  const file = path.join(rootDir, relative);
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  return lines.slice(start - 1, end).map((line, index) => `${String(start + index).padStart(3, " ")} | ${line}`).join("\n");
}

class Slide {
  constructor(title) {
    this.title = title;
    this.elements = [];
    this.id = 2;
  }

  background(color) {
    this.rect(0, 0, W, H, color, null);
  }

  footer() {
    this.text(inch(0.6), inch(6.92), inch(12.1), inch(0.25), "Smart Retail Pro | Data Engineering Project", { size: 10, color: palette.muted, align: "center", rtl: false });
  }

  rect(x, y, w, h, fill, line = null) {
    this.elements.push(shape(this.nextId(), x, y, w, h, { fill, line, preset: "rect" }));
  }

  roundBox(x, y, w, h, text, fill, color = palette.white, size = 18, rtl = true) {
    this.elements.push(shape(this.nextId(), x, y, w, h, { fill, line: fill, preset: "roundRect", text: [text], textOptions: { color, size, bold: true, align: "center", rtl } }));
  }

  text(x, y, w, h, text, options = {}) {
    const lines = Array.isArray(text) ? text : [text];
    this.elements.push(shape(this.nextId(), x, y, w, h, { fill: null, line: null, preset: "rect", text: lines, textOptions: options }));
  }

  card(x, y, w, h, title, bullets, accent) {
    this.elements.push(shape(this.nextId(), x, y, w, h, { fill: palette.white, line: "D6E4F0", preset: "roundRect" }));
    this.rect(x, y, inch(0.12), h, accent, accent);
    this.text(x + inch(0.3), y + inch(0.18), w - inch(0.55), inch(0.45), title, { size: 20, bold: true, color: accent });
    this.text(x + inch(0.3), y + inch(0.78), w - inch(0.55), h - inch(0.9), bullets.map((item) => `• ${item}`), { size: 14, color: palette.text });
  }

  iconCard(x, y, w, h, title, body, accent) {
    this.elements.push(shape(this.nextId(), x, y, w, h, { fill: palette.white, line: "D6E4F0", preset: "roundRect" }));
    this.roundBox(x + w - inch(0.75), y + inch(0.22), inch(0.42), inch(0.42), "✓", accent, palette.white, 14);
    this.text(x + inch(0.25), y + inch(0.17), w - inch(1.1), inch(0.34), title, { size: 18, bold: true, color: palette.navy });
    this.text(x + inch(0.25), y + inch(0.58), w - inch(1.1), inch(0.3), body, { size: 13, color: palette.muted });
  }

  kpiCard(x, y, w, h, label, value, color) {
    this.elements.push(shape(this.nextId(), x, y, w, h, { fill: palette.white, line: "D6E4F0", preset: "roundRect" }));
    this.text(x + inch(0.18), y + inch(0.18), w - inch(0.36), inch(0.35), label, { size: 16, color: palette.muted, align: "center" });
    this.text(x + inch(0.18), y + inch(0.72), w - inch(0.36), inch(0.45), value, { size: 24, color, bold: true, align: "center", rtl: false });
  }

  badge(x, y, w, h, text) {
    this.elements.push(shape(this.nextId(), x, y, w, h, { fill: "153449", line: "4CA7A1", preset: "roundRect", text: [text], textOptions: { size: 15, bold: true, color: palette.white, align: "center", rtl: false } }));
  }

  code(x, y, w, h, text) {
    this.elements.push(shape(this.nextId(), x, y, w, h, { fill: "101820", line: "203040", preset: "roundRect", text: text.split("\n"), textOptions: { size: 14, color: "DDE7F3", align: "left", rtl: false, font: "Consolas" } }));
  }

  table(x, y, w, h, headers, rows, widths) {
    const rowHeight = h / (rows.length + 1);
    let cursorX = x;
    headers.forEach((header, index) => {
      const cw = w * widths[index];
      this.elements.push(shape(this.nextId(), cursorX, y, cw, rowHeight, { fill: palette.blue, line: palette.white, preset: "rect", text: [header], textOptions: { size: 14, bold: true, color: palette.white, align: "center" } }));
      cursorX += cw;
    });
    rows.forEach((row, rowIndex) => {
      cursorX = x;
      row.forEach((cell, index) => {
        const cw = w * widths[index];
        const fill = rowIndex % 2 === 0 ? palette.white : "F0F5FA";
        this.elements.push(shape(this.nextId(), cursorX, y + rowHeight * (rowIndex + 1), cw, rowHeight, { fill, line: "D6E4F0", preset: "rect", text: [cell], textOptions: { size: 11, color: palette.text, align: index === 0 ? "right" : "center", rtl: index !== 2 } }));
        cursorX += cw;
      });
    });
  }

  bar(x, y, w, h, label, value, max, color) {
    const labelW = inch(2.1);
    const valueW = inch(1.1);
    const barW = w - labelW - valueW;
    this.text(x, y + inch(0.05), labelW, h, label, { size: 16, color: palette.text, bold: true });
    this.rect(x + labelW, y + inch(0.1), barW, h - inch(0.2), "E8EEF5", null);
    this.rect(x + labelW, y + inch(0.1), Math.max(inch(0.04), barW * (value / max)), h - inch(0.2), color, null);
    this.text(x + labelW + barW + inch(0.1), y + inch(0.05), valueW, h, format(value), { size: 15, color, bold: true, align: "left", rtl: false });
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
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      ${groupBoilerplate()}
      ${this.elements.join("\n")}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
  }
}

function shape(id, x, y, w, h, options) {
  const fill = options.fill ? `<a:solidFill><a:srgbClr val="${options.fill}"/></a:solidFill>` : "<a:noFill/>";
  const line = options.line ? `<a:ln w="9525"><a:solidFill><a:srgbClr val="${options.line}"/></a:solidFill></a:ln>` : "<a:ln><a:noFill/></a:ln>";
  const text = options.text ? txBody(options.text, options.textOptions || {}) : "";
  return `<p:sp>
  <p:nvSpPr><p:cNvPr id="${id}" name="Shape ${id}"/><p:cNvSpPr${options.text ? ' txBox="1"' : ""}/><p:nvPr/></p:nvSpPr>
  <p:spPr><a:xfrm><a:off x="${Math.round(x)}" y="${Math.round(y)}"/><a:ext cx="${Math.round(w)}" cy="${Math.round(h)}"/></a:xfrm><a:prstGeom prst="${options.preset || "rect"}"><a:avLst/></a:prstGeom>${fill}${line}</p:spPr>
  ${text}
</p:sp>`;
}

function connector(id, x, y, w, h, color) {
  return `<p:cxnSp>
  <p:nvCxnSpPr><p:cNvPr id="${id}" name="Arrow ${id}"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr>
  <p:spPr><a:xfrm><a:off x="${Math.round(x)}" y="${Math.round(y)}"/><a:ext cx="${Math.round(w)}" cy="${Math.round(h)}"/></a:xfrm><a:prstGeom prst="straightConnector1"><a:avLst/></a:prstGeom><a:ln w="25400"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:headEnd type="triangle"/></a:ln></p:spPr>
</p:cxnSp>`;
}

function txBody(lines, options) {
  const size = options.size || 14;
  const color = options.color || palette.text;
  const bold = options.bold ? ' b="1"' : "";
  const align = { center: "ctr", left: "l", right: "r" }[options.align || "right"];
  const rtl = options.rtl === false ? "" : ' rtl="1"';
  const font = options.font || "Arial";
  const paragraphs = lines.map((line) => `<a:p><a:pPr algn="${align}"${rtl}/><a:r><a:rPr lang="${options.rtl === false ? "en-US" : "ar-EG"}" sz="${size * 100}"${bold}><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="${font}"/><a:ea typeface="${font}"/><a:cs typeface="${font}"/></a:rPr><a:t>${escapeXml(String(line))}</a:t></a:r></a:p>`).join("");
  return `<p:txBody><a:bodyPr rtlCol="${options.rtl === false ? "0" : "1"}" anchor="mid" wrap="square"><a:normAutofit/></a:bodyPr><a:lstStyle/>${paragraphs}</p:txBody>`;
}

function groupBoilerplate() {
  return `<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>`;
}

function buildPackage(slideObjects) {
  const files = {
    "[Content_Types].xml": contentTypesXml(slideObjects.length),
    "_rels/.rels": rootRelsXml(),
    "docProps/core.xml": coreXml(),
    "docProps/app.xml": appXml(slideObjects.length),
    "ppt/presentation.xml": presentationXml(slideObjects.length),
    "ppt/_rels/presentation.xml.rels": presentationRelsXml(slideObjects.length),
    "ppt/slideMasters/slideMaster1.xml": slideMasterXml(),
    "ppt/slideMasters/_rels/slideMaster1.xml.rels": slideMasterRelsXml(),
    "ppt/slideLayouts/slideLayout1.xml": slideLayoutXml(),
    "ppt/slideLayouts/_rels/slideLayout1.xml.rels": slideLayoutRelsXml(),
    "ppt/theme/theme1.xml": themeXml(),
  };
  slideObjects.forEach((slide, index) => {
    const n = index + 1;
    files[`ppt/slides/slide${n}.xml`] = slide.xml();
    files[`ppt/slides/_rels/slide${n}.xml.rels`] = slideRelsXml();
  });
  return files;
}

function contentTypesXml(count) {
  const slideOverrides = Array.from({ length: count }, (_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
${slideOverrides}
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;
}

function rootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function presentationXml(count) {
  const ids = Array.from({ length: count }, (_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
<p:sldIdLst>${ids}</p:sldIdLst>
<p:sldSz cx="${W}" cy="${H}" type="wide"/>
<p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`;
}

function presentationRelsXml(count) {
  const slideRels = Array.from({ length: count }, (_, i) => `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
${slideRels}
</Relationships>`;
}

function slideMasterXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
<p:cSld><p:spTree>${groupBoilerplate()}</p:spTree></p:cSld>
<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
<p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles>
</p:sldMaster>`;
}

function slideMasterRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`;
}

function slideLayoutXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
<p:cSld name="Blank"><p:spTree>${groupBoilerplate()}</p:spTree></p:cSld>
<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`;
}

function slideLayoutRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;
}

function slideRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`;
}

function themeXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Smart Retail Pro">
<a:themeElements>
<a:clrScheme name="SmartRetail"><a:dk1><a:srgbClr val="${palette.navy}"/></a:dk1><a:lt1><a:srgbClr val="${palette.white}"/></a:lt1><a:dk2><a:srgbClr val="${palette.text}"/></a:dk2><a:lt2><a:srgbClr val="${palette.offWhite}"/></a:lt2><a:accent1><a:srgbClr val="${palette.blue}"/></a:accent1><a:accent2><a:srgbClr val="${palette.teal}"/></a:accent2><a:accent3><a:srgbClr val="${palette.gold}"/></a:accent3><a:accent4><a:srgbClr val="${palette.green}"/></a:accent4><a:accent5><a:srgbClr val="${palette.coral}"/></a:accent5><a:accent6><a:srgbClr val="${palette.mid}"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme>
<a:fontScheme name="SmartRetail"><a:majFont><a:latin typeface="Arial"/><a:ea typeface="Arial"/><a:cs typeface="Arial"/></a:majFont><a:minFont><a:latin typeface="Arial"/><a:ea typeface="Arial"/><a:cs typeface="Arial"/></a:minFont></a:fontScheme>
<a:fmtScheme name="SmartRetail"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"/></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"/></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="25400"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="38100"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme>
</a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>`;
}

function coreXml() {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>Smart Retail Pro Presentation</dc:title><dc:subject>Data Engineering Project Presentation</dc:subject><dc:creator>Codex</dc:creator><dc:description>Professional Arabic PowerPoint presentation for Smart Retail Pro.</dc:description><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
}

function appXml(slideCount) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
<Application>Smart Retail Pro Presentation Generator</Application><PresentationFormat>Widescreen</PresentationFormat><Slides>${slideCount}</Slides><Company>Smart Retail Pro</Company>
</Properties>`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
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
    const dataBuf = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8");
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
    local.writeUInt16LE(0, 28);
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
    dir.writeUInt16LE(0, 30);
    dir.writeUInt16LE(0, 32);
    dir.writeUInt16LE(0, 34);
    dir.writeUInt16LE(0, 36);
    dir.writeUInt32LE(0, 38);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, nameBuf);
    offset += local.length + nameBuf.length + dataBuf.length;
  }
  const centralOffset = offset;
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(Object.keys(entries).length, 8);
  end.writeUInt16LE(Object.keys(entries).length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(centralOffset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...chunks, centralBuf, end]);
}

function dosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buffer[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  return c >>> 0;
});

writePresentation();

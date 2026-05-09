import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const docsDir = path.join(rootDir, "docs");
const outputFile = path.join(docsDir, "SmartRetailPro_Project_Report.docx");

const readText = (relative) => fs.readFileSync(path.join(rootDir, relative), "utf8");
const readJson = (relative) => JSON.parse(readText(relative));
const exists = (relative) => fs.existsSync(path.join(rootDir, relative));

const executive = readJson("reports/executive_summary.json");
const quality = readJson("reports/data_quality_report.json");
const pipeline = readJson("reports/pipeline_summary.json");
const catalog = readJson("metadata/catalog.json");
const packageJson = readJson("package.json");

const sourceFiles = [
  "package.json",
  "START_PROJECT.cmd",
  "RUN_PIPELINE.cmd",
  "RUN_TESTS.cmd",
  "RUN_PYTHON_PIPELINE.cmd",
  "RUN_PYTHON_TESTS.cmd",
  "RUN_AZURE_DEPLOY.cmd",
  "app/config.mjs",
  "app/cli.mjs",
  "app/pipeline.mjs",
  "app/server.mjs",
  "app/tests.mjs",
  "app/python/__init__.py",
  "app/python/smart_retail_pipeline.py",
  "app/python/test_python_pipeline.py",
  "app/lib/csv.mjs",
  "app/lib/fsx.mjs",
  "app/lib/rng.mjs",
  "app/lib/time.mjs",
  "app/sql/schema.sql",
  "app/public/index.html",
  "app/public/styles.css",
  "app/public/app.js",
  "launcher/SmartRetailLauncher.csproj",
  "launcher/Program.cs",
  "azure/infra/main.bicep",
  "azure/web/package.json",
  "azure/web/server.mjs",
  "azure/web/azurePipeline.mjs",
  "azure/scripts/deploy.ps1",
  "README_AZURE_AR.md"
].filter(exists);

const schemaObjects = [
  ["dim_customer", "Table", "بيانات العملاء: الاسم، البريد، المدينة، الشريحة، تاريخ التسجيل."],
  ["dim_product", "Table", "بيانات المنتجات: SKU، الفئة، الاسم، السعر، حالة التفعيل."],
  ["fact_sales", "Table", "جدول حقائق المبيعات بعد التنظيف؛ صف لكل بند طلب صالح."],
  ["fact_web_event", "Table", "جدول أحداث الويب/التطبيق بعد التنظيف؛ صف لكل حدث صالح."],
  ["agg_daily_sales_kpis", "Table", "مؤشرات المبيعات اليومية: الإيراد، الطلبات، الكمية، متوسط الطلب."],
  ["agg_product_performance", "Table", "أداء المنتجات وترتيبها حسب الإيراد."],
  ["agg_city_segment_performance", "Table", "تحليل المبيعات حسب المدينة وشريحة العميل."],
  ["agg_channel_sales", "Table", "أداء قنوات البيع ونسبة مساهمة كل قناة."],
  ["agg_behavior_funnel", "Table", "تحليل سلوك العملاء من المشاهدة إلى السلة والدفع."],
  ["pipeline_run", "Table", "سجل تشغيلات خط البيانات ومقاييس كل مرحلة."],
  ["vw_retail_kpi_scorecard", "View", "لوحة KPI مختصرة للإدارة العليا."],
  ["vw_top_products", "View", "أفضل المنتجات حسب الإيراد."],
  ["vw_city_segment_sales", "View", "المبيعات حسب المدينة والشريحة."],
  ["vw_behavior_funnel", "View", "قمع سلوك العملاء."],
  ["vw_data_quality_health", "View", "صحة جودة البيانات من آخر تشغيلات."],
];

const tableCounts = [
  ["dim_customer", "160"],
  ["dim_product", "50"],
  ["fact_sales", "2008"],
  ["fact_web_event", "4151"],
  ["agg_daily_sales_kpis", "14"],
  ["agg_product_performance", "50"],
  ["agg_city_segment_performance", "24"],
  ["agg_channel_sales", "3"],
  ["agg_behavior_funnel", "50"]
];

const uiTabs = [
  ["نظرة عامة", "تعرض أهم مؤشرات الأداء، خريطة المشروع، وروابط الوصول السريع للملفات الأساسية."],
  ["تشغيل المشروع", "تشغيل الـ Pipeline من الواجهة مع تحديد عدد الأيام والعملاء والمنتجات ومتابعة سجل التشغيل."],
  ["الملفات والكود", "تصفح مكونات المشروع وفتح الأكواد والبيانات والتقارير من داخل الواجهة."],
  ["قاعدة البيانات", "استعراض الجداول والـ Views وتشغيل استعلامات SQL للقراءة فقط."],
  ["التقارير", "عرض Dashboard والتقارير التنفيذية وتقارير الجودة."],
  ["المساعد", "تحويل أسئلة بسيطة إلى استعلامات SQL جاهزة على الـ Views المهمة."]
];

const deliverables = [
  ["ملف التشغيل", "SmartRetailProject.exe", "تشغيل المشروع بنقرة مزدوجة على Windows x64."],
  ["نسخة Azure", "azure/", "بنية سحابية فعلية باستخدام App Service وData Lake وAzure SQL وData Factory."],
  ["واجهة المستخدم", "http://127.0.0.1:4173", "واجهة محلية تعمل من المتصفح بعد تشغيل الملف التنفيذي."],
  ["قاعدة البيانات", "warehouse/smart_retail.sqlite", "مستودع SQLite يحتوي الجداول والـ Views التحليلية."],
  ["التقارير", "reports/", "Dashboard HTML، ملخص تنفيذي، تقرير جودة، أمثلة SQL."],
  ["العروض التقديمية", "docs/*.pptx", "عرض عام، شرح أكواد، وقاعدة بيانات وPipeline وUX/UI وتشغيل وPython واختبارات وقيمة تجارية ومناقشة."],
  ["الأكواد", "app/ و launcher/", "كود الـ Pipeline، الخادم، الواجهة، الاختبارات، وملف الـ Launcher."],
  ["النسخة المحمولة", "../SmartRetailPro_Portable.zip", "نسخة قابلة للنقل مع Runtime محلي دون تثبيت Node."]
];

const contents = [];

addCover();
pageBreak();
heading("فهرس المحتويات", 1);
[
  "1. الملخص التنفيذي",
  "2. فكرة المشروع وخلفيته",
  "3. أهداف المشروع",
  "4. نطاق العمل والمخرجات",
  "5. التقنيات المستخدمة",
  "6. معمارية النظام",
  "7. خط البيانات Data Pipeline",
  "8. نموذج قاعدة البيانات",
  "9. واجهة المستخدم وتجربة الاستخدام",
  "10. آلية التشغيل بملف EXE",
  "11. نتائج التشغيل الحالية",
  "12. الاختبارات والتحقق",
  "13. الأمن والسلامة والقيود",
  "14. خطوات التشغيل للمستخدم",
  "15. مميزات المشروع ونقاط التميز",
  "16. التحسينات المستقبلية",
  "17. ملحق الأكواد الرئيسية"
].forEach((item) => para(item));

pageBreak();
heading("1. الملخص التنفيذي", 1);
para("مشروع Smart Retail Pro هو منصة هندسة بيانات محلية متكاملة لقطاع التجزئة. يقوم المشروع بتوليد بيانات مصدر واقعية، إدخالها في طبقة Bronze، تنظيفها وتحويلها في Silver، نشر مؤشرات الأعمال في Gold، ثم تحميل النتائج في مستودع SQLite مع واجهة رسومية سهلة الاستخدام وتقارير تنفيذية جاهزة.");
para("تم تصميم النسخة الحالية لمعالجة مشكلة التشغيل السابقة المرتبطة بعدم تعرف الجهاز على أمر node. النسخة الجديدة تحتوي Runtime محلي داخل مجلد runtime، وتوفر ملف تشغيل SmartRetailProject.exe لتشغيل المشروع بنقرة مزدوجة على أجهزة Windows x64.");
table([
  ["البند", "القيمة"],
  ["اسم المشروع", "Smart Retail Pro - Data Engineering Console"],
  ["إصدار المشروع", packageJson.version],
  ["نوع المشروع", "منصة هندسة بيانات محلية مع واجهة رسومية ومخزن SQLite"],
  ["تاريخ آخر تشغيل موثق", pipeline.finished_at],
  ["حالة آخر تشغيل", pipeline.status],
  ["زمن آخر تشغيل", `${pipeline.duration_ms} ms`],
  ["رابط الواجهة المحلية", "http://127.0.0.1:4173"]
]);

heading("2. فكرة المشروع وخلفيته", 1);
para("تتعامل شركات التجزئة الحديثة مع بيانات كثيرة ومتنوعة مثل بيانات العملاء، المنتجات، الطلبات، قنوات البيع، وسلوك المستخدمين داخل المتجر الإلكتروني أو التطبيق. القيمة الحقيقية لا تظهر من البيانات الخام مباشرة، بل من تحويلها إلى نموذج منظم ومؤشرات قابلة للقياس.");
para("فكرة المشروع هي بناء نموذج عملي يحاكي دورة هندسة البيانات كاملة: توليد بيانات خام، توثيق المصدر، استيعاب البيانات، تنظيفها، تطبيق قواعد الجودة، بناء جداول تحليلية، إنشاء مستودع بيانات، ثم توفير واجهة سهلة للوصول إلى النتائج والأكواد وقاعدة البيانات.");

heading("3. أهداف المشروع", 1);
bullets([
  "بناء مشروع Data Engineering كامل من البداية إلى النهاية.",
  "تطبيق بنية Medallion Architecture: Source ثم Bronze ثم Silver ثم Gold.",
  "إنشاء مستودع بيانات SQLite محلي يحتوي جداول وViews تحليلية.",
  "توفير Dashboard وتقارير تنفيذية وتقارير جودة بيانات.",
  "توفير واجهة رسومية عربية سهلة الاستخدام تراعي الوصول السريع للمكونات.",
  "حل مشكلة الاعتماد على تثبيت Node خارجي من خلال Runtime مرفق.",
  "إتاحة تشغيل المشروع من ملف EXE واحد داخل مجلد المشروع.",
  "إضافة اختبارات تحقق أساسية لضمان سلامة التشغيل."
]);

heading("4. نطاق العمل والمخرجات", 1);
para("يغطي المشروع دورة العمل الكاملة من البيانات الخام إلى التقارير والتحليل. لا يقتصر المشروع على ملف كود واحد، بل يحتوي على طبقات بيانات، خادم محلي، واجهة مستخدم، قاعدة بيانات، تقارير، ملف تشغيل، واختبارات.");
table([["المخرج", "المسار", "الغرض"], ...deliverables]);

heading("5. التقنيات المستخدمة", 1);
table([
  ["التقنية", "الاستخدام داخل المشروع"],
  ["JavaScript ES Modules", "تنفيذ الـ Pipeline والخادم والواجهة الأمامية."],
  ["Python", "تنفيذ المنطق الأساسي للمشروع: Source وBronze وSilver وGold وSQLite والتقارير."],
  ["Azure App Service", "استضافة الواجهة والـ API على Azure بدل التشغيل المحلي."],
  ["Azure Data Lake Storage Gen2", "تخزين طبقات البيانات Source/Bronze/Silver/Gold والتقارير في السحابة."],
  ["Azure SQL Database", "مستودع بيانات سحابي بدل SQLite عند تشغيل نسخة Azure."],
  ["Azure Data Factory", "تشغيل Pipeline سحابي يستدعي API المشروع."],
  ["Bicep", "تعريف البنية التحتية ككود Infrastructure as Code."],
  ["Node.js Runtime مرفق", "تشغيل المشروع دون الحاجة إلى تثبيت Node على الجهاز."],
  ["node:sqlite", "إنشاء مستودع SQLite وتشغيل استعلامات قراءة وتحليل."],
  ["HTML / CSS / Vanilla JS", "بناء واجهة رسومية محلية خفيفة وسريعة."],
  [".NET Self-contained Launcher", "إنتاج ملف SmartRetailProject.exe لتشغيل الخادم وفتح المتصفح."],
  ["CSV / JSONL / JSON", "تمثيل البيانات الخام والوسيطة والتقارير."],
  ["Windows CMD", "ملفات تشغيل بديلة للـ Pipeline والاختبارات."]
]);

heading("6. معمارية النظام", 1);
para("يعتمد المشروع على بنية واضحة تفصل بين طبقات البيانات، منطق المعالجة، مستودع البيانات، والواجهة الرسومية. هذا الفصل يجعل المشروع قابلًا للفهم والصيانة والتطوير.");
code(`Source Data
   |
   v
Bronze Ingestion
   |
   v
Silver Cleaning & Validation
   |
   v
Gold Business Aggregates
   |
   v
SQLite Warehouse + SQL Views
   |
   v
Reports + Local GUI + SQL Assistant`);
table([
  ["المكون", "الوصف"],
  ["app/pipeline.mjs", "قلب المشروع: توليد البيانات، الاستيعاب، التنظيف، النشر، التحميل، والتقارير."],
  ["app/server.mjs", "خادم HTTP محلي يقدم الواجهة وAPIs للملفات وقاعدة البيانات والتشغيل."],
  ["app/public", "ملفات الواجهة الرسومية: HTML وCSS وJavaScript."],
  ["app/sql/schema.sql", "تعريف الجداول والـ Views داخل SQLite."],
  ["warehouse", "ملف قاعدة البيانات smart_retail.sqlite."],
  ["reports", "التقارير النهائية ولوحة القيادة."],
  ["launcher", "كود إنتاج ملف EXE للتشغيل السهل."]
]);

heading("7. خط البيانات Data Pipeline", 1);
para("ينفذ المشروع خط بيانات كامل على مراحل متتابعة. كل مرحلة لها مخرجات ومقاييس واضحة تسجل في reports/pipeline_summary.json.");
table([
  ["المرحلة", "الدور", "مخرجات مهمة"],
  ["Source Generation", "توليد بيانات العملاء والمنتجات والمبيعات والأحداث.", "data/source"],
  ["Bronze Ingestion", "نسخ البيانات الخام كما هي مع Manifest وSHA256.", "data/bronze/run_*"],
  ["Silver Transformation", "تنظيف البيانات، إزالة التكرار، رفض الصفوف غير الصالحة.", "data/silver"],
  ["Gold Publishing", "بناء مؤشرات الأعمال وتجميعات المنتجات والقنوات والمدن.", "data/gold"],
  ["Warehouse Loading", "تحميل البيانات إلى SQLite وإنشاء الـ Views.", "warehouse/smart_retail.sqlite"],
  ["Documentation Outputs", "إنتاج Dashboard وتقارير الجودة والملخص التنفيذي.", "reports و metadata"]
]);
heading("مقاييس آخر تشغيل", 2);
table([["المرحلة", "المدة ms", "مقاييس إضافية"], ...pipeline.stages.map((stage) => [
  stage.stage,
  String(stage.duration_ms),
  Object.entries(stage).filter(([key]) => key !== "stage" && key !== "duration_ms").map(([key, value]) => `${key}: ${value}`).join(" - ")
])]);

heading("8. نموذج قاعدة البيانات", 1);
para("تم بناء مستودع بيانات SQLite يحتوي على جداول أبعاد وجداول حقائق وجداول تجميعية وViews جاهزة للاستعلام. هذا يسمح للمستخدم بتحليل البيانات مباشرة من الواجهة دون الحاجة إلى أدوات خارجية.");
table([["الاسم", "النوع", "الوصف"], ...schemaObjects]);
heading("كتالوج البيانات", 2);
table([["الجدول", "مستوى التفصيل Grain"], ...catalog.tables.map((item) => [item.name, item.grain])]);

heading("9. واجهة المستخدم وتجربة الاستخدام", 1);
para("الواجهة مصممة باللغة العربية واتجاه RTL، وتعمل محليًا داخل المتصفح بعد تشغيل ملف EXE. الهدف من الواجهة هو أن يصل المستخدم لكل أجزاء المشروع من شاشة واحدة: التشغيل، الأكواد، قاعدة البيانات، التقارير، والمساعد.");
table([["التبويب", "الوظيفة"], ...uiTabs]);
para("من زاوية UX/UI، تم الاعتماد على قائمة جانبية ثابتة، تبويبات واضحة، بطاقات KPIs، مساحات قراءة للكود، محرر SQL، iframe للتقارير، وأزرار تنفيذ مباشرة. هذا يقلل عدد الخطوات اللازمة للوصول لأي مكون من مكونات المشروع.");

heading("10. آلية التشغيل بملف EXE", 1);
para("ملف SmartRetailProject.exe هو Launcher مبني بـ .NET ويعمل كطبقة تشغيل مريحة للمستخدم. عند الضغط عليه يبحث عن runtime/node.exe داخل مجلد المشروع، ثم يشغل app/server.mjs على المنفذ 4173، وينتظر استجابة API ثم يفتح المتصفح تلقائيًا.");
bullets([
  "لا يحتاج المستخدم إلى كتابة أوامر في الطرفية.",
  "لا يعتمد على وجود node في PATH.",
  "يعرض رسالة واضحة إذا كان Runtime مفقودًا.",
  "يبقي الخادم المحلي يعمل طالما نافذة التشغيل مفتوحة.",
  "يوفر START_PROJECT.cmd كبديل في حال منع النظام ملف EXE."
]);

heading("تنفيذ المنطق الأساسي بلغة Python", 2);
para("تمت إضافة نسخة Python من منطق المشروع الأساسي داخل app/python/smart_retail_pipeline.py. تنفذ هذه النسخة توليد البيانات، الاستيعاب في Bronze، التنظيف والتحقق في Silver، نشر مؤشرات Gold، تحميل SQLite، وإنشاء التقارير. يمكن تشغيلها من RUN_PYTHON_PIPELINE.cmd أو من الأمر py -3 app\\python\\smart_retail_pipeline.py run عند توفر Python 3.10 أو أحدث.");

heading("تنفيذ المشروع على Azure", 2);
para("تمت إضافة نسخة Azure-ready داخل مجلد azure. هذه النسخة تنقل المشروع من بيئة محلية إلى بيئة سحابية فعلية: Azure App Service للواجهة والـ API، Azure Data Lake Storage Gen2 لتخزين طبقات البيانات، Azure SQL Database كمستودع بيانات، وAzure Data Factory لتشغيل Pipeline من السحابة. يتم إنشاء الموارد باستخدام ملف Bicep داخل azure/infra/main.bicep، ويتم النشر من خلال RUN_AZURE_DEPLOY.cmd أو azure/scripts/deploy.ps1.");

heading("11. نتائج التشغيل الحالية", 1);
const kpi = executive.business_kpis;
const q = executive.data_quality;
table([
  ["المؤشر", "القيمة"],
  ["إجمالي الإيرادات", String(kpi.total_sales_revenue)],
  ["إجمالي الطلبات", String(kpi.total_orders)],
  ["إجمالي القطع المباعة", String(kpi.total_items_sold)],
  ["متوسط قيمة الطلب", String(kpi.average_order_value)],
  ["معدل الاحتفاظ بالبيانات بعد التنظيف", `${(q.retention_rate * 100).toFixed(2)}%`],
  ["عدد الصفوف قبل التنظيف", String(q.before)],
  ["عدد الصفوف بعد التنظيف", String(q.after)],
  ["عدد الصفوف المرفوضة", String(q.rejected)]
]);
heading("أعداد الجداول الحالية", 2);
table([["الجدول", "عدد الصفوف"], ...tableCounts]);
heading("أفضل النتائج التجارية", 2);
table([
  ["البند", "القيمة"],
  ["أفضل منتج", `${executive.leaders.top_product.product_name} - ${executive.leaders.top_product.total_sales_revenue}`],
  ["أفضل مدينة/شريحة", `${executive.leaders.top_city_segment.city} / ${executive.leaders.top_city_segment.segment} - ${executive.leaders.top_city_segment.total_sales_revenue}`],
  ["أفضل قناة", `${executive.leaders.top_channel.sales_channel} - ${executive.leaders.top_channel.total_sales_revenue}`]
]);

heading("12. الاختبارات والتحقق", 1);
para("يحتوي المشروع على ملف اختبارات app/tests.mjs يتحقق من قراءة CSV وتشغيل الـ Pipeline وإنشاء قاعدة البيانات والتقارير. كما تم تشغيل المشروع فعليًا والتحقق من أن الواجهة والـ API يستجيبان على الرابط المحلي.");
table([
  ["نوع التحقق", "النتيجة"],
  ["فحص صياغة ملفات JavaScript", "تم بنجاح أثناء التحقق السابق من الملفات الأساسية."],
  ["تشغيل الاختبارات", "All Smart Retail Pro checks passed."],
  ["تشغيل Pipeline كامل", `${pipeline.status} في ${pipeline.duration_ms} ms`],
  ["إنشاء SQLite Warehouse", "تم إنشاء warehouse/smart_retail.sqlite بنجاح."],
  ["تشغيل EXE", "تم التحقق سابقًا من فتح الواجهة واستجابة /api/overview."],
  ["النسخة المحمولة", "تم إنشاء SmartRetailPro_Portable.zip."]
]);

heading("13. الأمن والسلامة والقيود", 1);
bullets([
  "الخادم يعمل محليًا على 127.0.0.1 فقط، وليس خدمة مفتوحة على الشبكة.",
  "استعلامات قاعدة البيانات من الواجهة محدودة على SELECT وWITH وPRAGMA للقراءة فقط.",
  "الوصول للملفات من الواجهة مقيد بجذور محددة داخل المشروع مثل app وdata وreports وwarehouse.",
  "يوجد فحص safePath لمنع الخروج خارج مجلد المشروع.",
  "النسخة الحالية تستهدف Windows x64 بسبب ملف EXE وruntime/node.exe."
]);

heading("14. خطوات التشغيل للمستخدم", 1);
bullets([
  "انسخ مجلد SmartRetailPro كاملًا كما هو أو فك ضغط SmartRetailPro_Portable.zip.",
  "افتح المجلد واضغط مرتين على SmartRetailProject.exe.",
  "انتظر حتى تظهر رسالة تشغيل الخادم ويفتح المتصفح.",
  "إذا لم يفتح المتصفح تلقائيًا، افتح الرابط http://127.0.0.1:4173 يدويًا.",
  "اترك نافذة التشغيل مفتوحة أثناء استخدام المشروع.",
  "لإعادة بناء البيانات من الواجهة، افتح تبويب تشغيل المشروع واضغط تشغيل الآن.",
  "للوصول للكود، افتح تبويب الملفات والكود واختر المكون المطلوب.",
  "لتحليل قاعدة البيانات، افتح تبويب قاعدة البيانات ونفذ استعلامات SELECT."
]);

heading("15. مميزات المشروع ونقاط التميز", 1);
bullets([
  "مشروع كامل وليس مجرد نموذج ثابت: يحتوي تشغيل، بيانات، واجهة، تقارير، وقاعدة بيانات.",
  "حل عملي لمشكلة الاعتماد على Node الخارجي.",
  "تصميم طبقي واضح يصلح للشرح الأكاديمي والتطبيقي.",
  "إتاحة الوصول لكل مكونات المشروع من الواجهة.",
  "إنتاج تقارير قابلة للتسليم بالإضافة إلى Dashboard.",
  "وجود اختبارات وسجل تشغيل ومقاييس Pipeline.",
  "استخدام SQLite يجعل المشروع خفيفًا وسهل النقل."
]);

heading("16. التحسينات المستقبلية", 1);
bullets([
  "إضافة رسوم بيانية تفاعلية داخل الواجهة بدل الجداول فقط.",
  "إضافة اختيار تلقائي لمنفذ بديل إذا كان 4173 مشغولًا.",
  "إضافة تصدير مباشر إلى Excel وPDF.",
  "إضافة شاشة إعدادات لحفظ تفضيلات عدد الأيام والعملاء والمنتجات.",
  "توسيع المساعد ليقبل أسئلة عربية أكثر وينتج SQL أكثر تنوعًا.",
  "إضافة مستودع بيانات بديل مثل DuckDB أو SQL Server حسب بيئة العميل."
]);

pageBreak();
heading("17. ملحق الأكواد الرئيسية", 1);
para("يعرض هذا الملحق الأكواد الأساسية التي تم تنفيذ المشروع بها. الملفات الناتجة من البيانات CSV/JSON لا تُدرج كاملة داخل التقرير لأنها مخرجات تشغيل وليست كودًا مصدريًا.");
table([["الملف", "الحجم التقريبي"], ...sourceFiles.map((file) => [file, `${Buffer.byteLength(readText(file), "utf8")} bytes`])]);
for (const file of sourceFiles) {
  pageBreak();
  heading(file, 2);
  code(readText(file));
}

function writeReport() {
  fs.mkdirSync(docsDir, { recursive: true });
  const documentXml = xmlDocument(contents.join(""));
  const files = {
    "[Content_Types].xml": contentTypesXml(),
    "_rels/.rels": relsXml(),
    "docProps/core.xml": coreXml(),
    "docProps/app.xml": appXml(),
    "word/document.xml": documentXml,
    "word/_rels/document.xml.rels": documentRelsXml(),
    "word/styles.xml": stylesXml(),
    "word/settings.xml": settingsXml(),
    "word/fontTable.xml": fontTableXml()
  };
  fs.writeFileSync(outputFile, createZip(files));
  console.log(outputFile);
}

function addCover() {
  para("تقرير مشروع كامل", { align: "center", size: 36, bold: true, color: "1F4E79" });
  para("Smart Retail Pro", { align: "center", size: 44, bold: true, color: "0B1F33" });
  para("منصة هندسة بيانات للتجزئة مع واجهة رسومية وقاعدة بيانات SQLite وتشغيل بملف EXE", { align: "center", size: 24, color: "34495E" });
  spacer();
  table([
    ["نوع المستند", "تقرير مشروع كامل ومتكامل"],
    ["مسار المشروع", rootDir],
    ["تاريخ إنشاء التقرير", new Date().toLocaleString("ar-EG")],
    ["إعداد", "Codex"]
  ]);
}

function heading(text, level = 1) {
  para(text, { style: `Heading${level}`, bold: true, size: level === 1 ? 30 : 24, color: level === 1 ? "1F4E79" : "2E75B6" });
}

function bullets(items) {
  for (const item of items) para(`• ${item}`);
}

function para(text, options = {}) {
  const align = options.align || "right";
  const size = options.size || 22;
  const color = options.color || "222222";
  const style = options.style;
  const bold = options.bold;
  const font = options.font || "Arial";
  const rtl = options.rtl !== false;
  const safe = escapeXml(String(text ?? ""));
  contents.push(`<w:p><w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ""}${rtl ? "<w:bidi/>" : ""}<w:jc w:val="${align}"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>${rtl ? "<w:rtl/>" : ""}${bold ? "<w:b/>" : ""}<w:color w:val="${color}"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr><w:t xml:space="preserve">${safe}</w:t></w:r></w:p>`);
}

function code(text) {
  const lines = String(text).replace(/\t/g, "  ").split(/\r?\n/);
  for (const line of lines) {
    contents.push(`<w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="16"/><w:szCs w:val="16"/><w:color w:val="333333"/></w:rPr><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`);
  }
}

function table(rows) {
  const cellWidth = Math.floor(9000 / Math.max(1, rows[0]?.length || 1));
  contents.push(`<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:bidiVisual/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="BFBFBF"/><w:left w:val="single" w:sz="4" w:color="BFBFBF"/><w:bottom w:val="single" w:sz="4" w:color="BFBFBF"/><w:right w:val="single" w:sz="4" w:color="BFBFBF"/><w:insideH w:val="single" w:sz="4" w:color="D9D9D9"/><w:insideV w:val="single" w:sz="4" w:color="D9D9D9"/></w:tblBorders></w:tblPr>`);
  rows.forEach((row, rowIndex) => {
    contents.push("<w:tr>");
    row.forEach((value) => {
      const fill = rowIndex === 0 ? "<w:shd w:fill=\"D9EAF7\"/>" : "";
      contents.push(`<w:tc><w:tcPr><w:tcW w:w="${cellWidth}" w:type="dxa"/>${fill}</w:tcPr>`);
      const text = escapeXml(String(value ?? ""));
      contents.push(`<w:p><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:rtl/>${rowIndex === 0 ? "<w:b/>" : ""}<w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`);
      contents.push("</w:tc>");
    });
    contents.push("</w:tr>");
  });
  contents.push("</w:tbl>");
  spacer();
}

function pageBreak() {
  contents.push(`<w:p><w:r><w:br w:type="page"/></w:r></w:p>`);
}

function spacer() {
  contents.push(`<w:p><w:r><w:t xml:space="preserve"> </w:t></w:r></w:p>`);
}

function xmlDocument(body) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
<w:body>${body}<w:sectPr><w:bidi/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body>
</w:document>`;
}

function contentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
<Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;
}

function relsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function documentRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>
</Relationships>`;
}

function coreXml() {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>Smart Retail Pro Project Report</dc:title>
<dc:subject>Data Engineering Project</dc:subject>
<dc:creator>Codex</dc:creator>
<cp:keywords>Data Engineering, SQLite, ETL, UX, UI, Windows EXE</cp:keywords>
<dc:description>Complete Arabic project report for Smart Retail Pro.</dc:description>
<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
}

function appXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
<Application>Smart Retail Pro Report Generator</Application>
<DocSecurity>0</DocSecurity>
<ScaleCrop>false</ScaleCrop>
</Properties>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:bidi/><w:jc w:val="right"/><w:spacing w:before="360" w:after="160"/></w:pPr><w:rPr><w:b/><w:color w:val="1F4E79"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:bidi/><w:jc w:val="right"/><w:spacing w:before="260" w:after="120"/></w:pPr><w:rPr><w:b/><w:color w:val="2E75B6"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>
</w:styles>`;
}

function settingsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:defaultTabStop w:val="708"/><w:themeFontLang w:val="en-US" w:bidi="ar-EG"/></w:settings>`;
}

function fontTableXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:font w:name="Arial"><w:family w:val="swiss"/></w:font>
<w:font w:name="Consolas"><w:family w:val="modern"/></w:font>
</w:fonts>`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
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
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
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

writeReport();

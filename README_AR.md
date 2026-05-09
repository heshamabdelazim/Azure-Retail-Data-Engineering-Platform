# Smart Retail Pro

نسخة جديدة كاملة من مشروع **Smart Retail Data Engineering Platform** تعمل محليًا بواجهة رسومية سهلة الاستخدام.

## طريقة التشغيل الأسهل

اضغط على:

```text
SmartRetailProject.exe
```

أو استخدم:

```text
START_PROJECT.cmd
```

سيتم فتح واجهة المشروع في المتصفح على رابط محلي مثل:

```text
http://127.0.0.1:4173
```

## مميزات النسخة الجديدة

- لا تعتمد على وجود `node` في PATH.
- تحتوي على Runtime محلي داخل مجلد `runtime`.
- واجهة رسومية لإدارة المشروع.
- Pipeline كامل: Source, Bronze, Silver, Gold.
- SQLite Warehouse مع SQL views.
- تقارير Executive وData Quality وDashboard.
- تقرير Word ومجموعة عروض PowerPoint احترافية داخل مجلد `docs`، تشمل عرض عام، عرض شرح الأكواد، وعروض متخصصة لقاعدة البيانات، Pipeline، UX/UI، التشغيل، Python، الاختبارات، القيمة التجارية، والمناقشة.
- نسخة Azure-ready فعلية داخل مجلد `azure` مع Bicep وApp Service Backend وAzure Data Lake وAzure SQL.
- تصفح الأكواد والبيانات وقاعدة البيانات من الواجهة.
- تشغيل الاختبارات من الواجهة.
- تمت إضافة تنفيذ Python للمنطق الأساسي داخل `app/python`.

## نسخة Python للمنطق الأساسي

إذا أردت تشغيل منطق المشروع الأساسي ببايثون، استخدم:

```text
RUN_PYTHON_PIPELINE.cmd
```

أو:

```text
py -3 app\python\smart_retail_pipeline.py run
```

ملف Python الرئيسي:

```text
app\python\smart_retail_pipeline.py
```

## ملاحظة مهمة

النسخة تستهدف أجهزة Windows x64. إذا تم نقل المجلد إلى جهاز آخر، انقل مجلد `SmartRetailPro` كاملًا كما هو.

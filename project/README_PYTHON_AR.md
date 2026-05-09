# تنفيذ المنطق الأساسي بلغة Python

تمت إضافة نسخة Python من المنطق الأساسي للمشروع داخل:

```text
app/python/smart_retail_pipeline.py
```

هذه النسخة تنفذ مراحل المشروع الأساسية:

- توليد بيانات المصدر Source.
- استيعاب البيانات في Bronze.
- تنظيف البيانات والتحقق من الجودة في Silver.
- بناء مؤشرات الأعمال في Gold.
- تحميل الجداول والـ Views في SQLite.
- إنشاء التقارير والـ Dashboard.

## التشغيل

لتشغيل نسخة Python:

```text
RUN_PYTHON_PIPELINE.cmd
```

أو من الطرفية:

```text
py -3 app\python\smart_retail_pipeline.py run
```

يمكن تعديل حجم البيانات:

```text
py -3 app\python\smart_retail_pipeline.py run --days 14 --customers 160 --products 50
```

## الاختبار

```text
RUN_PYTHON_TESTS.cmd
```

## ملاحظة

ملف التشغيل الأساسي `SmartRetailProject.exe` ما زال يستخدم النسخة المستقرة المعتمدة على Runtime المرفق لتسهيل التشغيل على أي جهاز Windows x64. أما نسخة Python فهي مضافة كتنفيذ واضح للمنطق الأساسي، وتحتاج وجود Python 3.10 أو أحدث إذا أردت تشغيلها مباشرة.

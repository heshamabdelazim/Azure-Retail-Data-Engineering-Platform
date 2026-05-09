# تشغيل Smart Retail Pro على Azure

هذه النسخة تضيف تنفيذًا سحابيًا فعليًا للمشروع على Microsoft Azure.

## ما الذي سيتم إنشاؤه على Azure؟

- **Azure App Service** لاستضافة الواجهة الرسومية والـ API.
- **Azure Data Lake Storage Gen2** لتخزين طبقات البيانات:
  - Source
  - Bronze
  - Silver
  - Gold
  - Reports
- **Azure SQL Database** كمستودع بيانات سحابي بدل SQLite.
- **Azure Data Factory** مع Pipeline يستدعي API تشغيل المشروع.
- **Application Insights** لمراقبة التطبيق.
- **Azure Key Vault** كبنية جاهزة لإدارة الأسرار لاحقًا.

## حساب Azure

الحساب المقترح لتسجيل الدخول:

```text
mohamed_wahid2007@alexu.edu.eg
```

لا يتم حفظ كلمة مرور الحساب أو كلمة مرور SQL داخل المشروع.

## المتطلبات على الجهاز

قبل النشر يجب تثبيت:

1. Azure CLI
2. صلاحية Azure Subscription فعالة
3. صلاحية إنشاء Resource Group وموارد Azure
4. اتصال إنترنت

اختياري:

- Git
- Visual Studio Code

## طريقة النشر الأسهل

اضغط على:

```text
RUN_AZURE_DEPLOY.cmd
```

أو شغل:

```powershell
powershell -ExecutionPolicy Bypass -File azure\scripts\deploy.ps1
```

سيطلب السكربت:

- تسجيل الدخول إلى Azure إذا لم تكن مسجلًا.
- كلمة مرور قوية لمسؤول Azure SQL.

## بعد النشر

سيظهر رابط Azure Web App مثل:

```text
https://smartretailpro-web-xxxxx.azurewebsites.net
```

افتح الرابط ثم من الواجهة:

1. ادخل إلى تبويب **تشغيل المشروع**.
2. اضغط **تشغيل الآن**.
3. سيتم إنشاء البيانات في Azure Data Lake.
4. سيتم تحميل الجداول والـ Views في Azure SQL Database.
5. ستظهر التقارير من نفس الواجهة.

## ملاحظة تكلفة

هذه الموارد قد تكون مدفوعة حسب اشتراك Azure:

- App Service B1
- Azure SQL Database Basic
- Storage Account
- Data Factory
- Application Insights

يمكن حذف كل الموارد بحذف Resource Group:

```powershell
az group delete --name rg-smartretailpro
```

## الفرق بين النسخة المحلية ونسخة Azure

| البند | النسخة المحلية | نسخة Azure |
| --- | --- | --- |
| التشغيل | SmartRetailProject.exe | Azure App Service URL |
| التخزين | مجلد data المحلي | Azure Data Lake Storage |
| قاعدة البيانات | SQLite | Azure SQL Database |
| الواجهة | 127.0.0.1 | رابط Azure عام |
| Pipeline | محلي | API على App Service + Data Factory |

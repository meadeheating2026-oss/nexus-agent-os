# Nexus AgentOS Enterprise v3.0

**نظام التشغيل المؤسسي الشامل لبناء وإدارة وتشغيل وكلاء الذكاء الاصطناعي، مسارات العمل المرئية (DAG)، قواعد المعرفة (RAG)، والأتمتة متعددة المستأجرين (Multi-Tenant AI Operating System).**

- **الرابط السحابي المباشر (GitHub Pages):** https://meadeheating2026-oss.github.io/nexus-agent-os/
- **التشغيل الفوري بدون خادم (Offline Single-File):** افتح الملف `instant-local.html` مباشرة في المتصفح.

---

## الوحدات المؤسسية العشر في الإصدار v3.0

1. **القيادة التنفيذية والتحليلات (`ExecutiveOverview`):** مؤشرات الأداء الحية، منحنيات استهلاك الرصيد والتوكنز برسوم SVG التفاعلية، وتوزيع نشاط الوكلاء حسب القطاعات.
2. **استوديو الحوار التفاعلي ومساحة المخرجات (`InteractiveChatStudio`):** محادثات متعددة الأدوار (وكيل منفرد أو مجلس خبراء استشاري Swarm Council)، رفع ملفات (`.txt/.md/.csv/.json`)، ربط مباشر بقاعدة المعرفة RAG، ولوحة Artifacts جانبية لتصدير التقارير (`Markdown`, `JSON`, `Print/PDF`).
3. **باني مسارات العمل المرئي (`VisualWorkflowStudio`):** لوحة DAG تفاعلية تربط عقد التشغيل (`Trigger` -> `RAG` -> `Agent` -> `Condition` -> `Output`) مع محاكاة وتنفيذ حي خطوة بخطوة و4 قوالب مؤسسية جاهزة.
4. **سوق واستوديو الوكلاء (`AgentMarketplaceStudio`):** يضم **24 وكيلاً متخصصاً** عبر **8 قطاعات أعمال** (المالية، القانونية، الهندسة والأمن السيبراني، التسويق، المبيعات، خدمة العملاء، الموارد البشرية، التجارة والبيانات) مع منشئ وكلاء مخصص كامل.
5. **قاعدة المعرفة والذاكرة الدائمة (`KnowledgeAndMemoryHub`):** فهرسة وثائق وسياسات الشركة وتقطيعها تلقائياً (Semantic Chunking) مع مختبر استرجاع فوري وذاكرة طويلة المدى (`Key-Value`) لكل وكيل.
6. **الأتمتة وقنوات الربط الخارجي (`AutomationsAndChannelsView`):** جدولة مهام دورية بصيغة `Cron`، وربط القنوات المؤسسية (`Telegram`, `WhatsApp Cloud`, `Slack`, `Discord`, `Webhook`, `SMTP Email`, `Notion`).
7. **غرفة العمليات والمهام (`MissionControlPanel`):** إطلاق مهام مستقلة أو متسلسلة أو مُنسّقة عبر قائد فريق (Orchestrator) مع سجل تتبع تفصيلي (Traceability) لخطوات التفكير واستدعاء الأدوات.
8. **الأدوات وبوابة المطورين (`ToolsAndDeveloperHub`):** بيئة اختبار معزولة (Tool Sandbox) للأدوات المدمجة (`python_eval`, `kb_search`, `scrape_webpage`, `http_request`)، تسجيل أدوات Webhook خارجية، وتوليد مفاتيح `nxk_live_...` مع أمثلة `cURL` و`Python`.
9. **الاشتراكات ومحفظة الرصيد (`BillingAndWalletPanel`):** باقات متعددة المستأجرين، سجل معاملات مالي، شحن فوري عبر القسائم أو بوابات الدفع، وإعدادات المفاتيح الخاصة (`BYOK`: `Gemini`, `OpenRouter`, `OpenAI`).
10. **لوحة تحكم المالك (`SuperAdminConsole`):** إدارة المستأجرين والأرصدة، اعتماد الفواتير البنكية، إصدار قسائم الشحن، وضبط مفاتيح النماذج المركزية وهوامش الربح.

---

## واجهة وتجربة مستخدم تنفيذية (Executive UI)

- تبديل فوري بين **الوضع الداكن التنفيذي (Dark Mode)** و**الوضع النهاري المؤسسي (Light Mode)**.
- لوحة أوامر سريعة عبر الاختصار **`Ctrl + K`** للانتقال الفوري بين الوحدات العشر.
- دعم كامل للاتجاه العربي الأصيل (**RTL**) مع خطوط `IBM Plex Sans Arabic` و`Inter` و`IBM Plex Mono`.

---

## حسابات وقسائم التجربة السريعة (Cloud & Local)

| الحساب | البريد الإلكتروني | كلمة المرور | الصلاحية |
| :--- | :--- | :--- | :--- |
| **المدير العام (Super Admin)** | `admin@nexus-os.io` | `Admin@2026!` | تحكم كامل بالمنصة والمستأجرين |
| **مشترك تجريبي (Founder)** | `founder@mena-tech.io` | `Demo@2026!` | مساحة عمل شركة تقنية جاهزة |

- **قسائم الشحن والترقية الفورية:** `PRO2026` ، `VIPSWARM` ، `ENTERPRISE99`

---

## التشغيل الكامل عبر الخادم (Full-Stack FastAPI + React 19)

```bash
# 1. بناء الواجهة الأمامية
cd frontend && npm ci && npm run build && cd ..

# 2. تشغيل الخادم الخلفي (70 نقطة نهاية REST API + SQLite WAL)
pip install -r backend/requirements.txt
uvicorn main:app --app-dir backend --host 0.0.0.0 --port 8000
```

أو عبر Docker Compose:
```bash
docker compose up --build -d
```

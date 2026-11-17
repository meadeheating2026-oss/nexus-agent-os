# Nexus AgentOS Enterprise — منصة تشغيل وبيع الوكلاء متعددة المستأجرين (Multi-Tenant AI SaaS)

منصة تجارية متكاملة (Production-Ready Multi-Tenant SaaS) لبناء، تشغيل، وبيع اشتراكات وكلاء الذكاء الاصطناعي المستقلين وفرق السرب (**ReAct + Swarm Orchestration**) مع نظام تسجيل دخول وصلاحيات حقيقي، باقات اشتراك، فواتير ودفع إلكتروني، محفظة نقاط استهلاك، وبوابة API للمطورين.

---

## 1. المعمارية الهندسية الحقيقية (بدون أي محاكاة وهمية)

1. **نظام هوية وصلاحيات متكامل (`backend/auth.py`)**:
   - تشفير كلمات المرور عبر `PBKDF2-HMAC-SHA256` (200,000 دورة مع Salt عشوائي).
   - جلسات مصادقة موقعة رقمياً عبر `JWT (HS256)`.
   - فصل صارم للصلاحيات (`RBAC`) وعزل بيانات كل مشترك (`Multi-Tenant Isolation`) بين مالك المنصة (`super_admin`) والعملاء المشتركين (`subscriber`).
   - مفاتيح مطورين خارجية (`sk_nexus_...`) مخزنة كـ `SHA-256 Hash` للربط البرمجي عبر `X-API-Key`.

2. **محرك الباقات والفوترة وهامش الربح (`backend/billing.py`)**:
   - 4 باقات تجارية جاهزة (`Free Trial`, `Pro Builder`, `Business Swarm`, `Enterprise Unlimited`) بقيود صارمة على عدد الوكلاء، تشغيل السرب، الأدوات المخصصة، والـ API (`HTTP 402 Quota Guard`).
   - دعم بوابة **Stripe Checkout + Webhook HMAC Signature Verification**، بالإضافة إلى طلبات التحويل البنكي / InstaPay واعتمادها من لوحة المالك، وأكواد التفعيل الفورية (`Vouchers`).
   - تسوية مالية ذرية (`settle_mission_billing`) تحسب تكلفة التوكنز الفعلية بالدولار، وتقتطع نقاط العميل وفق معامل ربح المالك (`credits_markup_multiplier`)، وتُسجل صافي الربح في دفتر الأستاذ (`wallet_transactions`).

3. **محرك الوكلاء الفعلي والأدوات الحية (`backend/agent_runtime.py` & `backend/tools_runtime.py`)**:
   - حلقة استدلال واستدعاء دوال حقيقية (**Multi-Turn ReAct Function Calling**) متوافقة مع `Google Gemini`، `OpenRouter`، و`OpenAI`، مع دعم مفاتيح العملاء الخاصة (`BYOK`).
   - 5 أدوات تنفيذية فعلية مدمجة: بحث ويب حي (`web_search`)، قراءة صفحات الإنترنت (`webpage_reader`)، حاسبة بايثون آمنة عبر شجرة AST (`python_eval`)، ذاكرة دائمة في قاعدة البيانات (`memory_kv`)، وأدوات `HTTP REST API` مخصصة يبنيها المشتركون، بالإضافة إلى أداة تفويض الزملاء المباشرة (`delegate_to_colleague`).

---

## 2. بيانات الدخول الافتراضية وأكواد التجربة

عند أول تشغيل للخادم، يتم تهيئة حساب المالك والباقات وأكواد الترقية تلقائياً:

- **بريد مالك المنصة (`Super Admin`)**: `admin@nexus-os.io`
- **كلمة المرور الافتراضية**: `Admin@2026!` *(يُنصح بتغييرها فور النشر التجاري)*
- **أكواد قسائم جاهزة لتجربة ترقية حسابات العملاء مجاناً**:
  - `PRO2026`: ترقية فورية إلى باقة المحترفين + `1,000` نقطة إضافية.
  - `VIPSWARM`: ترقية فورية إلى باقة الشركات والسرب + `5,000` نقطة إضافية.

---

## 3. طرق التشغيل والنشر السحابي

### أ) التشغيل المباشر على جهازك (Windows / Linux / macOS)
- **على Windows**: شغل الملف `start.bat`
- **على Linux / macOS**:
  ```bash
  chmod +x start.sh
  ./start.sh
  ```

### ب) النشر التجاري الموحد عبر Docker (Railway / Render / Fly.io / VPS)
يدمج `Dockerfile` الواجهة الأمامية المبنية مع خادم `FastAPI` في حاوية واحدة على المنفذ `8000` مع وحدة تخزين دائمة لقاعدة البيانات `nexus_enterprise.db`:
```bash
docker compose up --build -d
```

---

## 4. استدعاء الوكلاء برمجياً عبر Developer API

يمكن للمشتركين في باقات الشركات والمؤسسات توليد مفتاح `sk_nexus_...` واستدعاء وكلائهم من أي نظام خارجي:

```bash
curl -X POST https://your-domain.com/api/v1/run \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_nexus_YOUR_GENERATED_KEY" \
  -d '{
    "agent_id": 4,
    "execution_mode": "standalone",
    "prompt": "ابحث في الويب عن أحدث أسعار الفائدة الفيدرالية واحسب العائد المركب لمبلغ 250000 دولار على 3 سنوات"
  }'
```

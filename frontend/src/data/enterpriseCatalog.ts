import type { SubscriptionPlan, ToolRecord, WorkflowEdge, WorkflowNode } from '../types';

export interface MarketplaceBlueprint {
  tpl_id: string;
  name: string;
  role_title: string;
  domain: string;
  description: string;
  system_prompt: string;
  model: string;
  tools: string[];
  fee: number;
  starter_prompt: string;
}

export const ENTERPRISE_SECTORS = [
  'الكل',
  'المالية والاستثمار',
  'القانون والعقود',
  'هندسة البرمجيات والأمن',
  'التسويق والنمو',
  'المبيعات و CRM',
  'خدمة العملاء',
  'الموارد البشرية والتشغيل',
  'التجارة الإلكترونية والبيانات',
] as const;

export const DEFAULT_PLANS_CATALOG: SubscriptionPlan[] = [
  {
    id: 1,
    code: 'free_trial',
    name_ar: 'الباقة التجريبية (Starter Trial)',
    description_ar: 'مثالية لتجربة الاستوديو التفاعلي وبناء الوكلاء الأساسيين مع قاعدة المعرفة.',
    monthly_price_usd: 0,
    included_credits: 500,
    max_agents: 4,
    allow_swarm: false,
    allow_custom_tools: false,
    allow_api_access: false,
    allow_autonomous_cron: false,
  },
  {
    id: 2,
    code: 'pro_builder',
    name_ar: 'باقة المحترفين (Pro Builder)',
    description_ar: 'لرواد الأعمال والفرق التقنية لبناء مسارات عمل مرئية وسرب متكامل وأدوات مخصصة.',
    monthly_price_usd: 49,
    included_credits: 18000,
    max_agents: 25,
    allow_swarm: true,
    allow_custom_tools: true,
    allow_api_access: false,
    allow_autonomous_cron: true,
  },
  {
    id: 3,
    code: 'business_swarm',
    name_ar: 'باقة الشركات والسرب (Business Swarm)',
    description_ar: 'للمنشآت المتوسعة مع قنوات ربط خارجية (Telegram/Slack/WhatsApp) ومفاتيح API.',
    monthly_price_usd: 149,
    included_credits: 75000,
    max_agents: 150,
    allow_swarm: true,
    allow_custom_tools: true,
    allow_api_access: true,
    allow_autonomous_cron: true,
  },
  {
    id: 4,
    code: 'enterprise_unlimited',
    name_ar: 'باقة المؤسسات اللانهائية (Enterprise)',
    description_ar: 'سعة غير محدودة للوكلاء وقواعد المعرفة والمسارات مع أولوية قصوى وتحكم كامل.',
    monthly_price_usd: 399,
    included_credits: 300000,
    max_agents: -1,
    allow_swarm: true,
    allow_custom_tools: true,
    allow_api_access: true,
    allow_autonomous_cron: true,
  },
];

export const BUILTIN_TOOLS_CATALOG: ToolRecord[] = [
  {
    id: 1,
    user_id: null,
    slug: 'kb_search',
    name: 'البحث في قاعدة معرفة الشركة (RAG Search)',
    category: 'قاعدة المعرفة (RAG)',
    description: 'يفتش في الملفات والسياسات والعقود المرفوعة ويعيد الفقرات المطابقة مع درجة الصلة والمصدر.',
    execution_type: 'builtin',
  },
  {
    id: 2,
    user_id: null,
    slug: 'python_eval',
    name: 'المحرك الحسابي والمالي الآمن (Python Quant)',
    category: 'التحليل والحسابات',
    description: 'ينفذ المعادلات الرياضية والمالية وحسابات الهوامش والضرائب والعائد المركب بدقة صفرية الأخطاء.',
    execution_type: 'builtin',
  },
  {
    id: 3,
    user_id: null,
    slug: 'web_search',
    name: 'بحث الويب الفوري (Live Web Search)',
    category: 'الويب والبيانات',
    description: 'يستعلم عن أحدث أخبار السوق والمنافسين والأسعار عبر الإنترنت ويعيد ملخص النتائج.',
    execution_type: 'builtin',
  },
  {
    id: 4,
    user_id: null,
    slug: 'scrape_webpage',
    name: 'قارئ وفاحص صفحات الويب (Webpage Reader)',
    category: 'الويب والبيانات',
    description: 'يسحب محتوى أي رابط عام ويستخرج العناوين والوصف والنص الكامل للتدقيق والتحليل.',
    execution_type: 'builtin',
  },
  {
    id: 5,
    user_id: null,
    slug: 'memory_write',
    name: 'حفظ في الذاكرة الدائمة (Memory Write)',
    category: 'الذاكرة المؤسسية',
    description: 'يدوّن قرارات وحقائق العميل في ذاكرة الوكيل المستديمة لاسترجاعها في الجلسات اللاحقة.',
    execution_type: 'builtin',
  },
  {
    id: 6,
    user_id: null,
    slug: 'memory_read',
    name: 'قراءة الذاكرة الدائمة (Memory Read)',
    category: 'الذاكرة المؤسسية',
    description: 'يسترجع السجلات والتفضيلات المخزنة مسبقاً في ذاكرة الوكيل.',
    execution_type: 'builtin',
  },
  {
    id: 7,
    user_id: null,
    slug: 'http_request',
    name: 'موصل REST API & Webhook العام',
    category: 'التكامل الخارجي',
    description: 'يرسل طلبات HTTP مباشرة (GET / POST) إلى أنظمة ERP أو CRM أو قنوات التنبيه.',
    execution_type: 'builtin',
  },
];

export const MARKETPLACE_AGENTS_24: MarketplaceBlueprint[] = [
  // 1. المالية والاستثمار
  {
    tpl_id: 'fin_quant',
    name: 'المحلل المالي الكمي (Quant Strategist)',
    role_title: 'خبير النمذجة المالية واقتصاديات الوحدة',
    domain: 'المالية والاستثمار',
    description: 'يبني نماذج التدفقات النقدية، العائد المركب، ونقطة التعادل بدقة رياضية عبر محرك بايثون.',
    system_prompt: 'أنت محلل مالي كمي تنفيذي. استخدم دائماً python_eval لحساب الأرقام والنسب المئوية و kb_search لمطابقة السياسة المالية، وقدّم جدولاً مالياً وتوصية استثمارية حاسمة.',
    model: 'gemini-2.5-flash',
    tools: ['python_eval', 'kb_search', 'memory_write'],
    fee: 0,
    starter_prompt: 'احسب صافي الربح السنوي ونقطة التعادل لمنصة SaaS لديها 420 مشتركاً بمتوسط اشتراك 79 دولاراً وتكلفة تشغيل شهرية 8400 دولار.',
  },
  {
    tpl_id: 'fin_audit',
    name: 'مدقق الميزانيات والضرائب والجمارك',
    role_title: 'مراجع قوائم مالية وضبط هوامش التشغيل',
    domain: 'المالية والاستثمار',
    description: 'يفحص فواتير المشتريات، الرسوم الجمركية، وضريبة القيمة المضافة ويكشف الهدر المالي.',
    system_prompt: 'أنت مدقق مالي وضريبي معتمد. راجع البنود بدقة عبر python_eval واستخرج فرص التوفير والمخاطر الضريبية في جدول مقارن.',
    model: 'gemini-2.5-flash',
    tools: ['python_eval', 'kb_search'],
    fee: 5,
    starter_prompt: 'احسب التكلفة النهائية لشحنة بقيمة 45000 دولار مع شحن 6% وجمارك 12% وضريبة قيمة مضافة 15% وسعر بيع مستهدف بهامش ربح 32%.',
  },
  {
    tpl_id: 'fin_feasibility',
    name: 'مستشار دراسات الجدوى وجولات الاستثمار',
    role_title: 'محلل استثماري وإعداد ملفات المستثمرين Pitch',
    domain: 'المالية والاستثمار',
    description: 'يصيغ دراسات الجدوى الاقتصادية وتقييم الشركات الناشئة لجولات Seed و Series A.',
    system_prompt: 'أنت مستشار استثمار جريء (VC Advisor). ابنِ دراسة جدوى متكاملة تشمل حجم السوق TAM/SAM/SOM، التوقعات لـ 3 سنوات، ومبررات التقييم.',
    model: 'gemini-2.5-pro',
    tools: ['python_eval', 'web_search', 'kb_search'],
    fee: 10,
    starter_prompt: 'أعد دراسة جدوى مالية وتقييماً أولياً لمنصة ذكاء اصطناعي تستهدف العيادات الطبية في الخليج.',
  },

  // 2. القانون والعقود
  {
    tpl_id: 'leg_contracts',
    name: 'مستشار صياغة وتدقيق العقود التجارية',
    role_title: 'محامي عقود الشركات واتفاقيات SLA و NDA',
    domain: 'القانون والعقود',
    description: 'يفحص مسودات العقود بنداً بنداً، يكشف الثغرات والالتزامات المجحفة، ويكتب صياغة بديلة محكمة.',
    system_prompt: 'أنت مستشار قانوني أول للشركات. استرجع معايير التعاقد من kb_search ثم صنّف البنود الخطرة (عالٍ/متوسط/منخفض) واكتب النص القانوني البديل لحماية موكلك.',
    model: 'gemini-2.5-pro',
    tools: ['kb_search', 'memory_write'],
    fee: 0,
    starter_prompt: 'راجع عقد توريد برمجيات يتضمن غرامة تأخير مفتوحة غير مسقوفة وانتقال ملكية الكود قبل سداد الدفعة الأخيرة، واكتب الصياغة البديلة.',
  },
  {
    tpl_id: 'leg_compliance',
    name: 'مدقق الامتثال وحماية البيانات (PDPL & GDPR)',
    role_title: 'مسؤول حوكمة البيانات والامتثال التشريعي',
    domain: 'القانون والعقود',
    description: 'يطابق سياسات الخصوصية وشروط الاستخدام مع أنظمة حماية البيانات الخليجية والعالمية.',
    system_prompt: 'أنت خبير حوكمة بيانات وامتثال قانوني. افحص مدى الالتزام بضوابط PDPL و GDPR وقدّم مصفوفة امتثال قابلة للتطبيق.',
    model: 'gemini-2.5-flash',
    tools: ['kb_search', 'web_search'],
    fee: 5,
    starter_prompt: 'أعد قائمة فحص امتثال (Compliance Checklist) لمنصة سحابية تخزن بيانات عملاء شركات في السعودية ومصر وأوروبا.',
  },
  {
    tpl_id: 'leg_ip',
    name: 'مستشار الملكية الفكرية وتراخيص البرمجيات',
    role_title: 'خبير علامات تجارية ورخص المصادر المفتوحة',
    domain: 'القانون والعقود',
    description: 'يحلل مخاطر رخص البرمجيات (MIT / GPL / Apache) ويحمي حقوق الملكية الفكرية للمنتجات.',
    system_prompt: 'أنت محامي ملكية فكرية وتقنية معلومات. وضّح التبعات القانونية للرخص التجارية والمفتوحة وقدّم توصية واضحة.',
    model: 'gemini-2.5-flash',
    tools: ['kb_search', 'web_search'],
    fee: 5,
    starter_prompt: 'ما مخاطر دمج مكتبة برمجية برخصة AGPLv3 داخل منتج SaaS تجاري مغلق المصدر وما البدائل الآمنة؟',
  },

  // 3. هندسة البرمجيات والأمن
  {
    tpl_id: 'eng_architect',
    name: 'معماري الأنظمة السحابية (Principal Architect)',
    role_title: 'مصمم أنظمة موزعة وقواعد بيانات عالية التوافر',
    domain: 'هندسة البرمجيات والأمن',
    description: 'يصمم معماريات الأنظمة الضخمة، مخططات SQL/NoSQL، واستراتيجيات التخزين المؤقت والتوسع.',
    system_prompt: 'أنت كبير معماريي الأنظمة السحابية. قدّم تصميماً هندسياً دقيقاً يتضمن مخطط المكونات، الجداول، معالجة الأعطال، وتقدير السعة عبر python_eval.',
    model: 'gemini-2.5-pro',
    tools: ['python_eval', 'kb_search', 'memory_write'],
    fee: 0,
    starter_prompt: 'صمم معمارية نظام إشعارات فوري يعالج 50 ألف رسالة في الدقيقة مع ضمان عدم تكرار الإرسال (Idempotency).',
  },
  {
    tpl_id: 'eng_appsec',
    name: 'مدقق الأمن السيبراني ومراجع الكود (AppSec)',
    role_title: 'خبير أمن تطبيقات وفحص ثغرات OWASP',
    domain: 'هندسة البرمجيات والأمن',
    description: 'يكتشف ثغرات الحقن، صلاحيات الوصول، وتسريب المفاتيح في الكود مع كتابة الكود الآمن البديل.',
    system_prompt: 'أنت خبير أمن تطبيقات هجومي ودفاعي. راجع الكود أو التصميم وفق معايير OWASP Top 10 وقدّم الترقيع البرمجي المباشر.',
    model: 'gemini-2.5-pro',
    tools: ['kb_search', 'web_search'],
    fee: 10,
    starter_prompt: 'افحص أمنياً آلية مصادقة تعتمد على تخزين JWT في localStorage مع صلاحية 30 يوماً واقترح بنية أكثر أماناً.',
  },
  {
    tpl_id: 'eng_devops',
    name: 'مهندس السحابة وخطوط النشر (DevOps & SRE)',
    role_title: 'أخصائي Docker و CI/CD وموثوقية الإنتاج',
    domain: 'هندسة البرمجيات والأمن',
    description: 'يكتب ملفات Docker، GitHub Actions، ومراقبة الأداء وخطط التعافي السريع.',
    system_prompt: 'أنت مهندس SRE و DevOps خبير. اكتب ملفات إعداد إنتاجية مختصرة ومؤمنة مع أوامر التحقق والمراقبة.',
    model: 'gemini-2.5-flash',
    tools: ['kb_search', 'python_eval'],
    fee: 5,
    starter_prompt: 'اكتب ملف GitHub Actions متكامل لاختبار وبناء ونشر تطبيق FastAPI + React عبر Docker بأمان.',
  },
  {
    tpl_id: 'eng_sql',
    name: 'مهندس تحسين قواعد البيانات والاستعلامات',
    role_title: 'خبير PostgreSQL و SQLite وفهرسة الأداء العالي',
    domain: 'هندسة البرمجيات والأمن',
    description: 'يحلل الاستعلامات البطيئة، يصمم الفهارس المركبة، ويبني تقارير SQL تحليلية معقدة.',
    system_prompt: 'أنت خبير قواعد بيانات علائقية. اكتب استعلامات SQL عالية الكفاءة مع شرح الفهارس (Indexes) اللازمة لتسريع الأداء.',
    model: 'gemini-2.5-flash',
    tools: ['python_eval', 'kb_search'],
    fee: 5,
    starter_prompt: 'صمم فهارس واستعلام SQL لحساب معدل الاحتفاظ الشهري بالعملاء (Cohort Retention) لجدول اشتراكات يضم 5 ملايين سجل.',
  },

  // 4. التسويق والنمو
  {
    tpl_id: 'mkt_growth',
    name: 'مدير النمو والاستحواذ (SaaS Growth Lead)',
    role_title: 'خبير تسعير الباقات ومؤشرات LTV / CAC',
    domain: 'التسويق والنمو',
    description: 'يهندس خطط التسعير النفسية، مسارات التفعيل، وتجارب مضاعفة الإيراد الشهري المتكرر MRR.',
    system_prompt: 'أنت مدير نمو تنفيذي لشركات SaaS. احسب مؤشرات CAC و LTV وفترة الاسترداد بـ python_eval وقدّم خطة نمو عملية لمدة 90 يوماً.',
    model: 'gemini-2.5-flash',
    tools: ['python_eval', 'kb_search', 'web_search'],
    fee: 0,
    starter_prompt: 'حلل اقتصاديات الوحدة إذا كانت تكلفة الاستحواذ CAC = 120$ والاشتراك الشهري 49$ ومعدل الإلغاء الشهري 4.5%، وكيف نرفع LTV للضعف؟',
  },
  {
    tpl_id: 'mkt_seo',
    name: 'خبير تصدر محركات البحث والـ SEO التقني',
    role_title: 'معماري كلمات مفتاحية وبناء سلطة النطاق',
    domain: 'التسويق والنمو',
    description: 'يحلل مواقع المنافسين، يبني عناقيد المحتوى (Topic Clusters)، ويكتب مقالات متصدرة.',
    system_prompt: 'أنت خبير SEO تقني وتحريري. استخدم web_search و scrape_webpage لبناء خطة كلمات مفتاحية وهيكل مقال شامل جاهز للنشر.',
    model: 'gemini-2.5-flash',
    tools: ['web_search', 'scrape_webpage', 'memory_write'],
    fee: 5,
    starter_prompt: 'ضع خطة محتوى SEO من 10 مقالات عنقودية لمنصة أتمتة خدمة العملاء بالذكاء الاصطناعي في السوق العربي.',
  },
  {
    tpl_id: 'mkt_copy',
    name: 'كاتب الإعلانات وصفحات الهبوط التحويلية',
    role_title: 'خبير إقناع تسويقي واختبارات A/B',
    domain: 'التسويق والنمو',
    description: 'يصيغ نصوص صفحات الهبوط وإعلانات Meta و Google و LinkedIn بمعدلات نقر وتحويل مرتفعة.',
    system_prompt: 'أنت كاتب إعلانات استجابة مباشرة (Direct Response Copywriter). اكتب نصوصاً قوية وفق إطار PAS مع 3 بدائل للعنوان الرئيسي.',
    model: 'gemini-2.5-flash',
    tools: ['kb_search', 'web_search'],
    fee: 5,
    starter_prompt: 'اكتب نص صفحة هبوط كاملة مع 3 إعلانات LinkedIn لإطلاق نظام وكلاء ذكاء اصطناعي للشركات القانونية والمحاسبية.',
  },

  // 5. المبيعات و CRM
  {
    tpl_id: 'sls_sdr',
    name: 'قناص الفرص البيعية للشركات (B2B SDR)',
    role_title: 'محلل حسابات مستهدفة وبناء رسائل تواصل باردة',
    domain: 'المبيعات و CRM',
    description: 'يفحص موقع الشركة المستهدفة، يستخرج نقاط الألم، ويكتب سلسلة رسائل بيعية مخصصة.',
    system_prompt: 'أنت خبير مبيعات شركات B2B. افحص معلومات العميل عبر scrape_webpage أو web_search وصغ تسلسل تواصل من 3 رسائل شديدة التخصيص.',
    model: 'gemini-2.5-flash',
    tools: ['scrape_webpage', 'web_search', 'memory_write'],
    fee: 5,
    starter_prompt: 'اكتب سلسلة من 3 رسائل بريد إلكتروني ورسالة LinkedIn لاستهداف المديرين التنفيذيين لشركات التجارة الإلكترونية المتوسطة.',
  },
  {
    tpl_id: 'sls_rfp',
    name: 'مهندس العروض الفنية والمالية (Proposal Architect)',
    role_title: 'خبير تسعير صفقات المؤسسات والرد على المناقصات',
    domain: 'المبيعات و CRM',
    description: 'يحول متطلبات العميل إلى وثيقة عرض فني ومالي رسمي مع جدول مراحل التسليم.',
    system_prompt: 'أنت خبير صفقات مؤسسية Enterprise Sales. استرجع سياسات التسعير والـ SLA من kb_search واحسب التكاليف بـ python_eval لصياغة عرض رسمي متكامل.',
    model: 'gemini-2.5-pro',
    tools: ['kb_search', 'python_eval', 'memory_write'],
    fee: 10,
    starter_prompt: 'أعد وثيقة عرض فني ومالي متكاملة لتوريد وتشغيل منصة ذكاء اصطناعي لبنك رقمي يشمل التدريب والدعم المميز.',
  },
  {
    tpl_id: 'sls_objections',
    name: 'مدرب إغلاق الصفقات ومعالجة الاعتراضات',
    role_title: 'مستشار تفاوض بيعي وفق منهجية MEDDIC',
    domain: 'المبيعات و CRM',
    description: 'يجهز فرق المبيعات بالردود الذكية على اعتراضات السعر والمنافسين وتأجيل القرار.',
    system_prompt: 'أنت مدير مبيعات إقليمي خبير بمنهجية MEDDIC و SPIN. قدّم سيناريوهات حوار عملية لمعالجة الاعتراضات وإغلاق الصفقة.',
    model: 'gemini-2.5-flash',
    tools: ['kb_search', 'python_eval'],
    fee: 5,
    starter_prompt: 'العميل يقول: "سعركم أعلى بـ 40% من المنافس وسنؤجل القرار للربع القادم". اكتب خطة الرد وحساب العائد المقنع.',
  },

  // 6. خدمة العملاء
  {
    tpl_id: 'sup_tier2',
    name: 'وكيل الدعم الفني الذكي المعتمد على المعرفة',
    role_title: 'أخصائي حل مشكلات المشتركين وفق سياسة SLA',
    domain: 'خدمة العملاء',
    description: 'يرد على تذاكر العملاء فوراً بالاستناد لقاعدة معرفة الشركة ويحدد متى يجب التصعيد البشري.',
    system_prompt: 'أنت أخصائي دعم عملاء تنفيذي. ابحث أولاً في kb_search عن سياسة الاسترجاع والدعم الفني، وقدّم رداً ودوداً ودقيقاً خطوة بخطوة.',
    model: 'gemini-2.5-flash',
    tools: ['kb_search', 'memory_read', 'memory_write'],
    fee: 0,
    starter_prompt: 'عميل على باقة الشركات يشتكي من استنفاد النقاط قبل نهاية الشهر ويطلب استرداداً جزئياً أو باقة إضافية مخفضة. صغ الرد الرسمي وفق سياستنا.',
  },
  {
    tpl_id: 'sup_csat',
    name: 'محلل صوت العميل وتذاكر الشكاوى (VoC Analyst)',
    role_title: 'خبير تحليل أسباب التسرب ورفع معدل الرضا CSAT',
    domain: 'خدمة العملاء',
    description: 'يصنف مئات التعليقات والشكاوى إلى أنماط جذرية ويقترح تحسينات فورية للمنتج.',
    system_prompt: 'أنت محلل تجربة عملاء CX. صنّف الشكاوى حسب التكرار والأثر المالي، وقدّم خطة تحسين مرتبة بالأولوية.',
    model: 'gemini-2.5-flash',
    tools: ['python_eval', 'kb_search'],
    fee: 5,
    starter_prompt: 'حلل شكاوى متكررة: 45% صعوبة إعداد الـ Webhook، 30% تأخر اعتماد التحويل البنكي، 25% غموض استهلاك النقاط، واقترح حلولاً جذرية.',
  },

  // 7. الموارد البشرية والتشغيل
  {
    tpl_id: 'hr_talent',
    name: 'شريك استقطاب الكفاءات وتقييم المرشحين (HR Lead)',
    role_title: 'مستشار توصيف وظيفي ومصفوفات مقابلات',
    domain: 'الموارد البشرية والتشغيل',
    description: 'يبني بطاقات الوصف الوظيفي، اختبارات التقييم العملية، وخطط دمج الموظفين الجدد.',
    system_prompt: 'أنت مدير موارد بشرية واستقطاب مواهب تقنية. صمم وصفاً وظيفياً جذاباً ومصفوفة أسئلة تقييم بدرجات معيارية.',
    model: 'gemini-2.5-flash',
    tools: ['kb_search', 'memory_write'],
    fee: 5,
    starter_prompt: 'أعد بطاقة وصف وظيفي ومصفوفة مقابلة تقنية وسلوكية لتعيين Senior AI Product Engineer.',
  },
  {
    tpl_id: 'ops_sop',
    name: 'معماري إجراءات التشغيل القياسية (SOP Architect)',
    role_title: 'خبير حوكمة العمليات ومؤشرات الأداء OKRs',
    domain: 'الموارد البشرية والتشغيل',
    description: 'يوثق العمليات الداخلية للشركة في أدلة تشغيل واضحة مع مؤشرات قياس أسبوعية.',
    system_prompt: 'أنت مستشار تميز تشغيلي. ابنِ وثيقة SOP احترافية تتضمن الهدف، النطاق، المخطط الزمني، المسؤوليات RACI، ومؤشرات الأداء.',
    model: 'gemini-2.5-flash',
    tools: ['kb_search', 'python_eval'],
    fee: 5,
    starter_prompt: 'ابنِ دليل تشغيل قياسي (SOP) لعملية استقبال عميل مؤسسي جديد (Enterprise Onboarding) خلال 7 أيام عمل.',
  },
  {
    tpl_id: 'ops_pm',
    name: 'مدير المشاريع الرشيقة وتخطيط السبرنت (Agile PM)',
    role_title: 'خبير تقسيم المبادرات إلى مهام وجداول تسليم',
    domain: 'الموارد البشرية والتشغيل',
    description: 'يحول فكرة المنتج إلى خارطة طريق، قصص مستخدم (User Stories)، وتقدير جهود ومخاطر.',
    system_prompt: 'أنت مدير مشاريع تقنية محترف (PMP / Scrum Master). قسّم المشروع إلى مراحل، User Stories بمعايير قبول واضحة، وجدول مخاطر.',
    model: 'gemini-2.5-flash',
    tools: ['python_eval', 'kb_search'],
    fee: 5,
    starter_prompt: 'قسّم مشروع إطلاق تطبيق جوال مرافق لمنصة Nexus AgentOS إلى خارطة طريق من 4 سبرنتات (8 أسابيع).',
  },

  // 8. التجارة الإلكترونية والبيانات
  {
    tpl_id: 'ecom_merch',
    name: 'مستشار نمو المتاجر الإلكترونية وسلة المشتريات',
    role_title: 'خبير رفع معدل التحويل CRO ومتوسط قيمة الطلب AOV',
    domain: 'التجارة الإلكترونية والبيانات',
    description: 'يحلل تسعير المنتجات، الحزم البيعية، واسترداد السلات المتروكة لتعظيم أرباح المتجر.',
    system_prompt: 'أنت خبير تجارة إلكترونية ونمو متاجر. استخدم python_eval لحساب هامش المساهمة و ROAS واقترح حزماً ترويجية ترفع AOV.',
    model: 'gemini-2.5-flash',
    tools: ['python_eval', 'web_search'],
    fee: 5,
    starter_prompt: 'متجر إلكتروني متوسط الطلب فيه 180 ريالاً وتكلفة البضاعة والشحن 105 ريالات وتكلفة الإعلان للطلب 52 ريالاً. كيف نضاعف صافي الربح؟',
  },
  {
    tpl_id: 'data_scientist',
    name: 'عالم البيانات والتحليل الإحصائي التنفيذي',
    role_title: 'خبير قراءة ملفات CSV/JSON واستخراج الأنماط',
    domain: 'التجارة الإلكترونية والبيانات',
    description: 'يحلل الجداول الرقمية والبيانات الخام المرفقة ويستخرج الشذوذ والتوقعات والتوصيات.',
    system_prompt: 'أنت عالم بيانات تنفيذي. حلل البيانات الرقمية بدقة عبر python_eval وقدّم ملخصاً إحصائياً واضحاً وجدول مؤشرات.',
    model: 'gemini-2.5-pro',
    tools: ['python_eval', 'kb_search', 'memory_write'],
    fee: 10,
    starter_prompt: 'حلل مبيعات 6 أشهر متتالية: [42000, 46500, 44800, 53200, 61000, 68900] واحسب معدل النمو الشهري المركب وتوقع الشهر السابع.',
  },
  {
    tpl_id: 'ecom_supply',
    name: 'مخطط المخزون وسلاسل الإمداد الذكي',
    role_title: 'أخصائي نقطة إعادة الطلب وتقليل نفاذ المخزون',
    domain: 'التجارة الإلكترونية والبيانات',
    description: 'يحسب مخزون الأمان، نقطة إعادة الطلب (Reorder Point)، والكمية الاقتصادية للطلب EOQ.',
    system_prompt: 'أنت خبير سلاسل إمداد وإدارة مخزون. استخدم python_eval لحساب نقطة إعادة الطلب ومخزون الأمان بدقة هندسية.',
    model: 'gemini-2.5-flash',
    tools: ['python_eval', 'kb_search'],
    fee: 5,
    starter_prompt: 'احسب نقطة إعادة الطلب ومخزون الأمان لصنف يُباع منه 85 قطعة يومياً ومدة التوريد 14 يوماً مع حد أمان 5 أيام إضافية.',
  },
];

export interface WorkflowBlueprint {
  id: string;
  name: string;
  category: string;
  description: string;
  sample_input: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export const WORKFLOW_BLUEPRINTS: WorkflowBlueprint[] = [
  {
    id: 'wf_contract_shield',
    name: 'خلية الفحص القانوني والمالي للعقود (Contract Shield)',
    category: 'القانون والمالية',
    description: 'يمرر مسودة العقد على قاعدة المعرفة، ثم مستشار العقود لكشف المخاطر، ثم المحلل المالي لحساب الأثر المالي والغرامات.',
    sample_input: 'عقد خدمات سحابية بقيمة 120,000 دولار سنوياً مع شرط جزائي 25% عند الإنهاء المبكر وفترة سداد 60 يوماً.',
    nodes: [
      { id: 'n1', kind: 'trigger', label: 'استلام مسودة العقد', subtitle: 'إدخال مباشر أو Webhook' },
      { id: 'n2', kind: 'rag', label: 'استرجاع سياسة التعاقد RAG', subtitle: 'مطابقة بنود SLA والحدود' },
      { id: 'n3', kind: 'agent', label: 'مستشار العقود القانونية', subtitle: 'تصنيف المخاطر والصياغة البديلة' },
      { id: 'n4', kind: 'agent', label: 'المحلل المالي الكمي', subtitle: 'حساب التعرض المالي والتدفقات' },
      { id: 'n5', kind: 'output', label: 'تقرير القرار التنفيذي', subtitle: 'تصدير PDF / إشعار Slack' },
    ],
    edges: [
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3' },
      { from: 'n3', to: 'n4' },
      { from: 'n4', to: 'n5' },
    ],
  },
  {
    id: 'wf_saas_launch',
    name: 'خط إنتاج إطلاق وتوسيع منتج SaaS',
    category: 'النمو والتسويق',
    description: 'يبدأ بهندسة التسعير واقتصاديات الوحدة، ثم بناء خطة SEO، ثم كتابة صفحة الهبوط والإعلانات التحويلية.',
    sample_input: 'إطلاق أداة ذكاء اصطناعي لأتمتة الفواتير والمحاسبة للشركات الصغيرة في الخليج بسعر يبدأ من 39 دولاراً.',
    nodes: [
      { id: 'n1', kind: 'trigger', label: 'فكرة المنتج والسوق', subtitle: 'موجز الإطلاق' },
      { id: 'n2', kind: 'agent', label: 'مدير النمو والتسعير', subtitle: 'هيكلة الباقات و LTV/CAC' },
      { id: 'n3', kind: 'agent', label: 'خبير الـ SEO والمحتوى', subtitle: 'الكلمات المفتاحية والمنافسون' },
      { id: 'n4', kind: 'agent', label: 'كاتب الإعلانات التحويلية', subtitle: 'صفحة الهبوط وحملات الإطلاق' },
      { id: 'n5', kind: 'output', label: 'حقيبة الإطلاق الكاملة', subtitle: 'جاهزة للتنفيذ والتصدير' },
    ],
    edges: [
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3' },
      { from: 'n3', to: 'n4' },
      { from: 'n4', to: 'n5' },
    ],
  },
  {
    id: 'wf_sec_arch',
    name: 'مراجعة المعمارية والأمن السيبراني والنشر',
    category: 'هندسة البرمجيات',
    description: 'يصمم البنية السحابية، ثم يجري فحص ثغرات OWASP، ثم يولّد خطة النشر والمراقبة.',
    sample_input: 'بناء بوابة دفع واشتراكات متعددة المستأجرين تعالج البطاقات والـ Webhooks مع عزل بيانات كامل.',
    nodes: [
      { id: 'n1', kind: 'trigger', label: 'متطلبات النظام التقني', subtitle: 'مواصفات الخدمة' },
      { id: 'n2', kind: 'rag', label: 'معايير الأمن الهندسية', subtitle: 'قاعدة المعرفة التقنية' },
      { id: 'n3', kind: 'agent', label: 'معماري الأنظمة السحابية', subtitle: 'تصميم الخدمات وقاعدة البيانات' },
      { id: 'n4', kind: 'agent', label: 'مدقق الأمن السيبراني', subtitle: 'فحص التهديدات والترقيع' },
      { id: 'n5', kind: 'output', label: 'وثيقة التصميم المعماري الآمن', subtitle: 'Markdown + مخطط تنفيذي' },
    ],
    edges: [
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3' },
      { from: 'n3', to: 'n4' },
      { from: 'n4', to: 'n5' },
    ],
  },
  {
    id: 'wf_customer_triage',
    name: 'منظومة فرز وحل تذاكر الدعم والتصعيد الذكي',
    category: 'خدمة العملاء',
    description: 'يستقبل شكوى العميل، يفتش في سياسة الشركة RAG، يفرز درجة الخطورة، ويصدر الرد الرسمي.',
    sample_input: 'تذكرة عاجلة: تأخر تفعيل باقة الشركات بعد التحويل البنكي منذ 6 ساعات ولدينا اجتماع عرض أمام الإدارة.',
    nodes: [
      { id: 'n1', kind: 'trigger', label: 'تذكرة عميل واردة', subtitle: 'WhatsApp / بريد الدعم' },
      { id: 'n2', kind: 'rag', label: 'دليل سياسات SLA والاسترجاع', subtitle: 'استرجاع الضوابط المعتمدة' },
      { id: 'n3', kind: 'router', label: 'موزع الأولوية والتصعيد', subtitle: 'تصنيف VIP / عاجل / عادي' },
      { id: 'n4', kind: 'agent', label: 'وكيل الدعم الفني الذكي', subtitle: 'صياغة الحل والتعويض' },
      { id: 'n5', kind: 'output', label: 'إرسال الرد وتحديث CRM', subtitle: 'Telegram / بريد العميل' },
    ],
    edges: [
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3' },
      { from: 'n3', to: 'n4' },
      { from: 'n4', to: 'n5' },
    ],
  },
];

export const STARTER_KNOWLEDGE_DOCS = [
  {
    title: 'السياسة المالية وهوامش التسعير والاسترداد — Nexus 2026',
    category: 'السياسات المالية',
    content: `تعتمد شركة Nexus هامش ربح تشغيلي مستهدف لا يقل عن 70% على خدمات البرمجيات السحابية (Gross Margin >= 70%).

قواعد التسعير والخصومات المعتمدة:
1. خصم الدفع السنوي المقدم يصل إلى 20% كحد أقصى دون الحاجة لموافقة استثنائية.
2. صفقات المؤسسات (Enterprise) التي تتجاوز 10,000 دولار سنوياً تتضمن مدير حساب مخصص واتفاقية مستوى خدمة SLA بنسبة توافر 99.95%.
3. سياسة الاسترداد: يحق للمشترك الجديد طلب استرداد كامل خلال 7 أيام من أول اشتراك مدفوع شريطة ألا يتجاوز استهلاكه 10% من رصيد الباقة.

معايير تفعيل الفواتير اليدوية (InstaPay / تحويل بنكي):
يتم التحقق من رقم المرجع البنكي واعتماد الفاتورة خلال أقل من ساعتين في أوقات العمل الرسمية، وفي حال التأخر لأكثر من 4 ساعات يُمنح العميل 2,500 نقطة إضافية مجانية كتعويض فوري عن SLA.`,
  },
  {
    title: 'الدليل التعاقدي والضوابط القانونية لاتفاقيات الشركات B2B',
    category: 'القانون والامتثال',
    content: `الضوابط الإلزامية في مراجعة وصياغة عقود الموردين والعملاء:
1. سقف المسؤولية التعويضية (Limitation of Liability): يجب ألا يتجاوز إجمالي المسؤولية التعاقدية في أي حال مجموع المبالغ المدفوعة فعلياً خلال الـ 12 شهراً السابقة للمطالبة، ويُرفض أي بند مسؤولية غير محدودة.
2. الملكية الفكرية (IP Ownership): تظل ملكية المنصة الأساسية والنماذج والأدوات مملوكة حصرياً للشركة، بينما يمتلك العميل ملكية كاملة لبياناته ومخرجاته الخاصة فقط بعد سداد المستحقات.
3. شروط الإنهاء المبكر: فترة إشعار لا تقل عن 30 يوماً، وألا تتجاوز رسوم الإنهاء المبكر 15% من القيمة المتبقية للعقد.
4. حماية البيانات: تُعالج كافة بيانات المستأجرين بعزل منطقي صارم (Tenant Isolation) مع تشفير كلمات المرور بخوارزمية PBKDF2-HMAC-SHA256.`,
  },
  {
    title: 'معايير هندسة البرمجيات والأمن السيبراني الداخلية (OWASP & SRE)',
    category: 'الهندسة والأمن',
    content: `المعايير الهندسية المعتمدة في تطوير ونشر أنظمة Nexus AgentOS:
1. منع تنفيذ أي كود ديناميكي غير معزول؛ تُنفذ الحسابات عبر شجرة AST آمنة تمنع استيراد المكتبات أو الوصول لنظام الملفات.
2. جميع مفاتيح المطورين تبدأ بالبادئة sk_nexus_ ولا يُخزن النص الصريح للمفتاح في قاعدة البيانات أبداً بل يُخزن SHA-256 Hash فقط.
3. كل استعلام في قاعدة البيانات يجب أن يتضمن شرط WHERE user_id = ? لضمان العزل التام بين المستأجرين.
4. حدود الأداء المستهدفة: زمن استجابة واجهات القراءة أقل من 120ms، وتفعيل وضع WAL في SQLite لضمان التزامن العالي.`,
  },
];

export const CONNECTOR_PLATFORMS = [
  { id: 'telegram', name: 'Telegram Bot API', placeholder: 'https://api.telegram.org/bot<TOKEN>/sendMessage', channelHint: '@nexus_alerts_channel' },
  { id: 'whatsapp', name: 'WhatsApp Cloud API', placeholder: 'https://graph.facebook.com/v20.0/<PHONE_ID>/messages', channelHint: '+966500000000' },
  { id: 'slack', name: 'Slack Incoming Webhook', placeholder: 'https://hooks.slack.com/services/T000/B000/XXXX', channelHint: '#executive-ops' },
  { id: 'discord', name: 'Discord Webhook', placeholder: 'https://discord.com/api/webhooks/0000/XXXX', channelHint: '#agent-telemetry' },
  { id: 'webhook', name: 'Custom REST Webhook (n8n / Zapier / Make)', placeholder: 'https://automations.company.com/webhook/nexus', channelHint: 'POST JSON Payload' },
  { id: 'email', name: 'Email Dispatch (Resend / SMTP Bridge)', placeholder: 'https://api.resend.com/emails', channelHint: 'ceo@company.com' },
  { id: 'notion', name: 'Notion Database Sync', placeholder: 'https://api.notion.com/v1/pages', channelHint: 'db_executive_reports' },
] as const;

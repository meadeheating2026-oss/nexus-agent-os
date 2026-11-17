import json
import secrets
from database import get_db, now_iso


def seed_initial_data() -> None:
    ts = now_iso()
    with get_db() as conn:
        # 1. Seed Built-in Modular Tools
        existing_tools = conn.execute("SELECT COUNT(*) FROM tools").fetchone()[0]
        if existing_tools == 0:
            builtin_tools = [
                (
                    "web_search",
                    "البحث الحي في الويب (Live Web Search)",
                    "الويب والبيانات",
                    "البحث عن الكلمات المفتاحية، المنافسين، الأخبار اللحظية، وفرص السوق في أي قطاع.",
                    "builtin",
                ),
                (
                    "web_scraper",
                    "ساحِب وفاحص المواقع (Deep URL Scraper)",
                    "الويب والبيانات",
                    "فتح أي رابط موقع فعلياً وسحب النصوص والبيانات وفحص نقاط الضعف والأسعار.",
                    "builtin",
                ),
                (
                    "http_webhook",
                    "موصل الأنظمة والـ API العام (Universal HTTP/Webhook)",
                    "التكامل والأتمتة",
                    "الاتصال بأي منصة خارجية (WordPress, Shopify, Stripe, Telegram, WhatsApp, CRM, Zapier).",
                    "http_api",
                ),
                (
                    "python_sandbox",
                    "مختبر الكود والتحليل الرقمي (Python & Quant Engine)",
                    "البرمجة والتحليل",
                    "تشغيل العمليات الحسابية، النمذجة المالية، تحليل البيانات، وتوليد السكربتات.",
                    "builtin",
                ),
                (
                    "persistent_memory",
                    "الذاكرة التراكمية المستمرة (Long-Term Memory)",
                    "نواة الوكيل",
                    "حفظ واسترجاع خبرات الوكيل وسجل المهام السابقة لمنع التكرار وتحسين الدقة تلقائياً.",
                    "builtin",
                ),
                (
                    "delegate_to_agent",
                    "بروتوكول استدعاء وتكامل الوكلاء (Peer-to-Peer Handoff)",
                    "التكامل الجماعي",
                    "يمنح الوكيل قدرة البحث في سجل الـ 100+ وكيل وطلب مساعدة تخصصية من أي وكيل زميل.",
                    "builtin",
                ),
                (
                    "publish_deliverable",
                    "حزم وتصدير المخرجات الجاهزة للربح (Deliverable Packager)",
                    "التسليم والمبيعات",
                    "تنسيق التقرير أو الكود أو المقال بصيغة احترافية جاهزة للنشر الفوري أو التسليم للعميل.",
                    "builtin",
                ),
            ]
            for slug, name, cat, desc, ex_type in builtin_tools:
                conn.execute(
                    """
                    INSERT INTO tools (slug, name, category, description, execution_type, is_builtin, created_at)
                    VALUES (?, ?, ?, ?, ?, 1, ?)
                    """,
                    (slug, name, cat, desc, ex_type, ts),
                )

        # 2. Seed C-Suite System Agents + Diverse Starter Fleet
        existing_agents = conn.execute("SELECT COUNT(*) FROM agents").fetchone()[0]
        if existing_agents == 0:
            starter_agents = [
                # System Governance Agents
                (
                    "المنسق العام للأسطول (Master Orchestrator)",
                    "قائد توزيع المهام والتكامل",
                    "الإدارة العليا ونواة النظام",
                    "يحلل الأهداف الكبرى ويختار أفضل توليفة وكلاء من بين مئات الوكلاء ويدير تسليم المهام بينهم.",
                    "فكك أي هدف معقد إلى مهام تخصصية متسلسلة، واختر أنسب الوكلاء من السجل، واجمع مخرجاتهم في تسليم نهائي متكامل.",
                    "google/gemini-2.5-flash",
                    ["persistent_memory", "delegate_to_agent"],
                    1,
                    "manual",
                    60,
                    0.0,
                    0.20,
                    1,
                    1,
                    0.0004,
                    0.0,
                ),
                (
                    "وكيل المدير المالي (CFO ROI Guardrail)",
                    "مراقب التكلفة وتعظيم صافي الربح",
                    "الإدارة العليا ونواة النظام",
                    "يراقب تكلفة التوكنز لكل وكيل بالسنت مقابل العائد، ويوقف تلقائياً أي وكيل يتجاوز ميزانيته.",
                    "احسب تكلفة كل عملية مقابل القيمة السوقية، وحافظ على هامش ربح يتجاوز 80%، وأوقف أي وكيل يتخطى السقف المالي.",
                    "google/gemini-2.5-flash",
                    ["python_sandbox", "persistent_memory"],
                    0,
                    "manual",
                    60,
                    0.0,
                    0.10,
                    1,
                    1,
                    0.0,
                    0.0,
                ),
                # Diverse Multi-Sector Autonomous Worker Fleet
                (
                    "صائد الكلمات والـ SEO والأفلييت",
                    "خبير Programmatic SEO والتسويق بالعمولة",
                    "الـ SEO والنشر والتسويق بالعمولة",
                    "يكتشف الكلمات الشرائية منخفضة المنافسة ويبني مقالات مراجعات ومقارنات مجهزة بروابط العمولة للنشر الآلي.",
                    "1. ابحث عن كلمات مفتاحية ذات نية شرائية عالية لبرامج وخدمات ذات عمولة متكررة.\n2. صمم هيكل مقال متفوق على أول 10 نتائج مع جداول مقارنة واضحة.\n3. حدد أماكن إدراج روابط الـ Affiliate وعبارات الحث على الشراء (CTA).",
                    "google/gemini-2.5-flash",
                    ["web_search", "web_scraper", "http_webhook", "delegate_to_agent", "publish_deliverable"],
                    1,
                    "cron",
                    120,
                    35.0,
                    0.40,
                    0,
                    4,
                    0.0048,
                    140.0,
                ),
                (
                    "فاحص مواقع الشركات وصائد الأخطاء (B2B Auditor)",
                    "محلل الثغرات التسويقية والتقنية للشركات",
                    "فحص الشركات وجلب العملاء B2B",
                    "يفحص مواقع المتاجر والشركات، يستخرج الأخطاء التي تضيع عليهم المبيعات، ويجهز تقريراً تشخيصياً يبيع نفسه.",
                    "1. افحص الرابط أو قطاع الشركة المستهدف واستخرج أهم 5 نقاط ضعف في التحويل والسرعة والـ SEO.\n2. قدّر الخسارة المالية الشهرية الناتجة عن هذه الأخطاء بلغة الأرقام.\n3. جهّز ملخصاً تشويقياً مجانياً وخطة إصلاح كاملة مدفوعة.",
                    "google/gemini-2.5-flash",
                    ["web_scraper", "web_search", "python_sandbox", "delegate_to_agent", "publish_deliverable"],
                    1,
                    "manual",
                    60,
                    65.0,
                    0.50,
                    0,
                    6,
                    0.0079,
                    390.0,
                ),
                (
                    "قناص المبيعات والإغلاق الآلي (Outbound Closer)",
                    "خبير رسائل الإقناع وتحويل العملاء إلى دفع فوري",
                    "المبيعات وأتمتة خدمة العملاء",
                    "يصيغ رسائل مبيعات مخصصة عالية التحويل ويرد على الاعتراضات ويرسل روابط الدفع وحجز المواعيد 24/7.",
                    "1. حوّل نتائج الفحص أو بيانات العميل إلى رسالة بيعية شخصية قصيرة ومقنعة جداً.\n2. ركّز على العائد المالي المباشر للعميل وضع دعوة واضحة للدفع أو الحجز.\n3. جهّز تسلسل متابعة تلقائي من 3 رسائل لمن لم يرد خلال 24 ساعة.",
                    "openai/gpt-4o-mini",
                    ["http_webhook", "persistent_memory", "delegate_to_agent", "publish_deliverable"],
                    1,
                    "webhook",
                    30,
                    45.0,
                    0.35,
                    0,
                    5,
                    0.0052,
                    225.0,
                ),
                (
                    "مهندس الـ Micro-SaaS والأدوات البرمجية",
                    "مطور أدوات رقمية وسكربتات أتمتة قابلة للبيع",
                    "هندسة البرمجيات والـ Micro-SaaS",
                    "يرصد المشاكل التقنية المتكررة ويبني كود أدوات مصغرة، إضافات متصفح، وقوالب جاهزة للبيع المتكرر.",
                    "1. حلل المشكلة المطلوبة وصمم معمارية أداة رقمية خفيفة وسريعة التنفيذ.\n2. اكتب الكود الأساسي النظيف وخطة التغليف كمنتج رقمي أو إضافة SaaS.\n3. حدد نموذج التسعير الأمثل (اشتراك شهري أو شراء لمرة واحدة).",
                    "anthropic/claude-3.5-sonnet",
                    ["python_sandbox", "web_search", "delegate_to_agent", "publish_deliverable"],
                    1,
                    "manual",
                    60,
                    85.0,
                    0.80,
                    0,
                    3,
                    0.0061,
                    255.0,
                ),
                (
                    "رادار المنتجات الرابحة والتجارة الإلكترونية",
                    "محلل ترندات المتاجر وتسعير المنتجات الرقمية والمادية",
                    "التجارة الإلكترونية والمنتجات",
                    "يحلل شكاوى المشترين، يكتشف المنتجات عالية الهامش، ويكتب صفحات هبوط تضاعف معدل الشراء.",
                    "1. حلل فئة المنتج وهوامش الربح وتكلفة الاستحواذ المتوقعة.\n2. استخرج زوايا التسويق النفسية الأكثر تأثيراً واكتب صفحة منتج كاملة عالية التحويل.\n3. اقترح حزم رفع قيمة السلة (Upsells & Bundles).",
                    "google/gemini-2.5-flash",
                    ["web_search", "web_scraper", "python_sandbox", "publish_deliverable"],
                    1,
                    "cron",
                    180,
                    40.0,
                    0.45,
                    0,
                    3,
                    0.0036,
                    120.0,
                ),
                (
                    "محلل الفرص المالية والـ Arbitrage الذكي",
                    "باحث كمي لرصد فروق الأسعار والفرص الاستثمارية",
                    "الأسواق المالية والتداول الكمي",
                    "يراقب المؤشرات والأخبار وفروق الأسعار بين المنصات والأسواق ويصدر تقارير فرص محسوبة المخاطر.",
                    "1. افحص البيانات الرقمية والمؤشرات المرتبطة بالسوق أو الأصل المطلوب.\n2. احسب نسبة العائد إلى المخاطرة (Risk/Reward) وفروق التسعير الممكن استغلالها.\n3. قدم تقريراً تنفيذياً صارماً بالأرقام وشروط الدخول والخروج.",
                    "deepseek/deepseek-chat",
                    ["web_search", "python_sandbox", "http_webhook", "persistent_memory"],
                    1,
                    "cron",
                    30,
                    55.0,
                    0.40,
                    0,
                    4,
                    0.0044,
                    220.0,
                ),
            ]

            for (
                name,
                role,
                domain,
                desc,
                prompt,
                model,
                tools_list,
                can_del,
                trig,
                cron_min,
                price,
                max_cost,
                is_sys,
                runs,
                t_cost,
                t_rev,
            ) in starter_agents:
                conn.execute(
                    """
                    INSERT INTO agents (
                        name, role_title, domain, description, system_prompt, model,
                        installed_tools, can_delegate, trigger_type, cron_interval_minutes,
                        webhook_token, price_per_run, max_cost_usd, is_system_agent,
                        status, total_runs, total_cost_usd, total_revenue_usd, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'idle', ?, ?, ?, ?)
                    """,
                    (
                        name,
                        role,
                        domain,
                        desc,
                        prompt,
                        model,
                        json.dumps(tools_list),
                        can_del,
                        trig,
                        cron_min,
                        "whk_" + secrets.token_hex(8),
                        price,
                        max_cost,
                        is_sys,
                        runs,
                        t_cost,
                        t_rev,
                        ts,
                    ),
                )

        # 3. Seed Sample SaaS Subscribers (Multi-Tenant Monetization Layer)
        existing_clients = conn.execute("SELECT COUNT(*) FROM saas_clients").fetchone()[0]
        if existing_clients == 0:
            clients = [
                (
                    "مجموعة الرواد العقارية",
                    "Al-Rowad Real Estate",
                    "باقة الشركات الذكية (Business Swarm)",
                    299.0,
                    1200.0,
                    340.0,
                    [4, 5],
                ),
                (
                    "متجر نانو تك الإلكتروني",
                    "NanoTech Store",
                    "باقة التجارة والمبيعات الآلية",
                    199.0,
                    800.0,
                    215.0,
                    [3, 5, 7],
                ),
            ]
            for c_name, comp, plan, fee, bal, used, a_ids in clients:
                conn.execute(
                    """
                    INSERT INTO saas_clients (
                        client_name, company, plan_name, monthly_fee_usd,
                        credits_balance, credits_used, assigned_agent_ids, status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
                    """,
                    (c_name, comp, plan, fee, bal, used, json.dumps(a_ids), ts),
                )

        # 4. Seed 1 Sample Completed Multi-Agent Mission for immediate telemetry visibility
        existing_missions = conn.execute("SELECT COUNT(*) FROM missions").fetchone()[0]
        if existing_missions == 0:
            cur = conn.execute(
                """
                INSERT INTO missions (
                    title, goal_prompt, mode, orchestration_strategy, selected_agent_ids,
                    trigger_source, status, final_output, total_cost_usd, estimated_value_usd,
                    net_profit_usd, tokens_used, qa_score, created_at, completed_at
                ) VALUES (?, ?, 'swarm', 'auto', '[4, 5]', 'cron_auto', 'completed', ?, 0.0029, 110.0, 109.9971, 1480, 97, ?, ?)
                """,
                (
                    "فحص متاجر إلكترونية وإطلاق حملة إغلاق مبيعات فورية",
                    "افحص نقاط ضعف التحويل لمتاجر العطور الخليجية وجهز عرض إصلاح فوري مع تسلسل رسائل إغلاق مبيعات.",
                    "# المخرج المتكامل المعتمد\n\nتم دمج مخرجات [فاحص مواقع الشركات] مع [قناص المبيعات والإغلاق الآلي] وتوليد 15 تقريراً تشخيصياً مع روابط دفع جاهزة للإرسال الآلي.",
                    ts,
                    ts,
                ),
            )
            m_id = cur.lastrowid
            sample_steps = [
                (
                    m_id,
                    1,
                    None,
                    "المنسق العام للأسطول",
                    "نواة النظام",
                    "orchestration",
                    "تفكيك الهدف وتوزيع المهام بين [فاحص مواقع الشركات] ثم [قناص المبيعات والإغلاق الآلي].",
                    "تم إنشاء خط أنابيب تكاملي من مرحلتين.",
                    "agent_router",
                    0.0004,
                    150,
                    ts,
                ),
                (
                    m_id,
                    2,
                    4,
                    "فاحص مواقع الشركات وصائد الأخطاء (B2B Auditor)",
                    "فحص الشركات وجلب العملاء B2B",
                    "agent_execution",
                    "تم استخراج 4 ثغرات قاتلة في صفحات الدفع والـ SEO وتقدير الفاقد الشهري.",
                    "تقرير فحص كامل جاهز للتمرير لوكيل المبيعات.",
                    "web_scraper",
                    0.0014,
                    720,
                    ts,
                ),
                (
                    m_id,
                    3,
                    5,
                    "قناص المبيعات والإغلاق الآلي (Outbound Closer)",
                    "المبيعات وأتمتة خدمة العملاء",
                    "agent_execution",
                    "تم بناء رسالة العرض المخصص + 3 رسائل متابعة تلقائية مرتبطة بنتائج الفحص.",
                    "حزمة رسائل الإغلاق جاهزة للإرسال عبر Webhook.",
                    "http_webhook",
                    0.0009,
                    520,
                    ts,
                ),
                (
                    m_id,
                    4,
                    None,
                    "وكيل المدير المالي (CFO Guardrail)",
                    "الرقابة المالية والأرباح",
                    "cfo_audit",
                    "التكلفة $0.0029 مقابل قيمة سوقية $110.00 — هامش ربح 99.99%.",
                    "تم اعتماد العملية وتحديث سجل الأرباح.",
                    "",
                    0.0002,
                    90,
                    ts,
                ),
            ]
            for st in sample_steps:
                conn.execute(
                    """
                    INSERT INTO mission_steps (
                        mission_id, step_order, agent_id, agent_name, agent_domain,
                        step_type, summary, detail_output, tool_used, cost_usd, tokens, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    st,
                )

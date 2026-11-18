import hashlib
import hmac
import json
import os
import secrets
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from fastapi import HTTPException

from auth import hash_password
from database import get_db, now_iso, row_to_dict


# Approximate actual API wholesale cost per 1M tokens (blended input/output)
MODEL_COST_PER_1M_TOKENS_USD: Dict[str, float] = {
    "gemini-2.5-flash": 0.35,
    "google/gemini-2.5-flash": 0.35,
    "gemini-2.5-pro": 3.50,
    "google/gemini-2.5-pro": 3.50,
    "gpt-4o-mini": 0.45,
    "openai/gpt-4o-mini": 0.45,
    "gpt-4o": 6.00,
    "openai/gpt-4o": 6.00,
    "anthropic/claude-3.5-sonnet": 9.00,
    "deepseek/deepseek-chat": 0.30,
}


def bootstrap_enterprise_seed() -> None:
    ts = now_iso()
    with get_db() as conn:
        # 1. Platform Config
        cfg = conn.execute("SELECT id FROM platform_config WHERE id = 1").fetchone()
        if not cfg:
            jwt_secret = os.environ.get("NEXUS_JWT_SECRET") or secrets.token_hex(32)
            conn.execute(
                """
                INSERT INTO platform_config (
                    id, platform_name, jwt_secret, active_llm_provider,
                    default_model, usd_to_credits_rate, markup_multiplier, allow_tenant_byok
                ) VALUES (1, 'Nexus AgentOS Enterprise', ?, 'openrouter', 'google/gemini-2.5-flash', 1000.0, 4.0, 1)
                """,
                (jwt_secret,),
            )

        # 2. Commercial Subscription Plans
        plans_count = conn.execute("SELECT COUNT(*) FROM subscription_plans").fetchone()[0]
        if plans_count == 0:
            plans = [
                (
                    "free_trial",
                    "الباقة التجريبية (Free Trial)",
                    "لتجربة بناء الوكلاء المستقلين وتشغيل المهام الأساسية برصيد ترحيبي.",
                    0.0,
                    250.0,
                    3,
                    0,
                    0,
                    0,
                    0,
                ),
                (
                    "pro_builder",
                    "باقة المحترفين (Pro Builder)",
                    "لبناء حتى 25 وكيلاً في مجالات مفتوحة مع أدوات REST API مخصصة وتكامل جماعي.",
                    49.0,
                    15000.0,
                    25,
                    1,
                    1,
                    0,
                    1,
                ),
                (
                    "business_swarm",
                    "باقة الشركات والفرق الذكية (Business Swarm)",
                    "حتى 150 وكيلاً متكاملاً مع وصول برمجي API خارجي وروابط Webhooks وجدولة 24/7.",
                    149.0,
                    60000.0,
                    150,
                    1,
                    1,
                    1,
                    1,
                ),
                (
                    "enterprise_unlimited",
                    "باقة المؤسسات اللانهائية (Enterprise Unlimited)",
                    "عدد لا نهائي من الوكلاء والأدوات والقطاعات مع أعلى أولوية تنفيذ وصلاحيات API كاملة.",
                    399.0,
                    200000.0,
                    -1,
                    1,
                    1,
                    1,
                    1,
                ),
            ]
            for code, name_ar, desc_ar, price, creds, max_ag, sw, ct, api_acc, cron_ok in plans:
                conn.execute(
                    """
                    INSERT INTO subscription_plans (
                        code, name_ar, description_ar, monthly_price_usd, included_credits,
                        max_agents, allow_swarm, allow_custom_tools, allow_api_access,
                        allow_autonomous_cron, is_active, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
                    """,
                    (code, name_ar, desc_ar, price, creds, max_ag, sw, ct, api_acc, cron_ok, ts),
                )

        # 3. Built-in Real Tool Definitions with JSON Schemas
        tools_count = conn.execute("SELECT COUNT(*) FROM tools WHERE user_id IS NULL").fetchone()[0]
        if tools_count == 0:
            builtin_tools = [
                (
                    "web_search",
                    "بحث الويب الحي (Live Web Search)",
                    "الويب والبيانات",
                    "ينفذ استعلام بحث فعلي على الإنترنت ويعيد الروابط والعناوين والمقتطفات الحية.",
                    {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string", "description": "عبارة البحث المطلوب الاستعلام عنها في الويب"}
                        },
                        "required": ["query"],
                    },
                    "builtin",
                ),
                (
                    "scrape_webpage",
                    "سحب وتحليل محتوى صفحة ويب (URL Scraper)",
                    "الويب والبيانات",
                    "يفتح رابط URL فعلياً ويستخرج عنوان الصفحة، الوصف، الروابط، والنص الكامل لتحليله.",
                    {
                        "type": "object",
                        "properties": {
                            "url": {"type": "string", "description": "الرابط الكامل يبدأ بـ http أو https"}
                        },
                        "required": ["url"],
                    },
                    "builtin",
                ),
                (
                    "python_eval",
                    "المحرك الحسابي والمالي الآمن (Python Quant Calc)",
                    "التحليل والحسابات",
                    "ينفذ المعادلات الرياضية والمالية وحسابات العائد والجمارك والهوامش بدقة برمجية.",
                    {
                        "type": "object",
                        "properties": {
                            "expression": {
                                "type": "string",
                                "description": "تعبير بايثون حسابي آمن مثل: round((149 - 12.5) / 149 * 100, 2)",
                            }
                        },
                        "required": ["expression"],
                    },
                    "builtin",
                ),
                (
                    "http_request",
                    "موصل الـ REST API والـ Webhook العام",
                    "التكامل الخارجي",
                    "يرسل طلب HTTP فعلي (GET/POST) إلى أي نظام خارجي مثل Webhook أو متجر أو CRM.",
                    {
                        "type": "object",
                        "properties": {
                            "url": {"type": "string", "description": "رابط الـ Endpoint المستهدف"},
                            "method": {"type": "string", "enum": ["GET", "POST"], "description": "نوع الطلب"},
                            "json_body": {"type": "string", "description": "بيانات JSON مرسلة في حالة POST"},
                        },
                        "required": ["url"],
                    },
                    "builtin",
                ),
                (
                    "memory_write",
                    "حفظ في الذاكرة الدائمة للوكيل",
                    "الذاكرة",
                    "يخزن معلومة أو نتيجة مهمة في قاعدة بيانات ذاكرة الوكيل للرجوع إليها مستقبلاً.",
                    {
                        "type": "object",
                        "properties": {
                            "key": {"type": "string", "description": "مفتاح المعلومة"},
                            "value": {"type": "string", "description": "المحتوى المراد حفظه"},
                        },
                        "required": ["key", "value"],
                    },
                    "builtin",
                ),
                (
                    "memory_read",
                    "استرجاع من الذاكرة الدائمة للوكيل",
                    "الذاكرة",
                    "يقرأ البيانات المخزنة سابقاً في ذاكرة الوكيل الدائمة.",
                    {
                        "type": "object",
                        "properties": {
                            "key": {"type": "string", "description": "مفتاح المعلومة أو اتركه فارغاً لجلب الكل"}
                        },
                    },
                    "builtin",
                ),
                (
                    "kb_search",
                    "البحث الدلالي في قاعدة معرفة الشركة (RAG Search)",
                    "قاعدة المعرفة (RAG)",
                    "يبحث في وثائق وسياسات وملفات الشركة المرفوعة في قاعدة المعرفة ويعيد المقاطع الأكثر صلة مع المصادر.",
                    {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string", "description": "سؤال أو كلمات البحث داخل وثائق المؤسسة"}
                        },
                        "required": ["query"],
                    },
                    "builtin",
                ),
            ]
            for slug, name, cat, desc, schema, ex_type in builtin_tools:
                conn.execute(
                    """
                    INSERT INTO tools (
                        user_id, slug, name, category, description,
                        parameters_schema_json, execution_type, created_at
                    ) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (slug, name, cat, desc, json.dumps(schema, ensure_ascii=False), ex_type, ts),
                )
        else:
            kb_tool = conn.execute("SELECT id FROM tools WHERE slug = 'kb_search' AND user_id IS NULL").fetchone()
            if not kb_tool:
                conn.execute(
                    """
                    INSERT INTO tools (
                        user_id, slug, name, category, description,
                        parameters_schema_json, execution_type, created_at
                    ) VALUES (NULL, 'kb_search', 'البحث الدلالي في قاعدة معرفة الشركة (RAG Search)', 'قاعدة المعرفة (RAG)',
                        'يبحث في وثائق وسياسات وملفات الشركة المرفوعة في قاعدة المعرفة ويعيد المقاطع الأكثر صلة.',
                        ?, 'builtin', ?)
                    """,
                    (
                        json.dumps(
                            {
                                "type": "object",
                                "properties": {"query": {"type": "string", "description": "سؤال البحث"}},
                                "required": ["query"],
                            },
                            ensure_ascii=False,
                        ),
                        ts,
                    ),
                )

        # 4. Super Admin Account + Starter Vouchers + Comprehensive Marketplace Agents
        admin_exists = conn.execute("SELECT id FROM users WHERE role = 'super_admin'").fetchone()
        if not admin_exists:
            pw_hash, pw_salt = hash_password("Admin@2026!")
            cur = conn.execute(
                """
                INSERT INTO users (
                    email, full_name, company_name, password_hash, password_salt,
                    role, is_active, credits_balance, created_at
                ) VALUES (?, ?, ?, ?, ?, 'super_admin', 1, 999999.0, ?)
                """,
                ("admin@nexus-os.io", "المدير التنفيذي للمنصة", "Nexus Holding", pw_hash, pw_salt, ts),
            )
            admin_id = int(cur.lastrowid)
            ent_plan = conn.execute("SELECT id FROM subscription_plans WHERE code = 'enterprise_unlimited'").fetchone()
            if ent_plan:
                period_end = (datetime.utcnow() + timedelta(days=3650)).strftime("%Y-%m-%dT%H:%M:%SZ")
                conn.execute(
                    """
                    INSERT INTO subscriptions (
                        user_id, plan_id, status, current_period_start, current_period_end, external_ref, created_at
                    ) VALUES (?, ?, 'active', ?, ?, 'FOUNDER_UNLIMITED', ?)
                    """,
                    (admin_id, ent_plan["id"], ts, period_end, ts),
                )

            marketplace_templates = [
                ("المحلل المالي الكمي (Quant Strategist)", "خبير النمذجة المالية وحساب العائد المركب", "المالية والاستثمار", "يحلل التدفقات النقدية، اقتصاديات الوحدة، وصافي القيمة الحالية بدقة رياضية عبر بايثون.", "استخدم python_eval و kb_search دائماً لحساب المؤشرات المالية بدقة وتقديم جدول عوائد ومخاطر تنفيذي.", ["python_eval", "kb_search", "memory_write"]),
                ("مدقق الميزانيات والضرائب والتكاليف", "مراجع قوائم مالية وضبط هوامش التشغيل", "المالية والاستثمار", "يراجع بنود المصروفات والجمارك والضرائب ويكتشف فرص خفض التكاليف التشغيلية.", "راجع الأرقام عبر python_eval وقارنها بسياسات الشركة في kb_search وقدّم توصيات توفير واضحة.", ["python_eval", "kb_search", "memory_write"]),
                ("مستشار صياغة وتدقيق العقود القانونية", "محامي عقود تجارية واتفاقيات عدم إفصاح", "القانون والعقود", "يفحص العقود التجارية واتفاقيات SLA ويكشف البنود الخطرة والالتزامات المخفية مع صياغة بديلة.", "ابحث أولاً في kb_search عن سياسات الشركة التعاقدية ثم حلل كل بند قانوني وصنّف المخاطر (مرتفع/متوسط/منخفض) مع نص بديل محكم.", ["kb_search", "memory_write", "web_search"]),
                ("مدقق الامتثال وحوكمة البيانات (GDPR & PDPL)", "خبير امتثال تشريعي وحماية الخصوصية", "القانون والعقود", "يطابق سياسات المنصة مع أنظمة حماية البيانات الشخصية واللوائح التنظيمية.", "استعن بـ kb_search و web_search لمراجعة متطلبات الامتثال وتقديم قائمة فحص تنفيذية.", ["kb_search", "web_search", "memory_write"]),
                ("معماري الأنظمة السحابية (Principal Cloud Architect)", "مصمم أنظمة موزعة وميكروسيرفس عالية التوافر", "هندسة البرمجيات والأمن", "يصمم البنية التحتية، مخططات قواعد البيانات، واستراتيجيات التوسع الأفقي.", "قدّم تصميماً معمارياً عملياً يشمل المكونات، حدود الأداء، وتقدير التكاليف السحابية باستخدام python_eval.", ["python_eval", "kb_search", "web_search"]),
                ("خبير الأمن السيبراني ومراجعة الثغرات (AppSec)", "محلل أمن تطبيقات واختبار اختراق دفاعي", "هندسة البرمجيات والأمن", "يفحص الكود وإعدادات الـ API ضد ثغرات OWASP Top 10 ويقدم ترقيعات فورية.", "حلل الكود أو البنية وفق OWASP Top 10 وقدّم خطوات المعالجة البرمجية الدقيقة.", ["kb_search", "web_search", "memory_write"]),
                ("مهندس الأتمتة وخطوط النشر (DevOps & SRE)", "أخصائي Docker و Kubernetes وموثوقية الأنظمة", "هندسة البرمجيات والأمن", "يبني ملفات التشغيل والتكامل المستمر وخطط التعافي من الكوارث.", "اكتب إعدادات إنتاجية نظيفة وقابلة للتشغيل الفوري مع معايير المراقبة والتنبيه.", ["kb_search", "python_eval"]),
                ("مدير النمو والاستحواذ (SaaS Growth Director)", "خبير اقتصاديات LTV/CAC وقنوات التوسع", "التسويق والنمو", "يصمم مسارات التحويل، خطط التسعير، وتجارب النمو السريع للشركات التقنية.", "احسب LTV و CAC ومعدل الاسترداد عبر python_eval وصمم خطة نمو مرحلية قابلة للقياس.", ["python_eval", "web_search", "kb_search"]),
                ("خبير تصدر محركات البحث وصناعة المحتوى (SEO Lead)", "استراتيجي كلمات مفتاحية ومقالات مرجعية", "التسويق والنمو", "يحلل المنافسين على الويب ويبني خطط محتوى ومقالات متكاملة عالية التحويل.", "استخدم web_search و scrape_webpage لرصد المنافسين وبناء هيكل محتوى احترافي.", ["web_search", "scrape_webpage", "memory_write"]),
                ("كاتب الإعلانات والعروض البيعية (Direct Copywriter)", "متخصص نصوص إعلانية وصفحات هبوط", "التسويق والنمو", "يصيغ حملات إعلانية وصفحات هبوط مقنعة وفق أطر AIDA و PAS.", "اكتب نسخاً إعلانية متعددة للاختبار A/B مع عناوين جذابة ودعوة واضحة لاتخاذ إجراء.", ["kb_search", "web_search"]),
                ("محلل المواقع والفرص البيعية B2B (SDR Prospector)", "خبير تأهيل عملاء الشركات وفحص المواقع", "المبيعات و CRM", "يسحب موقع العميل المحتمل، يشخص نقاط الضعف، ويولّد رسالة تواصل وعرض سعر مخصص.", "افحص الرابط عبر scrape_webpage واستخرج فرص التحسين وصغ عرضاً بيعياً مخصصاً.", ["scrape_webpage", "web_search", "python_eval"]),
                ("مهندس العروض الفنية والمناقصات (RFP Specialist)", "خبير إعداد العروض الفنية والمالية للشركات", "المبيعات و CRM", "يحول كراسات الشروط إلى عروض فنية ومالية متكاملة وجداول زمنية دقيقة.", "استخرج متطلبات العميل وقارنها بقدرات الشركة في kb_search واحسب التسعير بـ python_eval.", ["kb_search", "python_eval", "memory_write"]),
                ("وكيل الدعم الفني الذكي وحل المشكلات (Tier-2 Support)", "أخصائي تشخيص أعطال العملاء والرد الفوري", "خدمة العملاء", "يجيب على استفسارات العملاء بدقة بالاعتماد على قاعدة المعرفة ويصعّد الحالات الحرجة.", "ابحث أولاً في kb_search عن حل المشكلة وقدّم رداً مهذباً ومرقماً خطوة بخطوة.", ["kb_search", "memory_read", "memory_write"]),
                ("خبير استقطاب الكفاءات والمقابلات (HR Talent Partner)", "مستشار توصيف وظيفي وتقييم مرشحين", "الموارد البشرية والتشغيل", "يبني بطاقات الوصف الوظيفي، مصفوفات تقييم المقابلات، وخطط التسعين يوماً الأولى.", "صمم معايير تقييم موضوعية وأسئلة سلوكية وتقنية دقيقة للوظيفة المطلوبة.", ["kb_search", "memory_write"]),
                ("مهندس إجراءات التشغيل القياسية (SOP & Ops Architect)", "خبير حوكمة العمليات وتقليل الهدر التشغيلي", "الموارد البشرية والتشغيل", "يحول العمليات العشوائية إلى أدلة تشغيل قياسية SOPs ومؤشرات أداء KPIs.", "ابنِ وثيقة SOP مرقمة تشمل المسؤوليات، المدخلات، الخطوات، ومعايير الجودة.", ["kb_search", "python_eval"]),
                ("عالم البيانات والتحليل الإحصائي (Data Scientist)", "خبير تحليل الجداول والتنبؤ بالطلب", "التجارة الإلكترونية والبيانات", "يحلل بيانات المبيعات والمخزون وسلوك المتسوقين ويستخرج التوصيات الرقمية.", "استخدم python_eval لإجراء الحسابات الإحصائية ومعدلات النمو وتقديم ملخص تنفيذي.", ["python_eval", "kb_search", "memory_write"]),
            ]
            for m_name, m_role, m_dom, m_desc, m_prompt, m_tools in marketplace_templates:
                conn.execute(
                    """
                    INSERT INTO agents (
                        user_id, is_marketplace_public, marketplace_credit_fee, name, role_title,
                        domain, description, system_prompt, model, temperature,
                        installed_tools, can_delegate, max_iterations, webhook_secret, created_at
                    ) VALUES (?, 1, 5.0, ?, ?, ?, ?, ?, 'google/gemini-2.5-flash', 0.3, ?, 1, 5, ?, ?)
                    """,
                    (
                        admin_id,
                        m_name,
                        m_role,
                        m_dom,
                        m_desc,
                        m_prompt,
                        json.dumps(m_tools),
                        "whsec_" + secrets.token_hex(12),
                        ts,
                    ),
                )

            pro_plan = conn.execute("SELECT id FROM subscription_plans WHERE code = 'pro_builder'").fetchone()
            swarm_plan = conn.execute("SELECT id FROM subscription_plans WHERE code = 'business_swarm'").fetchone()
            ent_plan_row = conn.execute("SELECT id FROM subscription_plans WHERE code = 'enterprise_unlimited'").fetchone()
            conn.execute(
                """
                INSERT INTO vouchers (code, plan_id, bonus_credits, max_uses, used_count, is_active, created_at)
                VALUES (?, ?, 5000.0, 100, 0, 1, ?),
                       (?, ?, 25000.0, 50, 0, 1, ?),
                       (?, ?, 100000.0, 25, 0, 1, ?)
                """,
                (
                    "PRO2026",
                    pro_plan["id"] if pro_plan else None,
                    ts,
                    "VIPSWARM",
                    swarm_plan["id"] if swarm_plan else None,
                    ts,
                    "ENTERPRISE99",
                    ent_plan_row["id"] if ent_plan_row else None,
                    ts,
                ),
            )


def assign_plan_to_user(
    user_id: int,
    plan_id: int,
    bonus_credits: float = 0.0,
    tx_type: str = "subscription_grant",
    ref_note: str = "",
) -> Dict[str, Any]:
    ts = now_iso()
    period_end = (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%SZ")
    with get_db() as conn:
        plan = row_to_dict(conn.execute("SELECT * FROM subscription_plans WHERE id = ?", (plan_id,)).fetchone())
        if not plan:
            raise HTTPException(status_code=404, detail="باقة الاشتراك غير موجودة.")

        conn.execute("UPDATE subscriptions SET status = 'expired' WHERE user_id = ? AND status = 'active'", (user_id,))
        conn.execute(
            """
            INSERT INTO subscriptions (
                user_id, plan_id, status, current_period_start, current_period_end, external_ref, created_at
            ) VALUES (?, ?, 'active', ?, ?, ?, ?)
            """,
            (user_id, plan_id, ts, period_end, ref_note, ts),
        )

        grant_total = float(plan["included_credits"]) + float(bonus_credits)
        user_row = conn.execute("SELECT credits_balance FROM users WHERE id = ?", (user_id,)).fetchone()
        new_bal = round(float(user_row["credits_balance"]) + grant_total, 2)

        conn.execute("UPDATE users SET credits_balance = ? WHERE id = ?", (new_bal, user_id))
        conn.execute(
            """
            INSERT INTO wallet_transactions (
                user_id, tx_type, credits_delta, balance_after,
                actual_api_cost_usd, platform_profit_usd, reference_note, created_at
            ) VALUES (?, ?, ?, ?, 0.0, ?, ?, ?)
            """,
            (
                user_id,
                tx_type,
                grant_total,
                new_bal,
                float(plan["monthly_price_usd"]),
                ref_note or f"تفعيل {plan['name_ar']}",
                ts,
            ),
        )
    return plan


def assert_can_create_agent(user: Dict[str, Any]) -> None:
    if user.get("role") == "super_admin":
        return
    sub = user.get("subscription")
    if not sub:
        raise HTTPException(status_code=402, detail="لا يوجد اشتراك نشط على حسابك. يرجى اختيار باقة اشتراك أولاً.")
    max_agents = int(sub.get("max_agents", 3))
    if max_agents == -1:
        return
    with get_db() as conn:
        current_count = conn.execute("SELECT COUNT(*) FROM agents WHERE user_id = ?", (user["id"],)).fetchone()[0]
    if current_count >= max_agents:
        raise HTTPException(
            status_code=402,
            detail=f"وصلت إلى الحد الأقصى للوكلاء في باقتك الحالية ({max_agents} وكلاء). قم بترقية باقتك لإضافة عدد أكبر أو غير محدود.",
        )


def assert_can_run_mission(user: Dict[str, Any], mode: str, using_own_key: bool) -> None:
    if user.get("role") == "super_admin":
        return
    sub = user.get("subscription")
    if not sub:
        raise HTTPException(status_code=402, detail="اشتراكك غير مفعل. يرجى تفعيل باقة اشتراك لتشغيل الوكلاء.")
    if mode != "standalone" and not sub.get("allow_swarm"):
        raise HTTPException(
            status_code=402,
            detail="ميزة التكامل الجماعي بين عدة وكلاء (Swarm) متاحة بدءاً من باقة المحترفين (Pro Builder) فأعلى.",
        )
    if not using_own_key and float(user.get("credits_balance", 0.0)) < 1.0:
        raise HTTPException(
            status_code=402,
            detail="رصيد النقاط (Credits) في محفظتك غير كافٍ لتشغيل المهمة. يرجى شحن الرصيد أو ترقية الباقة.",
        )


def settle_mission_billing(
    user: Dict[str, Any],
    model_name: str,
    total_tokens: int,
    using_tenant_own_key: bool,
    mission_title: str,
) -> Dict[str, float]:
    """
    Calculates exact wholesale API cost in USD, applies the platform owner's markup multiplier,
    deducts credits from the subscriber's wallet, and records platform net profit.
    """
    rate_per_1m = MODEL_COST_PER_1M_TOKENS_USD.get(model_name, 0.50)
    actual_cost_usd = round((max(total_tokens, 50) / 1_000_000.0) * rate_per_1m, 6)

    with get_db() as conn:
        cfg = row_to_dict(conn.execute("SELECT * FROM platform_config WHERE id = 1").fetchone()) or {}
        usd_to_credits = float(cfg.get("usd_to_credits_rate", 1000.0))
        markup_x = float(cfg.get("markup_multiplier", 4.0))

        if using_tenant_own_key or user.get("role") == "super_admin":
            credits_charged = 0.0
            platform_profit_usd = 0.0
        else:
            billed_usd = actual_cost_usd * markup_x
            credits_charged = round(max(1.0, billed_usd * usd_to_credits), 2)
            platform_profit_usd = round((credits_charged / usd_to_credits) - actual_cost_usd, 6)

            u_row = conn.execute("SELECT credits_balance, total_spent_credits FROM users WHERE id = ?", (user["id"],)).fetchone()
            new_bal = round(max(0.0, float(u_row["credits_balance"]) - credits_charged), 2)
            new_spent = round(float(u_row["total_spent_credits"]) + credits_charged, 2)
            conn.execute(
                "UPDATE users SET credits_balance = ?, total_spent_credits = ? WHERE id = ?",
                (new_bal, new_spent, user["id"]),
            )
            conn.execute(
                """
                INSERT INTO wallet_transactions (
                    user_id, tx_type, credits_delta, balance_after,
                    actual_api_cost_usd, platform_profit_usd, reference_note, created_at
                ) VALUES (?, 'agent_usage', ?, ?, ?, ?, ?, ?)
                """,
                (
                    user["id"],
                    -credits_charged,
                    new_bal,
                    actual_cost_usd,
                    platform_profit_usd,
                    f"تشغيل مهمة: {mission_title[:60]} ({total_tokens} توكن)",
                    now_iso(),
                ),
            )

    return {
        "actual_api_cost_usd": actual_cost_usd,
        "credits_charged": credits_charged,
        "platform_profit_usd": platform_profit_usd,
    }


def create_stripe_checkout_url(
    user: Dict[str, Any],
    plan: Dict[str, Any],
    invoice_number: str,
    success_url: str,
    cancel_url: str,
) -> Optional[str]:
    """Creates a real Stripe Checkout Session via Stripe REST API if stripe_secret_key is configured."""
    with get_db() as conn:
        cfg = conn.execute("SELECT stripe_secret_key FROM platform_config WHERE id = 1").fetchone()
        stripe_sk = (cfg["stripe_secret_key"] if cfg else "").strip()

    if not stripe_sk:
        return None

    amount_cents = int(round(float(plan["monthly_price_usd"]) * 100))
    form_data = urllib.parse.urlencode(
        {
            "mode": "payment",
            "customer_email": user["email"],
            "client_reference_id": invoice_number,
            "success_url": success_url,
            "cancel_url": cancel_url,
            "line_items[0][price_data][currency]": "usd",
            "line_items[0][price_data][unit_amount]": str(amount_cents),
            "line_items[0][price_data][product_data][name]": plan["name_ar"],
            "line_items[0][quantity]": "1",
            "metadata[invoice_number]": invoice_number,
            "metadata[user_id]": str(user["id"]),
            "metadata[plan_id]": str(plan["id"]),
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        "https://api.stripe.com/v1/checkout/sessions",
        data=form_data,
        headers={
            "Authorization": f"Bearer {stripe_sk}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            session_obj = json.loads(resp.read().decode("utf-8"))
            return session_obj.get("url")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"فشل إنشاء جلسة دفع Stripe: {str(exc)[:140]}")


def verify_stripe_signature(payload_bytes: bytes, sig_header: str, webhook_secret: str) -> bool:
    if not sig_header or not webhook_secret:
        return False
    parts = dict(item.split("=", 1) for item in sig_header.split(",") if "=" in item)
    timestamp = parts.get("t", "")
    v1_sig = parts.get("v1", "")
    if not timestamp or not v1_sig:
        return False
    signed_payload = f"{timestamp}.".encode("utf-8") + payload_bytes
    expected = hmac.new(webhook_secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, v1_sig)

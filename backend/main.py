import asyncio
import json
import os
import secrets
from typing import Any, Dict, List

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from agent_runtime import execute_enterprise_mission, test_llm_connection
from auth import (
    create_access_token,
    generate_customer_api_key,
    get_current_user,
    get_user_from_api_key,
    get_user_with_subscription,
    hash_password,
    require_super_admin,
    verify_password,
)
from billing import (
     assert_can_create_agent,
    assign_plan_to_user,
    bootstrap_enterprise_seed,
    create_stripe_checkout_url,
    verify_stripe_signature,
)
from database import get_db, init_enterprise_db, now_iso, row_to_dict, rows_to_list
from models import (
    AdminCreditAdjust,
    AdminPlanUpdate,
    AdminPlatformConfigUpdate,
    AdminVoucherCreate,
    AgentCreateRequest,
    AgentUpdateRequest,
    ApiKeyCreateRequest,
    CheckoutRequest,
    CustomToolCreateRequest,
    LlmTestRequest,
    LoginRequest,
    MissionExecuteRequest,
    RegisterRequest,
    TenantByokUpdate,
    VoucherRedeemRequest,
    to_dict,
)
from tools_runtime import execute_real_tool, get_available_tools_for_user

app = FastAPI(
    title="Nexus AgentOS Enterprise SaaS API",
    description="Multi-Tenant AI Agent Operating System with JWT Auth, Subscriptions, Credit Billing, and Native Tool-Calling ReAct Loop",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_enterprise_db()
    bootstrap_enterprise_seed()


# ==================== PUBLIC & AUTHENTICATION ====================

@app.get("/api/public/info")
def get_public_info() -> Dict[str, Any]:
    with get_db() as conn:
        cfg = row_to_dict(conn.execute("SELECT * FROM platform_config WHERE id = 1").fetchone()) or {}
        plans = rows_to_list(
            conn.execute("SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY monthly_price_usd ASC").fetchall()
        )
    return {
        "platform_name": cfg.get("platform_name", "Nexus AgentOS Enterprise"),
        "stripe_enabled": bool(cfg.get("stripe_secret_key")),
        "manual_payment_instructions": cfg.get("manual_payment_instructions", ""),
        "allow_tenant_byok": bool(cfg.get("allow_tenant_byok", True)),
        "plans": plans,
    }


@app.post("/api/auth/register")
def register_account(req: RegisterRequest) -> Dict[str, Any]:
    email = req.email.strip().lower()
    if "@" not in email or len(email) < 5:
        raise HTTPException(status_code=400, detail="يرجى إدخال بريد إلكتروني صحيح.")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="كلمة المرور يجب ألا تقل عن 6 أحرف.")
    if not req.full_name.strip():
        raise HTTPException(status_code=400, detail="الاسم الكامل مطلوب.")

    pw_hash, pw_salt = hash_password(req.password)
    ts = now_iso()

    with get_db() as conn:
        exists = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if exists:
            raise HTTPException(status_code=409, detail="هذا البريد الإلكتروني مسجل مسبقاً. يمكنك تسجيل الدخول مباشرة.")

        cur = conn.execute(
            """
            INSERT INTO users (
                email, full_name, company_name, password_hash, password_salt,
                role, is_active, credits_balance, last_login_at, created_at
            ) VALUES (?, ?, ?, ?, ?, 'subscriber', 1, 0.0, ?, ?)
            """,
            (email, req.full_name.strip(), req.company_name.strip(), pw_hash, pw_salt, ts, ts),
        )
        user_id = int(cur.lastrowid)

        free_plan = conn.execute("SELECT id FROM subscription_plans WHERE code = 'free_trial'").fetchone()

    # Always grant initial Free Trial immediately so user lands in a working workspace; paid plans go through checkout/voucher
    if free_plan:
        assign_plan_to_user(user_id, int(free_plan["id"]), tx_type="subscription_grant", ref_note="تفعيل الباقة التجريبية عند التسجيل")

    token = create_access_token(user_id=user_id, email=email, role="subscriber")
    user_profile = get_user_with_subscription(user_id)
    return {"access_token": token, "token_type": "bearer", "user": user_profile}


@app.post("/api/auth/login")
def login_account(req: LoginRequest) -> Dict[str, Any]:
    email = req.email.strip().lower()
    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="البريد الإلكتروني أو كلمة المرور غير صحيحة.")
        if not verify_password(req.password, row["password_hash"], row["password_salt"]):
            raise HTTPException(status_code=401, detail="البريد الإلكتروني أو كلمة المرور غير صحيحة.")
        if not row["is_active"]:
            raise HTTPException(status_code=403, detail="تم إيقاف هذا الحساب من قِبل إدارة المنصة.")
        conn.execute("UPDATE users SET last_login_at = ? WHERE id = ?", (now_iso(), row["id"]))
        uid = int(row["id"])
        role = str(row["role"])

    token = create_access_token(user_id=uid, email=email, role=role)
    return {"access_token": token, "token_type": "bearer", "user": get_user_with_subscription(uid)}


@app.get("/api/auth/me")
def get_me(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    return user


@app.put("/api/auth/byok")
def update_tenant_byok(payload: TenantByokUpdate, user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    with get_db() as conn:
        cfg = conn.execute("SELECT allow_tenant_byok FROM platform_config WHERE id = 1").fetchone()
        if cfg and not cfg["allow_tenant_byok"] and user["role"] != "super_admin":
            raise HTTPException(status_code=403, detail="إدارة المنصة أوقفت ميزة المفاتيح الخاصة للمشتركين.")
        conn.execute(
            "UPDATE users SET tenant_llm_provider = ?, tenant_llm_api_key = ? WHERE id = ?",
            (payload.provider.strip().lower(), payload.api_key.strip(), user["id"]),
        )
    return get_user_with_subscription(user["id"]) or {}


# ==================== SUBSCRIPTIONS, STRIPE, INVOICES & VOUCHERS ====================

@app.get("/api/billing/wallet")
def get_wallet_and_invoices(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    with get_db() as conn:
        invoices = rows_to_list(
            conn.execute(
                """
                SELECT i.*, p.name_ar AS plan_name
                FROM invoices i
                LEFT JOIN subscription_plans p ON p.id = i.plan_id
                WHERE i.user_id = ? ORDER BY i.id DESC LIMIT 30
                """,
                (user["id"],),
            ).fetchall()
        )
        txs = rows_to_list(
            conn.execute(
                "SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY id DESC LIMIT 40",
                (user["id"],),
            ).fetchall()
        )
    return {
        "credits_balance": user["credits_balance"],
        "total_spent_credits": user["total_spent_credits"],
        "subscription": user.get("subscription"),
        "invoices": invoices,
        "transactions": txs,
    }


@app.post("/api/billing/checkout")
def create_subscription_checkout(
    req: CheckoutRequest,
    request: Request,
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        plan = row_to_dict(conn.execute("SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1", (req.plan_id,)).fetchone())
        if not plan:
            raise HTTPException(status_code=404, detail="الباقة المطلوبة غير متاحة.")

        inv_num = "INV-" + secrets.token_hex(4).upper()
        ts = now_iso()

        if float(plan["monthly_price_usd"]) <= 0:
            assign_plan_to_user(user["id"], plan["id"], ref_note="تفعيل باقة مجانية")
            return {"status": "activated", "invoice_number": inv_num, "user": get_user_with_subscription(user["id"])}

        conn.execute(
            """
            INSERT INTO invoices (
                invoice_number, user_id, plan_id, amount_usd, credits_to_grant,
                payment_method, payment_reference, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
            """,
            (
                inv_num,
                user["id"],
                plan["id"],
                plan["monthly_price_usd"],
                plan["included_credits"],
                req.payment_method,
                req.payment_reference.strip(),
                ts,
            ),
        )

    if req.payment_method == "stripe":
        origin = str(request.base_url).rstrip("/")
        stripe_url = create_stripe_checkout_url(
            user=user,
            plan=plan,
            invoice_number=inv_num,
            success_url=f"{origin}/?payment=success&inv={inv_num}",
            cancel_url=f"{origin}/?payment=cancel",
        )
        if not stripe_url:
            raise HTTPException(
                status_code=400,
                detail="بوابة Stripe غير مفعلة بمفتاح حي حالياً. استخدم التحويل المباشر أو كود التفعيل.",
            )
        return {"status": "redirect_stripe", "checkout_url": stripe_url, "invoice_number": inv_num}

    return {
        "status": "pending_approval",
        "invoice_number": inv_num,
        "message": "تم تسجيل طلب الاشتراك والفاتورة بنجاح. سيتم التفعيل فور مراجعة مرجع التحويل من الإدارة.",
    }


@app.post("/api/billing/stripe-webhook")
async def stripe_webhook_handler(request: Request, stripe_signature: str = Header(None)) -> Dict[str, Any]:
    raw_body = await request.body()
    with get_db() as conn:
        cfg = conn.execute("SELECT stripe_webhook_secret FROM platform_config WHERE id = 1").fetchone()
        wh_secret = (cfg["stripe_webhook_secret"] if cfg else "").strip()

    if not verify_stripe_signature(raw_body, stripe_signature or "", wh_secret):
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")

    event = json.loads(raw_body.decode("utf-8"))
    if event.get("type") == "checkout.session.completed":
        session_obj = event.get("data", {}).get("object", {})
        inv_num = session_obj.get("client_reference_id") or session_obj.get("metadata", {}).get("invoice_number")
        if inv_num:
            with get_db() as conn:
                inv = row_to_dict(conn.execute("SELECT * FROM invoices WHERE invoice_number = ?", (inv_num,)).fetchone())
                if inv and inv["status"] != "paid":
                    conn.execute(
                        "UPDATE invoices SET status = 'paid', paid_at = ? WHERE id = ?",
                        (now_iso(), inv["id"]),
                    )
                    if inv.get("plan_id"):
                        assign_plan_to_user(inv["user_id"], int(inv["plan_id"]), ref_note=f"Stripe {inv_num}")
    return {"received": True}


@app.post("/api/billing/redeem-voucher")
def redeem_voucher_code(req: VoucherRedeemRequest, user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    code = req.code.strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="يرجى إدخال كود التفعيل.")

    with get_db() as conn:
        v = row_to_dict(conn.execute("SELECT * FROM vouchers WHERE code = ? AND is_active = 1", (code,)).fetchone())
        if not v:
            raise HTTPException(status_code=404, detail="كود التفعيل غير صحيح أو منتهي الصلاحية.")
        if int(v["used_count"]) >= int(v["max_uses"]):
            raise HTTPException(status_code=400, detail="تم استنفاد الحد الأقصى لاستخدام هذا الكود.")

        conn.execute("UPDATE vouchers SET used_count = used_count + 1 WHERE id = ?", (v["id"],))

    if v.get("plan_id"):
        assign_plan_to_user(
            user_id=user["id"],
            plan_id=int(v["plan_id"]),
            bonus_credits=float(v["bonus_credits"]),
            tx_type="voucher",
            ref_note=f"تفعيل كود الاشتراك {code}",
        )
    else:
        with get_db() as conn:
            u = conn.execute("SELECT credits_balance FROM users WHERE id = ?", (user["id"],)).fetchone()
            new_bal = round(float(u["credits_balance"]) + float(v["bonus_credits"]), 2)
            conn.execute("UPDATE users SET credits_balance = ? WHERE id = ?", (new_bal, user["id"]))
            conn.execute(
                """
                INSERT INTO wallet_transactions (
                    user_id, tx_type, credits_delta, balance_after, reference_note, created_at
                ) VALUES (?, 'voucher', ?, ?, ?, ?)
                """,
                (user["id"], float(v["bonus_credits"]), new_bal, f"شحن رصيد بكود {code}", now_iso()),
            )

    return {"redeemed": True, "user": get_user_with_subscription(user["id"])}


# ==================== TENANT WORKSPACE: DASHBOARD, AGENTS, TOOLS, MISSIONS ====================

@app.get("/api/dashboard")
def get_tenant_dashboard(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    with get_db() as conn:
        my_agents = rows_to_list(conn.execute("SELECT * FROM agents WHERE user_id = ? ORDER BY id DESC", (user["id"],)).fetchall())
        marketplace_count = conn.execute("SELECT COUNT(*) FROM agents WHERE is_marketplace_public = 1").fetchone()[0]
        my_missions = rows_to_list(
            conn.execute("SELECT * FROM missions WHERE user_id = ? ORDER BY id DESC LIMIT 10", (user["id"],)).fetchall()
        )
        cfg = row_to_dict(conn.execute("SELECT * FROM platform_config WHERE id = 1").fetchone()) or {}

    has_central_key = any(
        bool(cfg.get(k)) for k in ("openrouter_api_key", "gemini_api_key", "openai_api_key", "custom_llm_api_key")
    )
    llm_ready = has_central_key or bool(user.get("has_tenant_api_key"))
    domains = sorted(list({a["domain"] for a in my_agents}))
    total_tokens = sum(int(a.get("total_tokens", 0)) for a in my_agents)

    return {
        "user": user,
        "llm_ready": llm_ready,
        "stats": {
            "private_agents_count": len(my_agents),
            "marketplace_agents_count": marketplace_count,
            "custom_domains_count": len(domains),
            "missions_count": len(my_missions),
            "total_tokens_processed": total_tokens,
        },
        "domains": domains,
        "recent_missions": my_missions,
    }


@app.get("/api/agents")
def list_tenant_and_marketplace_agents(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    with get_db() as conn:
        my_agents = rows_to_list(
            conn.execute("SELECT * FROM agents WHERE user_id = ? ORDER BY id DESC", (user["id"],)).fetchall()
        )
        marketplace = rows_to_list(
            conn.execute(
                "SELECT * FROM agents WHERE is_marketplace_public = 1 AND user_id != ? ORDER BY id DESC",
                (user["id"],),
            ).fetchall()
        )
    return {"my_agents": my_agents, "marketplace_agents": marketplace}


@app.post("/api/agents")
def create_tenant_agent(payload: AgentCreateRequest, user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    assert_can_create_agent(user)
    if not payload.name.strip() or not payload.domain.strip() or not payload.system_prompt.strip():
        raise HTTPException(status_code=400, detail="اسم الوكيل والمجال والبرومبت حقول إلزامية.")

    is_pub = 1 if (payload.is_marketplace_public and user["role"] == "super_admin") else 0
    ts = now_iso()
    with get_db() as conn:
        cur = conn.execute(
            """
            INSERT INTO agents (
                user_id, is_marketplace_public, marketplace_credit_fee, name, role_title,
                domain, description, system_prompt, model, temperature,
                installed_tools, can_delegate, max_iterations, trigger_type,
                cron_interval_minutes, webhook_secret, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
            """,
            (
                user["id"],
                is_pub,
                max(0.0, payload.marketplace_credit_fee),
                payload.name.strip(),
                payload.role_title.strip() or f"خبير {payload.domain.strip()}",
                payload.domain.strip(),
                payload.description.strip() or payload.name.strip(),
                payload.system_prompt.strip(),
                payload.model.strip() or "google/gemini-2.5-flash",
                max(0.0, min(1.5, payload.temperature)),
                json.dumps(payload.installed_tools),
                1 if payload.can_delegate else 0,
                max(1, min(8, payload.max_iterations)),
                payload.trigger_type,
                max(1, payload.cron_interval_minutes),
                "whsec_" + secrets.token_hex(12),
                ts,
            ),
        )
        created = row_to_dict(conn.execute("SELECT * FROM agents WHERE id = ?", (cur.lastrowid,)).fetchone())
    assert created is not None
    return created


@app.post("/api/agents/{agent_id}/install")
def install_marketplace_agent(agent_id: int, user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    assert_can_create_agent(user)
    with get_db() as conn:
        tpl = row_to_dict(
            conn.execute(
                "SELECT * FROM agents WHERE id = ? AND (is_marketplace_public = 1 OR user_id = ?)",
                (agent_id, user["id"]),
            ).fetchone()
        )
        if not tpl:
            raise HTTPException(status_code=404, detail="قالب الوكيل غير موجود في المتجر.")

        cur = conn.execute(
            """
            INSERT INTO agents (
                user_id, is_marketplace_public, marketplace_credit_fee, name, role_title,
                domain, description, system_prompt, model, temperature,
                installed_tools, can_delegate, max_iterations, trigger_type,
                cron_interval_minutes, webhook_secret, status, created_at
            ) VALUES (?, 0, 0.0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', 60, ?, 'active', ?)
            """,
            (
                user["id"],
                tpl["name"],
                tpl["role_title"],
                tpl["domain"],
                tpl["description"],
                tpl["system_prompt"],
                tpl["model"],
                tpl["temperature"],
                json.dumps(tpl["installed_tools"]),
                1 if tpl["can_delegate"] else 0,
                tpl["max_iterations"],
                "whsec_" + secrets.token_hex(12),
                now_iso(),
            ),
        )
        installed = row_to_dict(conn.execute("SELECT * FROM agents WHERE id = ?", (cur.lastrowid,)).fetchone())
    assert installed is not None
    return installed


@app.patch("/api/agents/{agent_id}")
def update_tenant_agent(
    agent_id: int,
    payload: AgentUpdateRequest,
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    updates = {k: v for k, v in to_dict(payload).items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="لا توجد بيانات للتحديث.")

    if "is_marketplace_public" in updates and user["role"] != "super_admin":
        updates.pop("is_marketplace_public")
    elif "is_marketplace_public" in updates:
        updates["is_marketplace_public"] = 1 if updates["is_marketplace_public"] else 0

    if "installed_tools" in updates:
        updates["installed_tools"] = json.dumps(updates["installed_tools"])
    if "can_delegate" in updates:
        updates["can_delegate"] = 1 if updates["can_delegate"] else 0

    with get_db() as conn:
        row = conn.execute("SELECT user_id FROM agents WHERE id = ?", (agent_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="الوكيل غير موجود.")
        if row["user_id"] != user["id"] and user["role"] != "super_admin":
            raise HTTPException(status_code=403, detail="لا تملك صلاحية تعديل هذا الوكيل.")

        set_sql = ", ".join(f"{k} = ?" for k in updates.keys())
        conn.execute(f"UPDATE agents SET {set_sql} WHERE id = ?", list(updates.values()) + [agent_id])
        updated = row_to_dict(conn.execute("SELECT * FROM agents WHERE id = ?", (agent_id,)).fetchone())
    assert updated is not None
    return updated


@app.delete("/api/agents/{agent_id}")
def delete_tenant_agent(agent_id: int, user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    with get_db() as conn:
        row = conn.execute("SELECT user_id FROM agents WHERE id = ?", (agent_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="الوكيل غير موجود.")
        if row["user_id"] != user["id"] and user["role"] != "super_admin":
            raise HTTPException(status_code=403, detail="غير مصرح بحذف هذا الوكيل.")
        conn.execute("DELETE FROM agents WHERE id = ?", (agent_id,))
    return {"deleted": True, "id": agent_id}


# ==================== TOOLS REGISTRY (ISOLATED PER TENANT) ====================

@app.get("/api/tools")
def list_tools_endpoint(user: Dict[str, Any] = Depends(get_current_user)) -> List[Dict[str, Any]]:
    return get_available_tools_for_user(user["id"])


@app.post("/api/tools")
def create_tenant_custom_tool(
    payload: CustomToolCreateRequest,
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    sub = user.get("subscription")
    if user["role"] != "super_admin" and (not sub or not sub.get("allow_custom_tools")):
        raise HTTPException(status_code=402, detail="إضافة أدوات API خاصة متاحة بدءاً من باقة المحترفين (Pro Builder).")

    clean_slug = "".join(c if (c.isalnum() or c == "_") else "_" for c in payload.slug.lower().strip()).strip("_")
    if not clean_slug:
        clean_slug = "api_tool_" + secrets.token_hex(3)

    schema = payload.parameters_schema_json or {
        "type": "object",
        "properties": {"input_text": {"type": "string", "description": "المدخل المرسل إلى الـ API"}},
        "required": ["input_text"],
    }

    with get_db() as conn:
        cur = conn.execute(
            """
            INSERT INTO tools (
                user_id, slug, name, category, description, parameters_schema_json,
                execution_type, endpoint_url, http_method, headers_json, body_template, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'http_request', ?, ?, ?, ?, ?)
            """,
            (
                user["id"],
                clean_slug,
                payload.name.strip(),
                payload.category.strip(),
                payload.description.strip(),
                json.dumps(schema, ensure_ascii=False),
                payload.endpoint_url.strip(),
                payload.http_method.upper().strip() or "POST",
                json.dumps(payload.headers_json),
                payload.body_template,
                now_iso(),
            ),
        )
        created = row_to_dict(conn.execute("SELECT * FROM tools WHERE id = ?", (cur.lastrowid,)).fetchone())
    assert created is not None
    return created


@app.post("/api/tools/{tool_id}/test")
async def test_single_tool(
    tool_id: int,
    sample_args: Dict[str, Any],
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    with get_db() as conn:
        t = row_to_dict(
            conn.execute(
                "SELECT * FROM tools WHERE id = ? AND (user_id IS NULL OR user_id = ?)",
                (tool_id, user["id"]),
            ).fetchone()
        )
    if not t:
        raise HTTPException(status_code=404, detail="الأداة غير موجودة.")
    raw = await asyncio.to_thread(execute_real_tool, t, sample_args, 0, user["id"])
    return {"tool": t["slug"], "result": raw}


@app.delete("/api/tools/{tool_id}")
def delete_tenant_tool(tool_id: int, user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    with get_db() as conn:
        t = conn.execute("SELECT user_id FROM tools WHERE id = ?", (tool_id,)).fetchone()
        if not t:
            raise HTTPException(status_code=404, detail="الأداة غير موجودة.")
        if t["user_id"] is None:
            raise HTTPException(status_code=400, detail="لا يمكن حذف الأدوات المدمجة في نواة النظام.")
        if t["user_id"] != user["id"] and user["role"] != "super_admin":
            raise HTTPException(status_code=403, detail="غير مصرح بحذف هذه الأداة.")
        conn.execute("DELETE FROM tools WHERE id = ?", (tool_id,))
    return {"deleted": True}


# ==================== MISSIONS EXECUTION & EXTERNAL PROGRAMMATIC API ====================

@app.get("/api/missions")
def list_tenant_missions(user: Dict[str, Any] = Depends(get_current_user)) -> List[Dict[str, Any]]:
    with get_db() as conn:
        return rows_to_list(
            conn.execute("SELECT * FROM missions WHERE user_id = ? ORDER BY id DESC LIMIT 30", (user["id"],)).fetchall()
        )


@app.get("/api/missions/{mission_id}")
def get_tenant_mission_detail(mission_id: int, user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    with get_db() as conn:
        m = row_to_dict(conn.execute("SELECT * FROM missions WHERE id = ?", (mission_id,)).fetchone())
        if not m or (m["user_id"] != user["id"] and user["role"] != "super_admin"):
            raise HTTPException(status_code=404, detail="المهمة غير موجودة.")
        steps = rows_to_list(
            conn.execute("SELECT * FROM mission_steps WHERE mission_id = ? ORDER BY step_order ASC", (mission_id,)).fetchall()
        )
    m["steps"] = steps
    return m


@app.post("/api/missions/execute")
async def execute_mission_endpoint(
    req: MissionExecuteRequest,
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    if not req.goal_prompt.strip():
        raise HTTPException(status_code=400, detail="اكتب الهدف أو المهمة المطلوب تنفيذها.")
    return await asyncio.to_thread(
        execute_enterprise_mission,
        user,
        req.goal_prompt.strip(),
        req.execution_mode,
        req.agent_ids,
        req.title,
    )


@app.get("/api/developer/keys")
def list_developer_keys(user: Dict[str, Any] = Depends(get_current_user)) -> List[Dict[str, Any]]:
    with get_db() as conn:
        return rows_to_list(
            conn.execute(
                "SELECT id, label, key_prefix, is_active, last_used_at, created_at FROM customer_api_keys WHERE user_id = ? ORDER BY id DESC",
                (user["id"],),
            ).fetchall()
        )


@app.post("/api/developer/keys")
def create_developer_key(req: ApiKeyCreateRequest, user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    sub = user.get("subscription")
    if user["role"] != "super_admin" and (not sub or not sub.get("allow_api_access")):
        raise HTTPException(status_code=402, detail="مفاتيح الـ API البرمجية متاحة بدءاً من باقة الشركات (Business Swarm).")

    raw_key, prefix, key_hash = generate_customer_api_key()
    with get_db() as conn:
        cur = conn.execute(
            """
            INSERT INTO customer_api_keys (user_id, label, key_prefix, key_hash, is_active, created_at)
            VALUES (?, ?, ?, ?, 1, ?)
            """,
            (user["id"], req.label.strip() or "API Key", prefix, key_hash, now_iso()),
        )
        kid = int(cur.lastrowid)
    return {"id": kid, "label": req.label, "secret_key": raw_key, "key_prefix": prefix}


@app.delete("/api/developer/keys/{key_id}")
def revoke_developer_key(key_id: int, user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    with get_db() as conn:
        conn.execute("DELETE FROM customer_api_keys WHERE id = ? AND user_id = ?", (key_id, user["id"]))
    return {"revoked": True}


@app.post("/api/v1/external/agents/{agent_id}/run")
async def run_agent_via_external_api(
    agent_id: int,
    payload: Dict[str, Any],
    api_user: Dict[str, Any] = Depends(get_user_from_api_key),
) -> Dict[str, Any]:
    prompt = str(payload.get("prompt") or payload.get("input") or "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Missing 'prompt' field in JSON body.")
    result = await asyncio.to_thread(
        execute_enterprise_mission,
        api_user,
        prompt,
        "standalone",
        [agent_id],
        f"[External API] Agent #{agent_id}",
    )
    return {
        "mission_id": result["id"],
        "output": result["final_output"],
        "credits_charged": result["credits_charged"],
        "tokens": result["prompt_tokens"] + result["completion_tokens"],
    }


@app.post("/api/webhooks/agent/{agent_id}/{webhook_secret}")
async def run_agent_via_webhook(agent_id: int, webhook_secret: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    with get_db() as conn:
        ag = row_to_dict(conn.execute("SELECT * FROM agents WHERE id = ?", (agent_id,)).fetchone())
    if not ag or ag.get("webhook_secret") != webhook_secret:
        raise HTTPException(status_code=403, detail="Invalid agent ID or webhook secret.")
    owner = get_user_with_subscription(int(ag["user_id"]))
    if not owner or not owner.get("is_active"):
        raise HTTPException(status_code=403, detail="Agent owner account inactive.")

    task_str = str(payload.get("task") or payload.get("message") or json.dumps(payload, ensure_ascii=False))
    res = await asyncio.to_thread(
        execute_enterprise_mission,
        owner,
        task_str,
        "standalone",
        [agent_id],
        f"[Webhook] {ag['name']}",
    )
    return {"ok": True, "mission_id": res["id"], "output": res["final_output"]}


# ==================== SUPER ADMIN CONTROL PANEL ====================

@app.get("/api/admin/overview")
def admin_financial_and_users_overview(_: Dict[str, Any] = Depends(require_super_admin)) -> Dict[str, Any]:
    with get_db() as conn:
        users_count = conn.execute("SELECT COUNT(*) FROM users WHERE role = 'subscriber'").fetchone()[0]
        active_subs = conn.execute("SELECT COUNT(*) FROM subscriptions WHERE status = 'active'").fetchone()[0]
        total_agents = conn.execute("SELECT COUNT(*) FROM agents").fetchone()[0]
        total_missions = conn.execute("SELECT COUNT(*) FROM missions").fetchone()[0]

        paid_inv_sum = conn.execute("SELECT COALESCE(SUM(amount_usd), 0) FROM invoices WHERE status = 'paid'").fetchone()[0]
        pending_invs = conn.execute("SELECT COUNT(*) FROM invoices WHERE status = 'pending'").fetchone()[0]

        api_cost_sum = conn.execute("SELECT COALESCE(SUM(actual_api_cost_usd), 0) FROM wallet_transactions").fetchone()[0]
        usage_profit_sum = conn.execute(
            "SELECT COALESCE(SUM(platform_profit_usd), 0) FROM wallet_transactions WHERE tx_type = 'agent_usage'"
        ).fetchone()[0]

        mrr_sum = conn.execute(
            """
            SELECT COALESCE(SUM(p.monthly_price_usd), 0)
            FROM subscriptions s
            JOIN subscription_plans p ON p.id = s.plan_id
            JOIN users u ON u.id = s.user_id
            WHERE s.status = 'active' AND u.role = 'subscriber'
            """
        ).fetchone()[0]

    gross_revenue = round(float(paid_inv_sum) + float(mrr_sum), 2)
    net_profit = round(gross_revenue - float(api_cost_sum), 4)

    return {
        "subscribers_count": users_count,
        "active_subscriptions": active_subs,
        "total_agents_platform": total_agents,
        "total_missions_platform": total_missions,
        "mrr_usd": round(float(mrr_sum), 2),
        "paid_invoices_usd": round(float(paid_inv_sum), 2),
        "pending_invoices_count": pending_invs,
        "wholesale_api_cost_usd": round(float(api_cost_sum), 5),
        "token_markup_profit_usd": round(float(usage_profit_sum), 4),
        "net_platform_profit_usd": net_profit,
    }


@app.get("/api/admin/users")
def admin_list_users(_: Dict[str, Any] = Depends(require_super_admin)) -> List[Dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT u.id, u.email, u.full_name, u.company_name, u.role, u.is_active,
                   u.credits_balance, u.total_spent_credits, u.created_at, u.last_login_at,
                   p.name_ar AS plan_name, p.monthly_price_usd
            FROM users u
            LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
            LEFT JOIN subscription_plans p ON p.id = s.plan_id
            ORDER BY u.id DESC
            """
        ).fetchall()
        return rows_to_list(rows)


@app.patch("/api/admin/users/{uid}/toggle-active")
def admin_toggle_user(uid: int, admin: Dict[str, Any] = Depends(require_super_admin)) -> Dict[str, Any]:
    if uid == admin["id"]:
        raise HTTPException(status_code=400, detail="لا يمكنك إيقاف حساب المالك الرئيسي.")
    with get_db() as conn:
        row = conn.execute("SELECT is_active FROM users WHERE id = ?", (uid,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="المستخدم غير موجود.")
        next_val = 0 if row["is_active"] else 1
        conn.execute("UPDATE users SET is_active = ? WHERE id = ?", (next_val, uid))
    return {"id": uid, "is_active": bool(next_val)}


@app.post("/api/admin/users/{uid}/adjust-credits")
def admin_adjust_user_credits(
    uid: int,
    req: AdminCreditAdjust,
    _: Dict[str, Any] = Depends(require_super_admin),
) -> Dict[str, Any]:
    with get_db() as conn:
        row = conn.execute("SELECT credits_balance FROM users WHERE id = ?", (uid,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="المستخدم غير موجود.")
        new_bal = round(max(0.0, float(row["credits_balance"]) + req.credits_delta), 2)
        conn.execute("UPDATE users SET credits_balance = ? WHERE id = ?", (new_bal, uid))
        conn.execute(
            """
            INSERT INTO wallet_transactions (user_id, tx_type, credits_delta, balance_after, reference_note, created_at)
            VALUES (?, 'admin_adjustment', ?, ?, ?, ?)
            """,
            (uid, req.credits_delta, new_bal, req.note.strip(), now_iso()),
        )
    return {"user_id": uid, "credits_balance": new_bal}


@app.post("/api/admin/users/{uid}/assign-plan/{plan_id}")
def admin_assign_plan(uid: int, plan_id: int, _: Dict[str, Any] = Depends(require_super_admin)) -> Dict[str, Any]:
    plan = assign_plan_to_user(uid, plan_id, tx_type="admin_adjustment", ref_note="ترقية إدارية مباشرة من مالك المنصة")
    return {"assigned": True, "plan": plan["name_ar"]}


@app.get("/api/admin/invoices")
def admin_list_invoices(_: Dict[str, Any] = Depends(require_super_admin)) -> List[Dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT i.*, u.email AS user_email, u.full_name AS user_name, p.name_ar AS plan_name
            FROM invoices i
            JOIN users u ON u.id = i.user_id
            LEFT JOIN subscription_plans p ON p.id = i.plan_id
            ORDER BY i.id DESC LIMIT 100
            """
        ).fetchall()
        return rows_to_list(rows)


@app.post("/api/admin/invoices/{inv_id}/approve")
def admin_approve_invoice(inv_id: int, _: Dict[str, Any] = Depends(require_super_admin)) -> Dict[str, Any]:
    with get_db() as conn:
        inv = row_to_dict(conn.execute("SELECT * FROM invoices WHERE id = ?", (inv_id,)).fetchone())
        if not inv:
            raise HTTPException(status_code=404, detail="الفاتورة غير موجودة.")
        if inv["status"] == "paid":
            return {"already_paid": True}
        conn.execute("UPDATE invoices SET status = 'paid', paid_at = ? WHERE id = ?", (now_iso(), inv_id))

    if inv.get("plan_id"):
        assign_plan_to_user(
            user_id=int(inv["user_id"]),
            plan_id=int(inv["plan_id"]),
            tx_type="subscription_grant",
            ref_note=f"اعتماد فاتورة {inv['invoice_number']}",
        )
    return {"approved": True, "invoice_number": inv["invoice_number"]}


@app.post("/api/admin/invoices/{inv_id}/reject")
def admin_reject_invoice(inv_id: int, _: Dict[str, Any] = Depends(require_super_admin)) -> Dict[str, Any]:
    with get_db() as conn:
        conn.execute("UPDATE invoices SET status = 'rejected' WHERE id = ? AND status = 'pending'", (inv_id,))
    return {"rejected": True}


@app.get("/api/admin/vouchers")
def admin_list_vouchers(_: Dict[str, Any] = Depends(require_super_admin)) -> List[Dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT v.*, p.name_ar AS plan_name
            FROM vouchers v
            LEFT JOIN subscription_plans p ON p.id = v.plan_id
            ORDER BY v.id DESC
            """
        ).fetchall()
        return rows_to_list(rows)


@app.post("/api/admin/vouchers")
def admin_create_voucher(req: AdminVoucherCreate, _: Dict[str, Any] = Depends(require_super_admin)) -> Dict[str, Any]:
    code = req.code.strip().upper() or ("VIP-" + secrets.token_hex(3).upper())
    with get_db() as conn:
        cur = conn.execute(
            """
            INSERT INTO vouchers (code, plan_id, bonus_credits, max_uses, used_count, is_active, created_at)
            VALUES (?, ?, ?, ?, 0, 1, ?)
            """,
            (code, req.plan_id, max(0.0, req.bonus_credits), max(1, req.max_uses), now_iso()),
        )
        created = row_to_dict(conn.execute("SELECT * FROM vouchers WHERE id = ?", (cur.lastrowid,)).fetchone())
    assert created is not None
    return created


@app.patch("/api/admin/plans/{plan_id}")
def admin_update_plan(
    plan_id: int,
    payload: AdminPlanUpdate,
    _: Dict[str, Any] = Depends(require_super_admin),
) -> Dict[str, Any]:
    updates = {k: v for k, v in to_dict(payload).items() if v is not None}
    for bf in ("allow_swarm", "allow_custom_tools", "allow_api_access", "allow_autonomous_cron"):
        if bf in updates:
            updates[bf] = 1 if updates[bf] else 0
    if not updates:
        raise HTTPException(status_code=400, detail="لا توجد تعديلات.")
    set_sql = ", ".join(f"{k} = ?" for k in updates.keys())
    with get_db() as conn:
        conn.execute(f"UPDATE subscription_plans SET {set_sql} WHERE id = ?", list(updates.values()) + [plan_id])
        updated = row_to_dict(conn.execute("SELECT * FROM subscription_plans WHERE id = ?", (plan_id,)).fetchone())
    assert updated is not None
    return updated


@app.get("/api/admin/config")
def admin_get_config(_: Dict[str, Any] = Depends(require_super_admin)) -> Dict[str, Any]:
    with get_db() as conn:
        c = row_to_dict(conn.execute("SELECT * FROM platform_config WHERE id = 1").fetchone()) or {}
    return {
        "platform_name": c.get("platform_name", ""),
        "active_llm_provider": c.get("active_llm_provider", "openrouter"),
        "has_openrouter_key": bool(c.get("openrouter_api_key")),
        "has_gemini_key": bool(c.get("gemini_api_key")),
        "has_openai_key": bool(c.get("openai_api_key")),
        "custom_llm_base_url": c.get("custom_llm_base_url", ""),
        "has_custom_key": bool(c.get("custom_llm_api_key")),
        "default_model": c.get("default_model", "google/gemini-2.5-flash"),
        "usd_to_credits_rate": c.get("usd_to_credits_rate", 1000.0),
        "markup_multiplier": c.get("markup_multiplier", 4.0),
        "allow_tenant_byok": bool(c.get("allow_tenant_byok", True)),
        "has_stripe_secret": bool(c.get("stripe_secret_key")),
        "stripe_publishable_key": c.get("stripe_publishable_key", ""),
        "has_stripe_webhook": bool(c.get("stripe_webhook_secret")),
        "manual_payment_instructions": c.get("manual_payment_instructions", ""),
    }


@app.put("/api/admin/config")
def admin_update_config(
    payload: AdminPlatformConfigUpdate,
    _: Dict[str, Any] = Depends(require_super_admin),
) -> Dict[str, Any]:
    raw_updates = {k: v for k, v in to_dict(payload).items() if v is not None}
    # Ignore empty secret fields so existing keys are preserved unless explicitly overwritten
    for secret_col in (
        "openrouter_api_key",
        "gemini_api_key",
        "openai_api_key",
        "custom_llm_api_key",
        "stripe_secret_key",
        "stripe_webhook_secret",
    ):
        if secret_col in raw_updates and raw_updates[secret_col] == "":
            raw_updates.pop(secret_col)

    if "allow_tenant_byok" in raw_updates:
        raw_updates["allow_tenant_byok"] = 1 if raw_updates["allow_tenant_byok"] else 0

    if raw_updates:
        set_sql = ", ".join(f"{k} = ?" for k in raw_updates.keys())
        with get_db() as conn:
            conn.execute(f"UPDATE platform_config SET {set_sql} WHERE id = 1", list(raw_updates.values()))
    return admin_get_config(_)


@app.post("/api/admin/test-llm")
async def admin_test_llm_endpoint(
    req: LlmTestRequest,
    _: Dict[str, Any] = Depends(require_super_admin),
) -> Dict[str, Any]:
    key_to_test = req.api_key.strip()
    if not key_to_test:
        with get_db() as conn:
            cfg = row_to_dict(conn.execute("SELECT * FROM platform_config WHERE id = 1").fetchone()) or {}
        col_map = {
            "openrouter": "openrouter_api_key",
            "gemini": "gemini_api_key",
            "openai": "openai_api_key",
            "custom": "custom_llm_api_key",
        }
        key_to_test = str(cfg.get(col_map.get(req.provider, "openrouter_api_key"), "")).strip()
    if not key_to_test:
        raise HTTPException(status_code=400, detail="أدخل مفتاح الـ API أولاً لإجراء اختبار الاتصال الفعلي.")
    return await asyncio.to_thread(test_llm_connection, req.provider, key_to_test, req.base_url, req.model)


# Serve production React build when present
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
if os.path.isdir(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")

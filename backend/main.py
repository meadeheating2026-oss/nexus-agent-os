import asyncio
import json
import os
import secrets
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import get_db, init_db, now_iso, row_to_dict, rows_to_list
from models import (
    AgentCreate,
    AgentUpdate,
    BlueprintGenerateRequest,
    MissionRunRequest,
    SaasClientCreate,
    SettingsUpdate,
    ToolCreate,
    ToolTestRequest,
    to_dict,
)
from orchestrator import generate_agent_blueprint, run_mission_sync
from seed import seed_initial_data
from tool_engine import execute_tool

app = FastAPI(
    title="Nexus AgentOS API",
    description="Infinite Multi-Domain Autonomous AI Agent Operating System & SaaS Engine",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_scheduler_task: Optional[asyncio.Task] = None


async def _autonomous_cron_loop() -> None:
    """
    Background autonomous loop: checks if any cron-enabled agents are due for scheduled runs
    when explicitly armed with an autonomous task note in memory_notes starting with 'AUTO_TASK:'.
    """
    while True:
        await asyncio.sleep(45)
        try:
            with get_db() as conn:
                cron_agents = rows_to_list(
                    conn.execute(
                        "SELECT * FROM agents WHERE trigger_type = 'cron' AND is_system_agent = 0 AND status = 'idle'"
                    ).fetchall()
                )
            for agent in cron_agents:
                mem = agent.get("memory_notes") or ""
                if "AUTO_TASK:" not in mem:
                    continue
                last_run = agent.get("last_run_at") or ""
                should_run = False
                if not last_run:
                    should_run = True
                else:
                    try:
                        last_dt = datetime.strptime(last_run, "%Y-%m-%dT%H:%M:%SZ")
                        elapsed_min = (datetime.utcnow() - last_dt).total_seconds() / 60.0
                        if elapsed_min >= max(1, int(agent.get("cron_interval_minutes", 60))):
                            should_run = True
                    except Exception:
                        should_run = False
                if should_run:
                    auto_goal = mem.split("AUTO_TASK:", 1)[1].splitlines()[0].strip()
                    if auto_goal:
                        await asyncio.to_thread(
                            run_mission_sync,
                            auto_goal,
                            "standalone",
                            "manual",
                            [agent["id"]],
                            f"[جدولة ذاتية] {agent['name']}",
                            None,
                            "cron_auto",
                        )
        except Exception:
            pass


@app.on_event("startup")
async def on_startup() -> None:
    global _scheduler_task
    init_db()
    seed_initial_data()
    _scheduler_task = asyncio.create_task(_autonomous_cron_loop())


@app.on_event("shutdown")
async def on_shutdown() -> None:
    global _scheduler_task
    if _scheduler_task:
        _scheduler_task.cancel()


@app.get("/api/health")
def health_check() -> Dict[str, Any]:
    return {"status": "ok", "system": "Nexus AgentOS", "timestamp": now_iso()}


@app.get("/api/overview")
def get_overview() -> Dict[str, Any]:
    with get_db() as conn:
        agents = rows_to_list(conn.execute("SELECT * FROM agents ORDER BY id DESC").fetchall())
        tools_count = conn.execute("SELECT COUNT(*) FROM tools").fetchone()[0]
        missions = rows_to_list(
            conn.execute("SELECT * FROM missions ORDER BY id DESC LIMIT 8").fetchall()
        )
        clients = rows_to_list(conn.execute("SELECT * FROM saas_clients WHERE status = 'active'").fetchall())
        settings = row_to_dict(conn.execute("SELECT * FROM settings WHERE id = 1").fetchone()) or {}

    worker_agents = [a for a in agents if not a.get("is_system_agent")]
    domains = sorted(list({a["domain"] for a in worker_agents}))
    autonomous_triggers = sum(1 for a in worker_agents if a.get("trigger_type") in ("cron", "webhook"))

    total_agent_revenue = round(sum(float(a.get("total_revenue_usd", 0.0)) for a in worker_agents), 2)
    total_api_cost = round(sum(float(a.get("total_cost_usd", 0.0)) for a in agents), 4)
    saas_mrr = round(sum(float(c.get("monthly_fee_usd", 0.0)) for c in clients), 2)
    combined_gross = round(total_agent_revenue + saas_mrr, 2)
    net_profit = round(combined_gross - total_api_cost, 2)
    total_runs = sum(int(a.get("total_runs", 0)) for a in worker_agents)

    domain_stats: Dict[str, Dict[str, Any]] = {}
    for a in worker_agents:
        dom = a["domain"]
        if dom not in domain_stats:
            domain_stats[dom] = {"domain": dom, "agents_count": 0, "runs": 0, "revenue_usd": 0.0, "cost_usd": 0.0}
        domain_stats[dom]["agents_count"] += 1
        domain_stats[dom]["runs"] += int(a.get("total_runs", 0))
        domain_stats[dom]["revenue_usd"] = round(domain_stats[dom]["revenue_usd"] + float(a.get("total_revenue_usd", 0.0)), 2)
        domain_stats[dom]["cost_usd"] = round(domain_stats[dom]["cost_usd"] + float(a.get("total_cost_usd", 0.0)), 4)

    domain_breakdown = sorted(domain_stats.values(), key=lambda x: x["revenue_usd"], reverse=True)

    return {
        "platform_name": settings.get("saas_platform_name", "Nexus AgentOS"),
        "active_provider": settings.get("active_provider", "simulation"),
        "metrics": {
            "total_agents": len(agents),
            "worker_agents": len(worker_agents),
            "active_domains": len(domains),
            "installed_tools_pool": tools_count,
            "autonomous_triggers": autonomous_triggers,
            "total_runs": total_runs,
            "internal_engine_revenue_usd": total_agent_revenue,
            "saas_mrr_usd": saas_mrr,
            "combined_gross_usd": combined_gross,
            "total_api_cost_usd": total_api_cost,
            "net_profit_usd": net_profit,
            "profit_margin_pct": round((net_profit / combined_gross) * 100, 2) if combined_gross > 0 else 100.0,
            "active_saas_clients": len(clients),
        },
        "domains": domains,
        "domain_breakdown": domain_breakdown,
        "recent_missions": missions,
    }


# ==================== AGENTS CRUD + META SPAWNER + CLONING ====================

@app.get("/api/agents")
def list_agents(
    domain: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    include_system: bool = Query(True),
) -> List[Dict[str, Any]]:
    with get_db() as conn:
        rows = rows_to_list(conn.execute("SELECT * FROM agents ORDER BY is_system_agent ASC, id DESC").fetchall())

    result = []
    for a in rows:
        if not include_system and a.get("is_system_agent"):
            continue
        if domain and domain != "all" and a.get("domain") != domain:
            continue
        if search:
            q = search.lower().strip()
            hay = f"{a['name']} {a['role_title']} {a['domain']} {a['description']}".lower()
            if q not in hay:
                continue
        result.append(a)
    return result


@app.post("/api/agents/generate-blueprint")
async def api_generate_blueprint(req: BlueprintGenerateRequest) -> Dict[str, Any]:
    if not req.idea_prompt.strip():
        raise HTTPException(status_code=400, detail="يرجى كتابة فكرة الوكيل أو مهمته أولاً.")
    return await asyncio.to_thread(generate_agent_blueprint, req.idea_prompt, req.preferred_domain)


@app.post("/api/agents")
def create_agent(payload: AgentCreate) -> Dict[str, Any]:
    if not payload.name.strip() or not payload.domain.strip() or not payload.system_prompt.strip():
        raise HTTPException(status_code=400, detail="الاسم والمجال وتعليمات البرومبت حقول أساسية.")

    ts = now_iso()
    wh_token = "whk_" + secrets.token_hex(8)
    with get_db() as conn:
        cur = conn.execute(
            """
            INSERT INTO agents (
                name, role_title, domain, description, system_prompt, model,
                installed_tools, can_delegate, trigger_type, cron_interval_minutes,
                webhook_token, price_per_run, max_cost_usd, is_system_agent,
                status, memory_notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'idle', ?, ?)
            """,
            (
                payload.name.strip(),
                payload.role_title.strip() or f"خبير {payload.domain.strip()}",
                payload.domain.strip(),
                payload.description.strip() or payload.name.strip(),
                payload.system_prompt.strip(),
                payload.model.strip() or "google/gemini-2.5-flash",
                json.dumps(payload.installed_tools),
                1 if payload.can_delegate else 0,
                payload.trigger_type,
                max(1, payload.cron_interval_minutes),
                wh_token,
                max(0.0, payload.price_per_run),
                max(0.01, payload.max_cost_usd),
                payload.memory_notes.strip(),
                ts,
            ),
        )
        new_row = row_to_dict(conn.execute("SELECT * FROM agents WHERE id = ?", (cur.lastrowid,)).fetchone())
    assert new_row is not None
    return new_row


@app.post("/api/agents/{agent_id}/clone")
def clone_agent(agent_id: int) -> Dict[str, Any]:
    with get_db() as conn:
        orig = row_to_dict(conn.execute("SELECT * FROM agents WHERE id = ?", (agent_id,)).fetchone())
        if not orig:
            raise HTTPException(status_code=404, detail="الوكيل غير موجود.")
        cur = conn.execute(
            """
            INSERT INTO agents (
                name, role_title, domain, description, system_prompt, model,
                installed_tools, can_delegate, trigger_type, cron_interval_minutes,
                webhook_token, price_per_run, max_cost_usd, is_system_agent,
                status, memory_notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'idle', ?, ?)
            """,
            (
                f"{orig['name']} (نسخة)",
                orig["role_title"],
                orig["domain"],
                orig["description"],
                orig["system_prompt"],
                orig["model"],
                json.dumps(orig["installed_tools"]),
                1 if orig["can_delegate"] else 0,
                orig["trigger_type"],
                orig["cron_interval_minutes"],
                "whk_" + secrets.token_hex(8),
                orig["price_per_run"],
                orig["max_cost_usd"],
                "",
                now_iso(),
            ),
        )
        cloned = row_to_dict(conn.execute("SELECT * FROM agents WHERE id = ?", (cur.lastrowid,)).fetchone())
    assert cloned is not None
    return cloned


@app.patch("/api/agents/{agent_id}")
def update_agent(agent_id: int, payload: AgentUpdate) -> Dict[str, Any]:
    updates = {k: v for k, v in to_dict(payload).items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="لا توجد تعديلات مرسلة.")

    if "installed_tools" in updates:
        updates["installed_tools"] = json.dumps(updates["installed_tools"])
    if "can_delegate" in updates:
        updates["can_delegate"] = 1 if updates["can_delegate"] else 0

    set_clause = ", ".join(f"{col} = ?" for col in updates.keys())
    values = list(updates.values()) + [agent_id]

    with get_db() as conn:
        existing = conn.execute("SELECT id FROM agents WHERE id = ?", (agent_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="الوكيل غير موجود.")
        conn.execute(f"UPDATE agents SET {set_clause} WHERE id = ?", values)
        updated = row_to_dict(conn.execute("SELECT * FROM agents WHERE id = ?", (agent_id,)).fetchone())
    assert updated is not None
    return updated


@app.delete("/api/agents/{agent_id}")
def delete_agent(agent_id: int) -> Dict[str, Any]:
    with get_db() as conn:
        row = row_to_dict(conn.execute("SELECT * FROM agents WHERE id = ?", (agent_id,)).fetchone())
        if not row:
            raise HTTPException(status_code=404, detail="الوكيل غير موجود.")
        if row.get("is_system_agent"):
            raise HTTPException(status_code=400, detail="لا يمكن حذف وكلاء الرقابة والنواة الأساسية للنظام.")
        conn.execute("DELETE FROM agents WHERE id = ?", (agent_id,))
    return {"deleted": True, "id": agent_id}


# ==================== PLUGGABLE TOOL REGISTRY ====================

@app.get("/api/tools")
def list_tools() -> List[Dict[str, Any]]:
    with get_db() as conn:
        return rows_to_list(conn.execute("SELECT * FROM tools ORDER BY is_builtin DESC, id ASC").fetchall())


@app.post("/api/tools")
def create_custom_tool(payload: ToolCreate) -> Dict[str, Any]:
    clean_slug = "".join(ch if (ch.isalnum() or ch == "_") else "_" for ch in payload.slug.lower().strip()).strip("_")
    if not clean_slug:
        clean_slug = "custom_tool_" + secrets.token_hex(3)

    with get_db() as conn:
        exists = conn.execute("SELECT id FROM tools WHERE slug = ?", (clean_slug,)).fetchone()
        if exists:
            clean_slug = f"{clean_slug}_{secrets.token_hex(2)}"
        cur = conn.execute(
            """
            INSERT INTO tools (
                slug, name, category, description, execution_type,
                endpoint_url, http_method, headers_json, payload_template, is_builtin, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
            """,
            (
                clean_slug,
                payload.name.strip(),
                payload.category.strip() or "أدوات مخصصة",
                payload.description.strip(),
                payload.execution_type,
                payload.endpoint_url.strip(),
                payload.http_method.upper().strip() or "POST",
                json.dumps(payload.headers_json),
                payload.payload_template,
                now_iso(),
            ),
        )
        created = row_to_dict(conn.execute("SELECT * FROM tools WHERE id = ?", (cur.lastrowid,)).fetchone())
    assert created is not None
    return created


@app.post("/api/tools/{tool_id}/test")
async def test_tool_endpoint(tool_id: int, req: ToolTestRequest) -> Dict[str, Any]:
    with get_db() as conn:
        tool = row_to_dict(conn.execute("SELECT * FROM tools WHERE id = ?", (tool_id,)).fetchone())
    if not tool:
        raise HTTPException(status_code=404, detail="الأداة غير موجودة.")
    dummy_agent = {"name": "مختبر الأدوات", "domain": tool.get("category", "عام"), "memory_notes": ""}
    return await asyncio.to_thread(execute_tool, tool, dummy_agent, req.sample_input, "")


@app.delete("/api/tools/{tool_id}")
def delete_custom_tool(tool_id: int) -> Dict[str, Any]:
    with get_db() as conn:
        tool = row_to_dict(conn.execute("SELECT * FROM tools WHERE id = ?", (tool_id,)).fetchone())
        if not tool:
            raise HTTPException(status_code=404, detail="الأداة غير موجودة.")
        if tool.get("is_builtin"):
            raise HTTPException(status_code=400, detail="الأدوات الأساسية مدمجة في نواة النظام ولا يمكن حذفها.")
        conn.execute("DELETE FROM tools WHERE id = ?", (tool_id,))
    return {"deleted": True, "id": tool_id}


# ==================== MISSIONS & WEBHOOK TRIGGERS ====================

@app.get("/api/missions")
def list_missions() -> List[Dict[str, Any]]:
    with get_db() as conn:
        return rows_to_list(conn.execute("SELECT * FROM missions ORDER BY id DESC LIMIT 30").fetchall())


@app.get("/api/missions/{mission_id}")
def get_mission_detail(mission_id: int) -> Dict[str, Any]:
    with get_db() as conn:
        mission = row_to_dict(conn.execute("SELECT * FROM missions WHERE id = ?", (mission_id,)).fetchone())
        if not mission:
            raise HTTPException(status_code=404, detail="المهمة غير موجودة.")
        steps = rows_to_list(
            conn.execute(
                "SELECT * FROM mission_steps WHERE mission_id = ? ORDER BY step_order ASC",
                (mission_id,),
            ).fetchall()
        )
    mission["steps"] = steps
    return mission


@app.post("/api/missions/run")
async def api_run_mission(req: MissionRunRequest) -> Dict[str, Any]:
    if not req.goal_prompt.strip():
        raise HTTPException(status_code=400, detail="يرجى كتابة الهدف أو المهمة المطلوب تنفيذها.")
    try:
        return await asyncio.to_thread(
            run_mission_sync,
            req.goal_prompt,
            req.mode,
            req.orchestration_strategy,
            req.selected_agent_ids,
            req.title,
            req.estimated_value_usd,
            "manual",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/webhooks/agent/{agent_id}")
async def trigger_agent_webhook(agent_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    """External 24/7 Webhook endpoint allowing Stripe, Shopify, WhatsApp, Zapier, etc. to wake up any agent."""
    with get_db() as conn:
        agent = row_to_dict(conn.execute("SELECT * FROM agents WHERE id = ?", (agent_id,)).fetchone())
    if not agent:
        raise HTTPException(status_code=404, detail="الوكيل غير موجود.")
    incoming_task = str(payload.get("task") or payload.get("message") or json.dumps(payload, ensure_ascii=False))
    result = await asyncio.to_thread(
        run_mission_sync,
        incoming_task,
        "standalone",
        "manual",
        [agent_id],
        f"[Webhook خارجي] {agent['name']}",
        None,
        "webhook_external",
    )
    return {"ok": True, "mission_id": result["id"], "net_profit_usd": result["net_profit_usd"], "output": result["final_output"]}


# ==================== SETTINGS & SAAS CLIENTS ====================

@app.get("/api/settings")
def api_get_settings() -> Dict[str, Any]:
    with get_db() as conn:
        s = row_to_dict(conn.execute("SELECT * FROM settings WHERE id = 1").fetchone()) or {}
    return {
        "active_provider": s.get("active_provider", "simulation"),
        "has_openrouter_key": bool(s.get("openrouter_api_key")),
        "has_openai_key": bool(s.get("openai_api_key")),
        "has_gemini_key": bool(s.get("gemini_api_key")),
        "custom_base_url": s.get("custom_base_url", ""),
        "has_custom_key": bool(s.get("custom_api_key")),
        "default_model": s.get("default_model", "google/gemini-2.5-flash"),
        "cfo_auto_pause": bool(s.get("cfo_auto_pause", True)),
        "qa_gate_enabled": bool(s.get("qa_gate_enabled", True)),
        "saas_platform_name": s.get("saas_platform_name", "Nexus AgentOS"),
        "saas_credit_markup_x": float(s.get("saas_credit_markup_x", 4.0)),
    }


@app.put("/api/settings")
def api_update_settings(payload: SettingsUpdate) -> Dict[str, Any]:
    with get_db() as conn:
        current = row_to_dict(conn.execute("SELECT * FROM settings WHERE id = 1").fetchone()) or {}
        or_key = current.get("openrouter_api_key", "") if payload.openrouter_api_key is None else payload.openrouter_api_key.strip()
        oa_key = current.get("openai_api_key", "") if payload.openai_api_key is None else payload.openai_api_key.strip()
        gm_key = current.get("gemini_api_key", "") if payload.gemini_api_key is None else payload.gemini_api_key.strip()
        cu_key = current.get("custom_api_key", "") if payload.custom_api_key is None else payload.custom_api_key.strip()
        cu_url = current.get("custom_base_url", "") if payload.custom_base_url is None else payload.custom_base_url.strip()

        conn.execute(
            """
            UPDATE settings
            SET active_provider = ?,
                openrouter_api_key = ?,
                openai_api_key = ?,
                gemini_api_key = ?,
                custom_base_url = ?,
                custom_api_key = ?,
                default_model = ?,
                cfo_auto_pause = ?,
                qa_gate_enabled = ?,
                saas_platform_name = ?,
                saas_credit_markup_x = ?
            WHERE id = 1
            """,
            (
                payload.active_provider,
                or_key,
                oa_key,
                gm_key,
                cu_url,
                cu_key,
                payload.default_model,
                1 if payload.cfo_auto_pause else 0,
                1 if payload.qa_gate_enabled else 0,
                payload.saas_platform_name.strip() or "Nexus AgentOS",
                max(1.0, payload.saas_credit_markup_x),
            ),
        )
    return api_get_settings()


@app.get("/api/saas-clients")
def list_saas_clients() -> List[Dict[str, Any]]:
    with get_db() as conn:
        return rows_to_list(conn.execute("SELECT * FROM saas_clients ORDER BY id DESC").fetchall())


@app.post("/api/saas-clients")
def create_saas_client(payload: SaasClientCreate) -> Dict[str, Any]:
    if not payload.client_name.strip():
        raise HTTPException(status_code=400, detail="اسم العميل مطلوب.")
    with get_db() as conn:
        cur = conn.execute(
            """
            INSERT INTO saas_clients (
                client_name, company, plan_name, monthly_fee_usd,
                credits_balance, credits_used, assigned_agent_ids, status, created_at
            ) VALUES (?, ?, ?, ?, ?, 0.0, ?, 'active', ?)
            """,
            (
                payload.client_name.strip(),
                payload.company.strip() or payload.client_name.strip(),
                payload.plan_name.strip(),
                max(0.0, payload.monthly_fee_usd),
                max(0.0, payload.credits_balance),
                json.dumps(payload.assigned_agent_ids),
                now_iso(),
            ),
        )
        created = row_to_dict(conn.execute("SELECT * FROM saas_clients WHERE id = ?", (cur.lastrowid,)).fetchone())
    assert created is not None
    return created


@app.delete("/api/saas-clients/{client_id}")
def delete_saas_client(client_id: int) -> Dict[str, Any]:
    with get_db() as conn:
        conn.execute("DELETE FROM saas_clients WHERE id = ?", (client_id,))
    return {"deleted": True, "id": client_id}


# Serve built frontend in production if dist/ exists
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
if os.path.isdir(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")

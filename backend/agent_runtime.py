import json
import re
import time
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException

from billing import assert_can_run_mission, settle_mission_billing
from database import get_db, now_iso, row_to_dict, rows_to_list
from tools_runtime import (
    build_openai_tools_schema,
    execute_real_tool,
    get_available_tools_for_user,
)


PROVIDER_URLS = {
    "openrouter": "https://openrouter.ai/api/v1/chat/completions",
    "gemini": "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    "openai": "https://api.openai.com/v1/chat/completions",
}


def resolve_llm_endpoint_and_key(
    user_id: int,
    requested_model: str,
) -> Tuple[str, str, str, bool]:
    """
    Returns (endpoint_url, api_key, normalized_model, using_tenant_own_key).
    Raises HTTP 400 with clear instructions if no real API key is configured.
    """
    with get_db() as conn:
        cfg = row_to_dict(conn.execute("SELECT * FROM platform_config WHERE id = 1").fetchone()) or {}
        u_row = conn.execute(
            "SELECT tenant_llm_provider, tenant_llm_api_key FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()

    if cfg.get("allow_tenant_byok") and u_row and u_row["tenant_llm_api_key"]:
        prov = (u_row["tenant_llm_provider"] or "openrouter").strip().lower()
        key = str(u_row["tenant_llm_api_key"]).strip()
        url = PROVIDER_URLS.get(prov, PROVIDER_URLS["openrouter"])
        norm_model = _normalize_model_for_provider(prov, requested_model or cfg.get("default_model", "gemini-2.5-flash"))
        return url, key, norm_model, True

    prov = str(cfg.get("active_llm_provider", "openrouter")).strip().lower()
    key_map = {
        "openrouter": cfg.get("openrouter_api_key", ""),
        "gemini": cfg.get("gemini_api_key", ""),
        "openai": cfg.get("openai_api_key", ""),
        "custom": cfg.get("custom_llm_api_key", ""),
    }
    api_key = str(key_map.get(prov, "")).strip()

    # Fallback check if another provider key was entered by admin
    if not api_key:
        for alt_prov in ("openrouter", "gemini", "openai"):
            alt_key = str(key_map.get(alt_prov, "")).strip()
            if alt_key:
                prov = alt_prov
                api_key = alt_key
                break

    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="لم يتم ربط مفتاح ذكاء اصطناعي فعلي بعد. ادخل إلى إعدادات المحرك وأضف مفتاح Gemini API أو OpenRouter أو OpenAI لتشغيل الوكلاء فعلياً.",
        )

    if prov == "custom":
        base = str(cfg.get("custom_llm_base_url", "")).rstrip("/")
        if not base:
            raise HTTPException(status_code=400, detail="رابط الـ Endpoint المخصص غير مضبوط في إعدادات المنصة.")
        url = base if base.endswith("/chat/completions") else f"{base}/chat/completions"
    else:
        url = PROVIDER_URLS[prov]

    norm_model = _normalize_model_for_provider(prov, requested_model or cfg.get("default_model", "gemini-2.5-flash"))
    return url, api_key, norm_model, False


def _normalize_model_for_provider(provider: str, model: str) -> str:
    m = model.strip()
    if provider == "gemini":
        m = m.split("/")[-1]
        return m if m.startswith("gemini") else "gemini-2.5-flash"
    if provider == "openai":
        m = m.split("/")[-1]
        return m if m.startswith(("gpt-", "o1", "o3")) else "gpt-4o-mini"
    if provider == "openrouter":
        if "/" not in m:
            if m.startswith("gemini"):
                return f"google/{m}"
            if m.startswith("gpt-"):
                return f"openai/{m}"
            if m.startswith("claude"):
                return f"anthropic/{m}"
        return m
    return m


def _raw_chat_completion(
    url: str,
    api_key: str,
    model: str,
    messages: List[Dict[str, Any]],
    tools: Optional[List[Dict[str, Any]]] = None,
    temperature: float = 0.3,
) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }
    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = "auto"

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "https://nexus-agentos.enterprise",
            "X-Title": "Nexus AgentOS Enterprise",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as http_err:
        err_body = http_err.read(2000).decode("utf-8", errors="replace")
        # If a specific model doesn't support native tools parameter, retry once without tools
        if tools and http_err.code in (400, 422):
            payload.pop("tools", None)
            payload.pop("tool_choice", None)
            retry_req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                method="POST",
            )
            with urllib.request.urlopen(retry_req, timeout=45) as resp2:
                return json.loads(resp2.read().decode("utf-8"))
        raise HTTPException(
            status_code=502,
            detail=f"خطأ من مزود الذكاء الاصطناعي (HTTP {http_err.code}): {err_body[:280]}",
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"فشل الاتصال بمزود الـ LLM: {str(exc)[:200]}")


def test_llm_connection(provider: str, api_key: str, base_url: str = "", model: str = "") -> Dict[str, Any]:
    prov = provider.strip().lower()
    if prov == "custom":
        b = base_url.rstrip("/")
        url = b if b.endswith("/chat/completions") else f"{b}/chat/completions"
        norm_model = model or "gpt-4o-mini"
    else:
        url = PROVIDER_URLS.get(prov, PROVIDER_URLS["openrouter"])
        norm_model = _normalize_model_for_provider(prov, model or "gemini-2.5-flash")

    t0 = time.time()
    resp = _raw_chat_completion(
        url=url,
        api_key=api_key.strip(),
        model=norm_model,
        messages=[{"role": "user", "content": "أجب بكلمة واحدة فقط: متصل"}],
        tools=None,
        temperature=0.0,
    )
    latency_ms = int((time.time() - t0) * 1000)
    reply = resp["choices"][0]["message"].get("content", "")
    return {
        "ok": True,
        "provider": prov,
        "model": norm_model,
        "latency_ms": latency_ms,
        "sample_reply": reply[:100],
    }


def execute_enterprise_mission(
    user: Dict[str, Any],
    goal_prompt: str,
    execution_mode: str = "standalone",
    agent_ids: Optional[List[int]] = None,
    title: str = "",
) -> Dict[str, Any]:
    agent_ids = agent_ids or []
    url, api_key, _, using_own_key = resolve_llm_endpoint_and_key(user["id"], "")
    assert_can_run_mission(user, execution_mode, using_own_key)

    with get_db() as conn:
        accessible_rows = conn.execute(
            "SELECT * FROM agents WHERE (user_id = ? OR is_marketplace_public = 1) AND status = 'active' ORDER BY id ASC",
            (user["id"],),
        ).fetchall()
        all_agents = rows_to_list(accessible_rows)

    if not all_agents:
        raise HTTPException(status_code=400, detail="لا يوجد وكلاء نشطون في حسابك بعد. أنشئ وكيلاً أو ثبت وكيلاً من المتجر أولاً.")

    agents_by_id = {a["id"]: a for a in all_agents}
    user_tools = get_available_tools_for_user(user["id"])
    tools_by_slug = {t["slug"]: t for t in user_tools}

    # Resolve participating agents
    selected_agents: List[Dict[str, Any]] = [agents_by_id[aid] for aid in agent_ids if aid in agents_by_id]
    if execution_mode == "standalone" and not selected_agents:
        selected_agents = [all_agents[0]]
    elif execution_mode == "swarm_sequential" and len(selected_agents) < 1:
        selected_agents = all_agents[:2]

    mission_title = title.strip() or goal_prompt.strip()[:80]
    with get_db() as conn:
        cur = conn.execute(
            """
            INSERT INTO missions (
                user_id, title, goal_prompt, execution_mode, agent_ids_json, status, created_at
            ) VALUES (?, ?, ?, ?, ?, 'running', ?)
            """,
            (
                user["id"],
                mission_title,
                goal_prompt,
                execution_mode,
                json.dumps([a["id"] for a in selected_agents]),
                now_iso(),
            ),
        )
        mission_id = int(cur.lastrowid)

    step_order = 0
    total_prompt_tokens = 0
    total_completion_tokens = 0

    def log_step(
        agent_id: Optional[int],
        agent_name: str,
        step_kind: str,
        tool_name: str,
        input_payload: str,
        output_payload: str,
        tokens_used: int = 0,
        duration_ms: int = 0,
    ) -> None:
        nonlocal step_order
        step_order += 1
        with get_db() as c:
            c.execute(
                """
                INSERT INTO mission_steps (
                    mission_id, step_order, agent_id, agent_name, step_kind,
                    tool_name, input_payload, output_payload, tokens_used, duration_ms, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    mission_id,
                    step_order,
                    agent_id,
                    agent_name,
                    step_kind,
                    tool_name,
                    input_payload[:3000],
                    output_payload[:6000],
                    tokens_used,
                    duration_ms,
                    now_iso(),
                ),
            )

    def run_single_agent_react(
        agent: Dict[str, Any],
        task_text: str,
        shared_context: str,
        depth: int = 0,
    ) -> str:
        nonlocal total_prompt_tokens, total_completion_tokens

        _, _, norm_model, _ = resolve_llm_endpoint_and_key(user["id"], agent["model"])

        # Fetch agent's stored memories
        with get_db() as c:
            mem_rows = c.execute(
                "SELECT mem_key, mem_value FROM agent_memories WHERE agent_id = ? AND user_id = ? LIMIT 15",
                (agent["id"], user["id"]),
            ).fetchall()
        mem_context = ""
        if mem_rows:
            mem_context = "\n\nالذاكرة الدائمة المحفوظة لهذا الوكيل:\n" + "\n".join(
                f"- {r['mem_key']}: {r['mem_value']}" for r in mem_rows
            )

        colleagues = [
            p for p in all_agents
            if p["id"] != agent["id"] and p["user_id"] == user["id"]
        ]
        openai_tools = build_openai_tools_schema(
            agent.get("installed_tools", []),
            tools_by_slug,
            colleagues,
            bool(agent.get("can_delegate")) and depth < 1,
        )

        sys_content = (
            f"أنت الوكيل الذكي: {agent['name']} ({agent['role_title']}) في قطاع ({agent['domain']}).\n"
            f"التعليمات الأساسية لمهمتك:\n{agent['system_prompt']}{mem_context}"
        )
        usr_content = task_text
        if shared_context.strip():
            usr_content += f"\n\n---\nمخرجات الوكلاء السابقين المتكاملين معك في نفس المهمة:\n{shared_context[-4000:]}"

        messages: List[Dict[str, Any]] = [
            {"role": "system", "content": sys_content},
            {"role": "user", "content": usr_content},
        ]

        max_iters = max(1, min(8, int(agent.get("max_iterations", 5))))
        final_text = ""

        for _ in range(max_iters):
            t_start = time.time()
            resp = _raw_chat_completion(
                url=url,
                api_key=api_key,
                model=norm_model,
                messages=messages,
                tools=openai_tools if openai_tools else None,
                temperature=float(agent.get("temperature", 0.3)),
            )
            dur_ms = int((time.time() - t_start) * 1000)

            usage = resp.get("usage") or {}
            p_tok = int(usage.get("prompt_tokens") or 0)
            c_tok = int(usage.get("completion_tokens") or 0)
            turn_tokens = p_tok + c_tok
            total_prompt_tokens += p_tok
            total_completion_tokens += c_tok

            msg = resp["choices"][0]["message"]
            tool_calls = msg.get("tool_calls") or []

            if not tool_calls:
                final_text = msg.get("content") or ""
                log_step(
                    agent["id"],
                    agent["name"],
                    "agent_output",
                    norm_model,
                    task_text[:500],
                    final_text,
                    tokens_used=turn_tokens,
                    duration_ms=dur_ms,
                )
                break

            messages.append(msg)

            for tc in tool_calls:
                fn_name = tc.get("function", {}).get("name", "")
                raw_args = tc.get("function", {}).get("arguments", "{}")
                try:
                    parsed_args = json.loads(raw_args) if isinstance(raw_args, str) else raw_args
                except Exception:
                    parsed_args = {}

                t_tool_start = time.time()
                if fn_name == "delegate_to_colleague" and depth < 1:
                    col_id = int(parsed_args.get("colleague_agent_id", 0))
                    sub_t = str(parsed_args.get("sub_task", task_text))
                    colleague = agents_by_id.get(col_id)
                    if colleague:
                        log_step(
                            agent["id"],
                            agent["name"],
                            "delegation",
                            "delegate_to_colleague",
                            f"تفويض إلى [{colleague['name']}]: {sub_t}",
                            "بدء تنفيذ الوكيل الزميل...",
                        )
                        tool_result_str = run_single_agent_react(colleague, sub_t, shared_context, depth=depth + 1)
                    else:
                        tool_result_str = json.dumps({"error": "Colleague agent ID not found"}, ensure_ascii=False)
                elif fn_name in tools_by_slug:
                    tool_result_str = execute_real_tool(
                        tools_by_slug[fn_name],
                        parsed_args,
                        agent["id"],
                        user["id"],
                    )
                    log_step(
                        agent["id"],
                        agent["name"],
                        "tool_call",
                        fn_name,
                        json.dumps(parsed_args, ensure_ascii=False),
                        tool_result_str,
                        tokens_used=turn_tokens,
                        duration_ms=int((time.time() - t_tool_start) * 1000),
                    )
                else:
                    tool_result_str = json.dumps({"error": f"Unknown tool {fn_name}"}, ensure_ascii=False)

                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.get("id", f"call_{step_order}"),
                        "name": fn_name,
                        "content": tool_result_str,
                    }
                )
        else:
            # Final wrap-up call if max_iterations reached after tool calls
            resp_last = _raw_chat_completion(
                url=url,
                api_key=api_key,
                model=norm_model,
                messages=messages,
                tools=None,
                temperature=0.3,
            )
            final_text = resp_last["choices"][0]["message"].get("content") or ""
            usage = resp_last.get("usage") or {}
            total_prompt_tokens += int(usage.get("prompt_tokens") or 0)
            total_completion_tokens += int(usage.get("completion_tokens") or 0)
            log_step(agent["id"], agent["name"], "agent_output", norm_model, "تجميع النتيجة النهائية", final_text)

        # Update agent run stats
        with get_db() as c:
            c.execute(
                "UPDATE agents SET total_runs = total_runs + 1, total_tokens = total_tokens + ?, last_run_at = ? WHERE id = ?",
                (total_prompt_tokens + total_completion_tokens, now_iso(), agent["id"]),
            )
        return final_text

    try:
        # Orchestrated Swarm Mode: LLM dynamically selects the optimal agents & sub-tasks!
        if execution_mode == "swarm_orchestrated":
            _, _, orch_model, _ = resolve_llm_endpoint_and_key(user["id"], "")
            roster_text = "\n".join(
                f"- ID={a['id']} | الاسم: {a['name']} | المجال: {a['domain']} | الوصف: {a['description']}"
                for a in all_agents
            )
            orch_prompt = (
                f"أنت المنسق الرئيسي لنظام الوكلاء. لديك قائمة الوكلاء المتاحين:\n{roster_text}\n\n"
                f"الهدف المطلوب من العميل:\n{goal_prompt}\n\n"
                f"اختر من 1 إلى 4 وكلاء مناسبين بالترتيب وحدد لكل وكيل مهمته الفرعية الدقيقة. "
                f"أعد النتيجة بصيغة JSON فقط بهذا الشكل:\n"
                f'{{"plan": [{{"agent_id": 1, "sub_task": "..."}}]}}'
            )
            t0 = time.time()
            orch_resp = _raw_chat_completion(
                url=url,
                api_key=api_key,
                model=orch_model,
                messages=[{"role": "user", "content": orch_prompt}],
                tools=None,
                temperature=0.2,
            )
            orch_dur = int((time.time() - t0) * 1000)
            orch_usage = orch_resp.get("usage") or {}
            total_prompt_tokens += int(orch_usage.get("prompt_tokens") or 0)
            total_completion_tokens += int(orch_usage.get("completion_tokens") or 0)
            orch_raw = orch_resp["choices"][0]["message"].get("content") or ""

            planned_items: List[Tuple[Dict[str, Any], str]] = []
            match = re.search(r"\{.*\}", orch_raw, re.DOTALL)
            if match:
                try:
                    parsed_plan = json.loads(match.group(0)).get("plan", [])
                    for item in parsed_plan[:4]:
                        ag_obj = agents_by_id.get(int(item.get("agent_id", 0)))
                        if ag_obj:
                            planned_items.append((ag_obj, str(item.get("sub_task") or goal_prompt)))
                except Exception:
                    pass
            if not planned_items:
                planned_items = [(a, goal_prompt) for a in all_agents[:2]]

            selected_agents = [p[0] for p in planned_items]
            log_step(
                None,
                "المنسق الذكي (AI Orchestrator)",
                "thought",
                orch_model,
                goal_prompt,
                "تم تحليل السجل وتوزيع المهام على: " + " ⟵ ".join(a["name"] for a in selected_agents),
                tokens_used=int(orch_usage.get("total_tokens") or 0),
                duration_ms=orch_dur,
            )

            accumulated_outputs: List[str] = []
            for ag_obj, sub_task in planned_items:
                out = run_single_agent_react(ag_obj, sub_task, "\n\n".join(accumulated_outputs))
                accumulated_outputs.append(f"## [{ag_obj['name']} — {ag_obj['domain']}]\n{out}")

            final_compiled = "\n\n---\n\n".join(accumulated_outputs)

        elif execution_mode == "swarm_sequential":
            accumulated_outputs = []
            for idx, ag_obj in enumerate(selected_agents):
                step_prompt = (
                    f"الهدف الكلي للمهمة: {goal_prompt}\n"
                    f"أنت المرحلة ({idx + 1}) من ({len(selected_agents)}). أنجز الشق الخاص بتخصصك ({ag_obj['domain']}) وابنِ على المخرجات السابقة."
                )
                out = run_single_agent_react(ag_obj, step_prompt, "\n\n".join(accumulated_outputs))
                accumulated_outputs.append(f"## [{ag_obj['name']} — {ag_obj['domain']}]\n{out}")
            final_compiled = "\n\n---\n\n".join(accumulated_outputs)

        else:
            # Standalone single agent (can still delegate natively via tool calling!)
            final_compiled = run_single_agent_react(selected_agents[0], goal_prompt, "")

        # Settle Token Billing & Wallet Deduction
        total_toks = max(total_prompt_tokens + total_completion_tokens, len(goal_prompt + final_compiled) // 3)
        primary_model = selected_agents[0]["model"] if selected_agents else "gemini-2.5-flash"
        billing_summary = settle_mission_billing(
            user=user,
            model_name=primary_model,
            total_tokens=total_toks,
            using_tenant_own_key=using_own_key,
            mission_title=mission_title,
        )

        log_step(
            None,
            "محرك المحاسبة والرصيد (Billing Ledger)",
            "billing",
            "wallet_meter",
            f"إجمالي التوكنز الفعلية: {total_toks}",
            (
                f"التكلفة الفعلية للـ API: ${billing_summary['actual_api_cost_usd']:.6f} | "
                f"النقاط المخصومة من المحفظة: {billing_summary['credits_charged']:.2f} نقطة"
            ),
            tokens_used=0,
            duration_ms=2,
        )

        with get_db() as conn:
            conn.execute(
                """
                UPDATE missions
                SET agent_ids_json = ?,
                    status = 'completed',
                    final_output = ?,
                    prompt_tokens = ?,
                    completion_tokens = ?,
                    actual_api_cost_usd = ?,
                    credits_charged = ?,
                    completed_at = ?
                WHERE id = ?
                """,
                (
                    json.dumps([a["id"] for a in selected_agents]),
                    final_compiled,
                    total_prompt_tokens,
                    total_completion_tokens,
                    billing_summary["actual_api_cost_usd"],
                    billing_summary["credits_charged"],
                    now_iso(),
                    mission_id,
                ),
            )
            m_row = row_to_dict(conn.execute("SELECT * FROM missions WHERE id = ?", (mission_id,)).fetchone())
            s_rows = rows_to_list(
                conn.execute("SELECT * FROM mission_steps WHERE mission_id = ? ORDER BY step_order ASC", (mission_id,)).fetchall()
            )
        assert m_row is not None
        m_row["steps"] = s_rows
        return m_row

    except HTTPException as http_exc:
        with get_db() as conn:
            conn.execute(
                "UPDATE missions SET status = 'failed', error_message = ?, completed_at = ? WHERE id = ?",
                (str(http_exc.detail), now_iso(), mission_id),
            )
        raise
    except Exception as exc:
        with get_db() as conn:
            conn.execute(
                "UPDATE missions SET status = 'failed', error_message = ?, completed_at = ? WHERE id = ?",
                (str(exc)[:400], now_iso(), mission_id),
            )
        raise HTTPException(status_code=500, detail=f"حدث خطأ أثناء تنفيذ المهمة: {str(exc)[:200]}")

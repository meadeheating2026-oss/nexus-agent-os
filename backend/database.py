import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from typing import Any, Dict, List, Optional

DB_PATH = os.environ.get(
    "NEXUS_DB_PATH",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "nexus_enterprise.db"),
)


def now_iso() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


JSON_FIELDS = {
    "installed_tools",
    "parameters_schema_json",
    "headers_json",
    "agent_ids_json",
    "chunks_json",
    "nodes_json",
    "edges_json",
    "config_json",
    "steps_json",
    "artifacts_json",
}

BOOL_FIELDS = {
    "is_active",
    "allow_swarm",
    "allow_custom_tools",
    "allow_api_access",
    "allow_autonomous_cron",
    "is_marketplace_public",
    "can_delegate",
    "allow_tenant_byok",
    "use_kb",
}


def row_to_dict(row: Optional[sqlite3.Row]) -> Optional[Dict[str, Any]]:
    if row is None:
        return None
    d = dict(row)
    for jf in JSON_FIELDS:
        if jf in d and isinstance(d[jf], str):
            try:
                d[jf] = json.loads(d[jf])
            except Exception:
                d[jf] = {} if jf.endswith("schema_json") or jf == "headers_json" else []
    for bf in BOOL_FIELDS:
        if bf in d and d[bf] is not None:
            d[bf] = bool(d[bf])
    return d


def rows_to_list(rows: List[sqlite3.Row]) -> List[Dict[str, Any]]:
    return [row_to_dict(r) for r in rows if r is not None]


def init_enterprise_db() -> None:
    with get_db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS platform_config (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                platform_name TEXT NOT NULL DEFAULT 'Nexus AgentOS Enterprise',
                jwt_secret TEXT NOT NULL,
                active_llm_provider TEXT NOT NULL DEFAULT 'gemini',
                openrouter_api_key TEXT NOT NULL DEFAULT '',
                gemini_api_key TEXT NOT NULL DEFAULT '',
                openai_api_key TEXT NOT NULL DEFAULT '',
                custom_llm_base_url TEXT NOT NULL DEFAULT '',
                custom_llm_api_key TEXT NOT NULL DEFAULT '',
                default_model TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
                usd_to_credits_rate REAL NOT NULL DEFAULT 1000.0,
                markup_multiplier REAL NOT NULL DEFAULT 4.0,
                allow_tenant_byok INTEGER NOT NULL DEFAULT 1,
                stripe_secret_key TEXT NOT NULL DEFAULT '',
                stripe_publishable_key TEXT NOT NULL DEFAULT '',
                stripe_webhook_secret TEXT NOT NULL DEFAULT '',
                manual_payment_instructions TEXT NOT NULL DEFAULT 'التحويل عبر InstaPay أو فودافون كاش أو التحويل البنكي ثم إرفاق رقم المرجع للتفعيل الفوري.'
            );

            CREATE TABLE IF NOT EXISTS subscription_plans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                name_ar TEXT NOT NULL,
                description_ar TEXT NOT NULL,
                monthly_price_usd REAL NOT NULL,
                included_credits REAL NOT NULL,
                max_agents INTEGER NOT NULL DEFAULT 5,
                allow_swarm INTEGER NOT NULL DEFAULT 0,
                allow_custom_tools INTEGER NOT NULL DEFAULT 0,
                allow_api_access INTEGER NOT NULL DEFAULT 0,
                allow_autonomous_cron INTEGER NOT NULL DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                full_name TEXT NOT NULL,
                company_name TEXT NOT NULL DEFAULT '',
                password_hash TEXT NOT NULL,
                password_salt TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'subscriber',
                is_active INTEGER NOT NULL DEFAULT 1,
                credits_balance REAL NOT NULL DEFAULT 0.0,
                total_spent_credits REAL NOT NULL DEFAULT 0.0,
                tenant_llm_provider TEXT NOT NULL DEFAULT '',
                tenant_llm_api_key TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                last_login_at TEXT DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                plan_id INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                current_period_start TEXT NOT NULL,
                current_period_end TEXT NOT NULL,
                external_ref TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
            );

            CREATE TABLE IF NOT EXISTS invoices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_number TEXT UNIQUE NOT NULL,
                user_id INTEGER NOT NULL,
                plan_id INTEGER,
                amount_usd REAL NOT NULL,
                credits_to_grant REAL NOT NULL,
                payment_method TEXT NOT NULL,
                payment_reference TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL,
                paid_at TEXT DEFAULT '',
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
            );

            CREATE TABLE IF NOT EXISTS vouchers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                plan_id INTEGER,
                bonus_credits REAL NOT NULL DEFAULT 0.0,
                max_uses INTEGER NOT NULL DEFAULT 1,
                used_count INTEGER NOT NULL DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
            );

            CREATE TABLE IF NOT EXISTS wallet_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                tx_type TEXT NOT NULL,
                credits_delta REAL NOT NULL,
                balance_after REAL NOT NULL,
                actual_api_cost_usd REAL NOT NULL DEFAULT 0.0,
                platform_profit_usd REAL NOT NULL DEFAULT 0.0,
                reference_note TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS tools (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                slug TEXT NOT NULL,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT NOT NULL,
                parameters_schema_json TEXT NOT NULL DEFAULT '{}',
                execution_type TEXT NOT NULL DEFAULT 'builtin',
                endpoint_url TEXT NOT NULL DEFAULT '',
                http_method TEXT NOT NULL DEFAULT 'POST',
                headers_json TEXT NOT NULL DEFAULT '{}',
                body_template TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS agents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                is_marketplace_public INTEGER NOT NULL DEFAULT 0,
                marketplace_credit_fee REAL NOT NULL DEFAULT 0.0,
                name TEXT NOT NULL,
                role_title TEXT NOT NULL,
                domain TEXT NOT NULL,
                description TEXT NOT NULL,
                system_prompt TEXT NOT NULL,
                model TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
                temperature REAL NOT NULL DEFAULT 0.3,
                installed_tools TEXT NOT NULL DEFAULT '[]',
                can_delegate INTEGER NOT NULL DEFAULT 1,
                max_iterations INTEGER NOT NULL DEFAULT 5,
                trigger_type TEXT NOT NULL DEFAULT 'manual',
                cron_interval_minutes INTEGER NOT NULL DEFAULT 60,
                webhook_secret TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'active',
                total_runs INTEGER NOT NULL DEFAULT 0,
                total_tokens INTEGER NOT NULL DEFAULT 0,
                last_run_at TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS agent_memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                mem_key TEXT NOT NULL,
                mem_value TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(agent_id, mem_key),
                FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS missions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                goal_prompt TEXT NOT NULL,
                execution_mode TEXT NOT NULL DEFAULT 'standalone',
                agent_ids_json TEXT NOT NULL DEFAULT '[]',
                status TEXT NOT NULL DEFAULT 'running',
                final_output TEXT NOT NULL DEFAULT '',
                prompt_tokens INTEGER NOT NULL DEFAULT 0,
                completion_tokens INTEGER NOT NULL DEFAULT 0,
                actual_api_cost_usd REAL NOT NULL DEFAULT 0.0,
                credits_charged REAL NOT NULL DEFAULT 0.0,
                error_message TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                completed_at TEXT DEFAULT '',
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS mission_steps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mission_id INTEGER NOT NULL,
                step_order INTEGER NOT NULL,
                agent_id INTEGER,
                agent_name TEXT NOT NULL,
                step_kind TEXT NOT NULL,
                tool_name TEXT NOT NULL DEFAULT '',
                input_payload TEXT NOT NULL DEFAULT '',
                output_payload TEXT NOT NULL DEFAULT '',
                tokens_used INTEGER NOT NULL DEFAULT 0,
                duration_ms INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS customer_api_keys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                label TEXT NOT NULL,
                key_prefix TEXT NOT NULL,
                key_hash TEXT UNIQUE NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1,
                last_used_at TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_agents_user ON agents(user_id);
            CREATE INDEX IF NOT EXISTS idx_missions_user ON missions(user_id);
            CREATE INDEX IF NOT EXISTS idx_tx_user ON wallet_transactions(user_id);
            CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id);

            CREATE TABLE IF NOT EXISTS knowledge_documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'سياسات الشركة',
                source_type TEXT NOT NULL DEFAULT 'text',
                source_url TEXT NOT NULL DEFAULT '',
                content TEXT NOT NULL DEFAULT '',
                word_count INTEGER NOT NULL DEFAULT 0,
                chunks_json TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS chat_threads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                mode TEXT NOT NULL DEFAULT 'single',
                agent_ids_json TEXT NOT NULL DEFAULT '[]',
                use_kb INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                thread_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                role TEXT NOT NULL,
                sender_name TEXT NOT NULL DEFAULT '',
                content TEXT NOT NULL,
                steps_json TEXT NOT NULL DEFAULT '[]',
                artifacts_json TEXT NOT NULL DEFAULT '[]',
                tokens_used INTEGER NOT NULL DEFAULT 0,
                credits_charged REAL NOT NULL DEFAULT 0.0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS workflows (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                category TEXT NOT NULL DEFAULT 'أتمتة الأعمال',
                nodes_json TEXT NOT NULL DEFAULT '[]',
                edges_json TEXT NOT NULL DEFAULT '[]',
                total_runs INTEGER NOT NULL DEFAULT 0,
                last_run_at TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS automations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                agent_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                cron_expression TEXT NOT NULL DEFAULT '0 9 * * *',
                schedule_label TEXT NOT NULL DEFAULT 'يومياً 9:00 صباحاً',
                goal_prompt TEXT NOT NULL,
                channel_target TEXT NOT NULL DEFAULT '',
                is_active INTEGER NOT NULL DEFAULT 1,
                total_runs INTEGER NOT NULL DEFAULT 0,
                last_run_at TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS connectors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                platform TEXT NOT NULL,
                name TEXT NOT NULL,
                endpoint_or_token TEXT NOT NULL,
                target_channel TEXT NOT NULL DEFAULT '',
                config_json TEXT NOT NULL DEFAULT '{}',
                is_active INTEGER NOT NULL DEFAULT 1,
                last_tested_at TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_kb_user ON knowledge_documents(user_id);
            CREATE INDEX IF NOT EXISTS idx_threads_user ON chat_threads(user_id);
            CREATE INDEX IF NOT EXISTS idx_wf_user ON workflows(user_id);
            """
        )

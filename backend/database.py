import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from typing import Any, Dict, List, Optional

DB_PATH = os.environ.get(
    "NEXUS_DB_PATH",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "nexus_os.db"),
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


def row_to_dict(row: Optional[sqlite3.Row]) -> Optional[Dict[str, Any]]:
    if row is None:
        return None
    d = dict(row)
    for json_field in ("installed_tools", "selected_agent_ids", "assigned_agent_ids", "headers_json"):
        if json_field in d and isinstance(d[json_field], str):
            try:
                d[json_field] = json.loads(d[json_field])
            except Exception:
                d[json_field] = [] if json_field != "headers_json" else {}
    for bool_field in (
        "can_delegate",
        "is_system_agent",
        "is_builtin",
        "cfo_auto_pause",
        "qa_gate_enabled",
    ):
        if bool_field in d and d[bool_field] is not None:
            d[bool_field] = bool(d[bool_field])
    return d


def rows_to_list(rows: List[sqlite3.Row]) -> List[Dict[str, Any]]:
    return [row_to_dict(r) for r in rows if r is not None]


def init_db() -> None:
    with get_db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS tools (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                slug TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT NOT NULL,
                execution_type TEXT NOT NULL DEFAULT 'builtin',
                endpoint_url TEXT DEFAULT '',
                http_method TEXT DEFAULT 'POST',
                headers_json TEXT DEFAULT '{}',
                payload_template TEXT DEFAULT '',
                is_builtin INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS agents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                role_title TEXT NOT NULL,
                domain TEXT NOT NULL,
                description TEXT NOT NULL,
                system_prompt TEXT NOT NULL,
                model TEXT NOT NULL DEFAULT 'openrouter/auto',
                installed_tools TEXT NOT NULL DEFAULT '[]',
                can_delegate INTEGER NOT NULL DEFAULT 1,
                trigger_type TEXT NOT NULL DEFAULT 'manual',
                cron_interval_minutes INTEGER NOT NULL DEFAULT 60,
                webhook_token TEXT NOT NULL DEFAULT '',
                price_per_run REAL NOT NULL DEFAULT 15.0,
                max_cost_usd REAL NOT NULL DEFAULT 0.50,
                is_system_agent INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'idle',
                total_runs INTEGER NOT NULL DEFAULT 0,
                total_cost_usd REAL NOT NULL DEFAULT 0.0,
                total_revenue_usd REAL NOT NULL DEFAULT 0.0,
                memory_notes TEXT NOT NULL DEFAULT '',
                last_run_at TEXT DEFAULT '',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS missions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                goal_prompt TEXT NOT NULL,
                mode TEXT NOT NULL DEFAULT 'standalone',
                orchestration_strategy TEXT NOT NULL DEFAULT 'auto',
                selected_agent_ids TEXT NOT NULL DEFAULT '[]',
                trigger_source TEXT NOT NULL DEFAULT 'manual',
                status TEXT NOT NULL DEFAULT 'running',
                final_output TEXT NOT NULL DEFAULT '',
                total_cost_usd REAL NOT NULL DEFAULT 0.0,
                estimated_value_usd REAL NOT NULL DEFAULT 0.0,
                net_profit_usd REAL NOT NULL DEFAULT 0.0,
                tokens_used INTEGER NOT NULL DEFAULT 0,
                qa_score INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                completed_at TEXT DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS mission_steps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mission_id INTEGER NOT NULL,
                step_order INTEGER NOT NULL,
                agent_id INTEGER,
                agent_name TEXT NOT NULL,
                agent_domain TEXT NOT NULL,
                step_type TEXT NOT NULL,
                summary TEXT NOT NULL,
                detail_output TEXT NOT NULL,
                tool_used TEXT DEFAULT '',
                cost_usd REAL NOT NULL DEFAULT 0.0,
                tokens INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                active_provider TEXT NOT NULL DEFAULT 'simulation',
                openrouter_api_key TEXT NOT NULL DEFAULT '',
                openai_api_key TEXT NOT NULL DEFAULT '',
                gemini_api_key TEXT NOT NULL DEFAULT '',
                custom_base_url TEXT NOT NULL DEFAULT '',
                custom_api_key TEXT NOT NULL DEFAULT '',
                default_model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
                cfo_auto_pause INTEGER NOT NULL DEFAULT 1,
                qa_gate_enabled INTEGER NOT NULL DEFAULT 1,
                saas_platform_name TEXT NOT NULL DEFAULT 'Nexus AgentOS',
                saas_credit_markup_x REAL NOT NULL DEFAULT 4.0
            );

            CREATE TABLE IF NOT EXISTS saas_clients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_name TEXT NOT NULL,
                company TEXT NOT NULL,
                plan_name TEXT NOT NULL,
                monthly_fee_usd REAL NOT NULL DEFAULT 199.0,
                credits_balance REAL NOT NULL DEFAULT 500.0,
                credits_used REAL NOT NULL DEFAULT 0.0,
                assigned_agent_ids TEXT NOT NULL DEFAULT '[]',
                status TEXT NOT NULL DEFAULT 'active',
                created_at TEXT NOT NULL
            );
            """
        )
        cur = conn.execute("SELECT id FROM settings WHERE id = 1")
        if cur.fetchone() is None:
            conn.execute(
                """
                INSERT INTO settings (
                    id, active_provider, default_model, cfo_auto_pause,
                    qa_gate_enabled, saas_platform_name, saas_credit_markup_x
                ) VALUES (1, 'simulation', 'google/gemini-2.5-flash', 1, 1, 'Nexus AgentOS', 4.0)
                """
            )

import ast
import json
import math
import operator
import re
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from typing import Any, Dict, List

from database import get_db, now_iso, rows_to_list


class _WebpageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.title = ""
        self.meta_desc = ""
        self.headings: List[str] = []
        self.links: List[str] = []
        self._in_title = False
        self._in_heading = False
        self._skip_depth = 0
        self._text_parts: List[str] = []

    def handle_starttag(self, tag: str, attrs: Any) -> None:
        t = tag.lower()
        attr_dict = {k.lower(): (v or "") for k, v in attrs}
        if t in ("script", "style", "noscript", "svg"):
            self._skip_depth += 1
        elif t == "title":
            self._in_title = True
        elif t in ("h1", "h2", "h3"):
            self._in_heading = True
        elif t == "meta" and attr_dict.get("name", "").lower() == "description":
            self.meta_desc = attr_dict.get("content", "")[:300]
        elif t == "a" and attr_dict.get("href", "").startswith("http") and len(self.links) < 15:
            self.links.append(attr_dict["href"])

    def handle_endtag(self, tag: str) -> None:
        t = tag.lower()
        if t in ("script", "style", "noscript", "svg") and self._skip_depth > 0:
            self._skip_depth -= 1
        elif t == "title":
            self._in_title = False
        elif t in ("h1", "h2", "h3"):
            self._in_heading = False

    def handle_data(self, data: str) -> None:
        cleaned = data.strip()
        if not cleaned or self._skip_depth > 0:
            return
        if self._in_title and not self.title:
            self.title = cleaned[:200]
        if self._in_heading and len(self.headings) < 20:
            self.headings.append(cleaned[:140])
        self._text_parts.append(cleaned)

    def body_excerpt(self, max_chars: int = 3500) -> str:
        return " ".join(self._text_parts)[:max_chars]


_SAFE_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}

_SAFE_FUNCS = {
    "round": round,
    "abs": abs,
    "min": min,
    "max": max,
    "sum": sum,
    "len": len,
    "sqrt": math.sqrt,
    "ceil": math.ceil,
    "floor": math.floor,
}


def _eval_safe_ast(node: ast.AST) -> Any:
    if isinstance(node, ast.Expression):
        return _eval_safe_ast(node.body)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    if isinstance(node, ast.Num):  # Python 3.7 fallback
        return node.n
    if isinstance(node, (ast.List, ast.Tuple)):
        return [_eval_safe_ast(elt) for elt in node.elts]
    if isinstance(node, ast.BinOp) and type(node.op) in _SAFE_OPS:
        left = _eval_safe_ast(node.left)
        right = _eval_safe_ast(node.right)
        if isinstance(node.op, ast.Pow) and abs(right) > 100:
            raise ValueError("Exponent too large")
        return _SAFE_OPS[type(node.op)](left, right)
    if isinstance(node, ast.UnaryOp) and type(node.op) in _SAFE_OPS:
        return _SAFE_OPS[type(node.op)](_eval_safe_ast(node.operand))
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
        fn = _SAFE_FUNCS.get(node.func.id)
        if not fn:
            raise ValueError(f"Function '{node.func.id}' is not permitted")
        args = [_eval_safe_ast(a) for a in node.args]
        return fn(*args)
    raise ValueError(f"Unsupported expression syntax: {type(node).__name__}")


def get_available_tools_for_user(user_id: int) -> List[Dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM tools WHERE user_id IS NULL OR user_id = ? ORDER BY user_id IS NOT NULL ASC, id ASC",
            (user_id,),
        ).fetchall()
        return rows_to_list(rows)


def build_openai_tools_schema(
    installed_slugs: List[str],
    tools_catalog: Dict[str, Dict[str, Any]],
    colleague_agents: List[Dict[str, Any]],
    can_delegate: bool,
) -> List[Dict[str, Any]]:
    openai_tools: List[Dict[str, Any]] = []
    for slug in installed_slugs:
        t = tools_catalog.get(slug)
        if not t:
            continue
        params = t.get("parameters_schema_json") or {"type": "object", "properties": {}}
        if not params or "type" not in params:
            params = {
                "type": "object",
                "properties": {
                    "input_text": {"type": "string", "description": "البيانات المرسلة للأداة"}
                },
            }
        openai_tools.append(
            {
                "type": "function",
                "function": {
                    "name": slug,
                    "description": t["description"][:300],
                    "parameters": params,
                },
            }
        )

    if can_delegate and colleague_agents:
        peers_desc = " | ".join(
            f"ID={a['id']}: {a['name']} ({a['domain']})" for a in colleague_agents[:25]
        )
        openai_tools.append(
            {
                "type": "function",
                "function": {
                    "name": "delegate_to_colleague",
                    "description": f"تفويض مهمة فرعية لوكيل زميل متخصص واستلام نتيجته. الزملاء المتاحون: {peers_desc}",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "colleague_agent_id": {
                                "type": "integer",
                                "description": "رقم معرّف الوكيل الزميل (ID)",
                            },
                            "sub_task": {
                                "type": "string",
                                "description": "وصف دقيق للمهمة الفرعية المطلوبة من الوكيل الزميل",
                            },
                        },
                        "required": ["colleague_agent_id", "sub_task"],
                    },
                },
            }
        )
    return openai_tools


def execute_real_tool(
    tool_def: Dict[str, Any],
    args: Dict[str, Any],
    agent_id: int,
    user_id: int,
) -> str:
    slug = tool_def["slug"]
    exec_type = tool_def.get("execution_type", "builtin")

    # 1. Real DuckDuckGo Web Search
    if slug == "web_search":
        query = str(args.get("query", "")).strip()
        if not query:
            return json.dumps({"error": "Empty search query"}, ensure_ascii=False)
        try:
            encoded_q = urllib.parse.urlencode({"q": query})
            req = urllib.request.Request(
                f"https://html.duckduckgo.com/html/?{encoded_q}",
                headers={"User-Agent": "Mozilla/5.0 (compatible; NexusAgentOS/2.0)"},
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                html = resp.read(120_000).decode("utf-8", errors="replace")
            matches = re.findall(
                r'<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
                html,
                flags=re.DOTALL,
            )
            snippets = re.findall(
                r'<a[^>]*class="result__snippet"[^>]*>(.*?)</a>',
                html,
                flags=re.DOTALL,
            )
            results = []
            for idx, (href, raw_title) in enumerate(matches[:6]):
                clean_title = re.sub(r"<[^>]+>", "", raw_title).strip()
                clean_snip = re.sub(r"<[^>]+>", "", snippets[idx]).strip() if idx < len(snippets) else ""
                results.append({"title": clean_title, "url": href, "snippet": clean_snip})
            return json.dumps({"query": query, "results": results}, ensure_ascii=False)
        except Exception as exc:
            return json.dumps({"query": query, "error": f"تعذر الاتصال بمحرك البحث الخارجي: {str(exc)[:160]}"}, ensure_ascii=False)

    # 2. Real Webpage Scraper
    if slug == "scrape_webpage":
        url = str(args.get("url", "")).strip()
        if not url.startswith(("http://", "https://")):
            return json.dumps({"error": "يجب أن يبدأ الرابط بـ http:// أو https://"}, ensure_ascii=False)
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (compatible; NexusAgentOS-Auditor/2.0)"},
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                raw_bytes = resp.read(150_000)
                charset = resp.headers.get_content_charset() or "utf-8"
                html = raw_bytes.decode(charset, errors="replace")
            parser = _WebpageParser()
            parser.feed(html)
            return json.dumps(
                {
                    "url": url,
                    "title": parser.title,
                    "meta_description": parser.meta_desc,
                    "headings": parser.headings[:12],
                    "outbound_links_sample": parser.links[:8],
                    "body_text": parser.body_excerpt(3000),
                },
                ensure_ascii=False,
            )
        except Exception as exc:
            return json.dumps({"url": url, "error": f"فشل سحب الصفحة: {str(exc)[:180]}"}, ensure_ascii=False)

    # 3. Safe AST Python Evaluator
    if slug == "python_eval":
        expr = str(args.get("expression", "")).strip()
        try:
            tree = ast.parse(expr, mode="eval")
            val = _eval_safe_ast(tree)
            return json.dumps({"expression": expr, "result": val}, ensure_ascii=False)
        except Exception as exc:
            return json.dumps({"expression": expr, "error": str(exc)}, ensure_ascii=False)

    # 4. Persistent Agent Memory Write / Read
    if slug == "memory_write":
        k = str(args.get("key", "note")).strip()[:100]
        v = str(args.get("value", "")).strip()[:4000]
        with get_db() as conn:
            conn.execute(
                """
                INSERT INTO agent_memories (agent_id, user_id, mem_key, mem_value, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(agent_id, mem_key) DO UPDATE SET mem_value = excluded.mem_value, updated_at = excluded.updated_at
                """,
                (agent_id, user_id, k, v, now_iso()),
            )
        return json.dumps({"saved": True, "key": k}, ensure_ascii=False)

    if slug == "memory_read":
        k = str(args.get("key", "")).strip()
        with get_db() as conn:
            if k:
                row = conn.execute(
                    "SELECT mem_key, mem_value, updated_at FROM agent_memories WHERE agent_id = ? AND user_id = ? AND mem_key = ?",
                    (agent_id, user_id, k),
                ).fetchone()
                return json.dumps(dict(row) if row else {"found": False, "key": k}, ensure_ascii=False)
            rows = conn.execute(
                "SELECT mem_key, mem_value, updated_at FROM agent_memories WHERE agent_id = ? AND user_id = ? ORDER BY updated_at DESC LIMIT 20",
                (agent_id, user_id),
            ).fetchall()
            return json.dumps({"memories": [dict(r) for r in rows]}, ensure_ascii=False)

    # 5. Built-in or Custom Tenant HTTP Request Tool
    if slug == "http_request" or exec_type == "http_request":
        target_url = str(args.get("url") or tool_def.get("endpoint_url") or "").strip()
        method = str(args.get("method") or tool_def.get("http_method") or "POST").upper()
        if not target_url.startswith(("http://", "https://")):
            return json.dumps({"error": "رابط الـ API غير محدد أو غير صالح."}, ensure_ascii=False)

        headers = {"Content-Type": "application/json", "User-Agent": "NexusAgentOS/2.0"}
        custom_headers = tool_def.get("headers_json") or {}
        if isinstance(custom_headers, dict):
            for hk, hv in custom_headers.items():
                headers[str(hk)] = str(hv)

        body_bytes = None
        if method != "GET":
            if args.get("json_body"):
                body_bytes = str(args["json_body"]).encode("utf-8")
            elif tool_def.get("body_template"):
                rendered = str(tool_def["body_template"]).replace(
                    "{{input_text}}", str(args.get("input_text", ""))
                )
                body_bytes = rendered.encode("utf-8")
            else:
                body_bytes = json.dumps(args, ensure_ascii=False).encode("utf-8")

        try:
            req = urllib.request.Request(target_url, data=body_bytes, headers=headers, method=method)
            with urllib.request.urlopen(req, timeout=12) as resp:
                resp_text = resp.read(16_384).decode("utf-8", errors="replace")
                return json.dumps({"status": resp.status, "response": resp_text[:2500]}, ensure_ascii=False)
        except Exception as exc:
            return json.dumps({"url": target_url, "error": str(exc)[:200]}, ensure_ascii=False)

    return json.dumps({"tool": slug, "args": args, "status": "executed"}, ensure_ascii=False)

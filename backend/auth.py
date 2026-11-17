import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any, Dict, Optional, Tuple

from fastapi import Depends, Header, HTTPException

from database import get_db, now_iso, row_to_dict


PBKDF2_ITERATIONS = 200_000


def hash_password(password: str, salt_hex: Optional[str] = None) -> Tuple[str, str]:
    if not salt_hex:
        salt_hex = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt_hex),
        PBKDF2_ITERATIONS,
    )
    return dk.hex(), salt_hex


def verify_password(password: str, password_hash_hex: str, salt_hex: str) -> bool:
    computed, _ = hash_password(password, salt_hex)
    return hmac.compare_digest(computed, password_hash_hex)


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(s: str) -> bytes:
    padding = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + padding)


def get_jwt_secret() -> str:
    with get_db() as conn:
        row = conn.execute("SELECT jwt_secret FROM platform_config WHERE id = 1").fetchone()
        if row and row["jwt_secret"]:
            return str(row["jwt_secret"])
    return "fallback_dev_secret_change_in_prod"


def create_access_token(user_id: int, email: str, role: str, ttl_seconds: int = 86400 * 7) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "iat": now,
        "exp": now + ttl_seconds,
    }
    signing_input = (
        f"{_b64url_encode(json.dumps(header, separators=(',', ':')).encode('utf-8'))}."
        f"{_b64url_encode(json.dumps(payload, separators=(',', ':')).encode('utf-8'))}"
    )
    sig = hmac.new(
        get_jwt_secret().encode("utf-8"),
        signing_input.encode("ascii"),
        hashlib.sha256,
    ).digest()
    return f"{signing_input}.{_b64url_encode(sig)}"


def decode_access_token(token: str) -> Dict[str, Any]:
    parts = token.split(".")
    if len(parts) != 3:
        raise HTTPException(status_code=401, detail="رمز الجلسة غير صالح.")
    signing_input = f"{parts[0]}.{parts[1]}"
    expected_sig = hmac.new(
        get_jwt_secret().encode("utf-8"),
        signing_input.encode("ascii"),
        hashlib.sha256,
    ).digest()
    try:
        actual_sig = _b64url_decode(parts[2])
    except Exception:
        raise HTTPException(status_code=401, detail="توقيع الجلسة تالف.")
    if not hmac.compare_digest(expected_sig, actual_sig):
        raise HTTPException(status_code=401, detail="فشل التحقق من توقيع الجلسة.")
    try:
        payload = json.loads(_b64url_decode(parts[1]).decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=401, detail="بيانات الجلسة غير صالحة.")
    if int(payload.get("exp", 0)) < int(time.time()):
        raise HTTPException(status_code=401, detail="انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً.")
    return payload


def get_user_with_subscription(user_id: int) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        user_row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user_row:
            return None
        user = row_to_dict(user_row)
        assert user is not None
        user.pop("password_hash", None)
        user.pop("password_salt", None)
        user["has_tenant_api_key"] = bool(user.pop("tenant_llm_api_key", ""))

        sub_row = conn.execute(
            """
            SELECT s.*, p.code AS plan_code, p.name_ar AS plan_name,
                   p.monthly_price_usd, p.included_credits, p.max_agents,
                   p.allow_swarm, p.allow_custom_tools, p.allow_api_access, p.allow_autonomous_cron
            FROM subscriptions s
            JOIN subscription_plans p ON p.id = s.plan_id
            WHERE s.user_id = ? AND s.status = 'active'
            ORDER BY s.id DESC LIMIT 1
            """,
            (user_id,),
        ).fetchone()
        user["subscription"] = row_to_dict(sub_row) if sub_row else None
        return user


def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="يرجى تسجيل الدخول للوصول إلى المنصة.")
    raw_token = authorization.split(" ", 1)[1].strip()
    payload = decode_access_token(raw_token)
    user = get_user_with_subscription(int(payload["sub"]))
    if not user or not user.get("is_active"):
        raise HTTPException(status_code=403, detail="هذا الحساب غير نشط أو تم إيقافه.")
    return user


def require_super_admin(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="هذه الصلاحية مخصصة لمالك المنصة (Super Admin) فقط.")
    return user


def generate_customer_api_key() -> Tuple[str, str, str]:
    raw_key = "sk_nexus_" + secrets.token_urlsafe(28)
    prefix = raw_key[:15] + "..."
    key_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    return raw_key, prefix, key_hash


def get_user_from_api_key(x_api_key: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not x_api_key or not x_api_key.startswith("sk_nexus_"):
        raise HTTPException(status_code=401, detail="مفتاح X-API-Key مفقود أو غير صالح.")
    key_hash = hashlib.sha256(x_api_key.strip().encode("utf-8")).hexdigest()
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM customer_api_keys WHERE key_hash = ? AND is_active = 1",
            (key_hash,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="مفتاح الـ API غير معتمد أو تم إلغاؤه.")
        conn.execute(
            "UPDATE customer_api_keys SET last_used_at = ? WHERE id = ?",
            (now_iso(), row["id"]),
        )
        user_id = int(row["user_id"])

    user = get_user_with_subscription(user_id)
    if not user or not user.get("is_active"):
        raise HTTPException(status_code=403, detail="حساب المشترك غير نشط.")
    sub = user.get("subscription")
    if user.get("role") != "super_admin" and (not sub or not sub.get("allow_api_access")):
        raise HTTPException(status_code=403, detail="باقتك الحالية لا تدعم استدعاء الوكلاء عبر الـ API الخارجي.")
    return user

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


def to_dict(model: BaseModel) -> Dict[str, Any]:
    if hasattr(model, "model_dump"):
        return model.model_dump()  # type: ignore[attr-defined]
    return model.dict()


# ==================== AUTH & ACCOUNT ====================

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    company_name: str = ""
    plan_code: str = "free_trial"


class LoginRequest(BaseModel):
    email: str
    password: str


class TenantByokUpdate(BaseModel):
    provider: str = "openrouter"
    api_key: str = ""


# ==================== BILLING, SUBSCRIPTIONS & VOUCHERS ====================

class CheckoutRequest(BaseModel):
    plan_id: int
    payment_method: str = "manual_transfer"  # stripe | manual_transfer
    payment_reference: str = ""


class VoucherRedeemRequest(BaseModel):
    code: str


class AdminVoucherCreate(BaseModel):
    code: str
    plan_id: Optional[int] = None
    bonus_credits: float = 5000.0
    max_uses: int = 10


class AdminPlanUpdate(BaseModel):
    name_ar: Optional[str] = None
    monthly_price_usd: Optional[float] = None
    included_credits: Optional[float] = None
    max_agents: Optional[int] = None
    allow_swarm: Optional[bool] = None
    allow_custom_tools: Optional[bool] = None
    allow_api_access: Optional[bool] = None
    allow_autonomous_cron: Optional[bool] = None


class AdminCreditAdjust(BaseModel):
    credits_delta: float
    note: str = "تعديل رصيد إداري"


# ==================== AGENTS, TOOLS & MISSIONS ====================

class AgentCreateRequest(BaseModel):
    name: str
    role_title: str
    domain: str
    description: str
    system_prompt: str
    model: str = "google/gemini-2.5-flash"
    temperature: float = 0.3
    installed_tools: List[str] = Field(default_factory=list)
    can_delegate: bool = True
    max_iterations: int = 5
    trigger_type: str = "manual"
    cron_interval_minutes: int = 60
    is_marketplace_public: bool = False
    marketplace_credit_fee: float = 0.0


class AgentUpdateRequest(BaseModel):
    name: Optional[str] = None
    role_title: Optional[str] = None
    domain: Optional[str] = None
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    installed_tools: Optional[List[str]] = None
    can_delegate: Optional[bool] = None
    max_iterations: Optional[int] = None
    trigger_type: Optional[str] = None
    cron_interval_minutes: Optional[int] = None
    status: Optional[str] = None
    is_marketplace_public: Optional[bool] = None


class CustomToolCreateRequest(BaseModel):
    slug: str
    name: str
    category: str = "أدوات API خاصة"
    description: str
    endpoint_url: str
    http_method: str = "POST"
    headers_json: Dict[str, str] = Field(default_factory=dict)
    body_template: str = ""
    parameters_schema_json: Dict[str, Any] = Field(default_factory=dict)


class MissionExecuteRequest(BaseModel):
    title: str = ""
    goal_prompt: str
    execution_mode: str = "standalone"  # standalone | swarm_sequential | swarm_orchestrated
    agent_ids: List[int] = Field(default_factory=list)


class ApiKeyCreateRequest(BaseModel):
    label: str = "Production Integration Key"


class LlmTestRequest(BaseModel):
    provider: str
    api_key: str
    base_url: str = ""
    model: str = ""


class AdminPlatformConfigUpdate(BaseModel):
    platform_name: Optional[str] = None
    active_llm_provider: Optional[str] = None
    openrouter_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    custom_llm_base_url: Optional[str] = None
    custom_llm_api_key: Optional[str] = None
    default_model: Optional[str] = None
    usd_to_credits_rate: Optional[float] = None
    markup_multiplier: Optional[float] = None
    allow_tenant_byok: Optional[bool] = None
    stripe_secret_key: Optional[str] = None
    stripe_publishable_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None
    manual_payment_instructions: Optional[str] = None

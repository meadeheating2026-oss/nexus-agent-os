from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


def to_dict(model: BaseModel) -> Dict[str, Any]:
    if hasattr(model, "model_dump"):
        return model.model_dump()  # type: ignore[attr-defined]
    return model.dict()


class ToolCreate(BaseModel):
    slug: str
    name: str
    category: str = "custom"
    description: str
    execution_type: str = "http_api"  # builtin | http_api | webhook | data_template
    endpoint_url: str = ""
    http_method: str = "POST"
    headers_json: Dict[str, str] = Field(default_factory=dict)
    payload_template: str = ""


class ToolTestRequest(BaseModel):
    sample_input: str = "اختبار تشغيل الأداة"


class AgentCreate(BaseModel):
    name: str
    role_title: str
    domain: str
    description: str
    system_prompt: str
    model: str = "google/gemini-2.5-flash"
    installed_tools: List[str] = Field(default_factory=list)
    can_delegate: bool = True
    trigger_type: str = "manual"  # manual | cron | webhook
    cron_interval_minutes: int = 60
    price_per_run: float = 25.0
    max_cost_usd: float = 0.50
    memory_notes: str = ""


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    role_title: Optional[str] = None
    domain: Optional[str] = None
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    model: Optional[str] = None
    installed_tools: Optional[List[str]] = None
    can_delegate: Optional[bool] = None
    trigger_type: Optional[str] = None
    cron_interval_minutes: Optional[int] = None
    price_per_run: Optional[float] = None
    max_cost_usd: Optional[float] = None
    status: Optional[str] = None
    memory_notes: Optional[str] = None


class BlueprintGenerateRequest(BaseModel):
    idea_prompt: str
    preferred_domain: str = ""


class MissionRunRequest(BaseModel):
    title: str = ""
    goal_prompt: str
    mode: str = "swarm"  # standalone | swarm
    orchestration_strategy: str = "auto"  # auto | manual
    selected_agent_ids: List[int] = Field(default_factory=list)
    estimated_value_usd: Optional[float] = None


class SettingsUpdate(BaseModel):
    active_provider: str = "simulation"
    openrouter_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    custom_base_url: Optional[str] = None
    custom_api_key: Optional[str] = None
    default_model: str = "google/gemini-2.5-flash"
    cfo_auto_pause: bool = True
    qa_gate_enabled: bool = True
    saas_platform_name: str = "Nexus AgentOS"
    saas_credit_markup_x: float = 4.0


class SaasClientCreate(BaseModel):
    client_name: str
    company: str
    plan_name: str = "باقة الشركات الذكية (Pro Swarm)"
    monthly_fee_usd: float = 249.0
    credits_balance: float = 1000.0
    assigned_agent_ids: List[int] = Field(default_factory=list)

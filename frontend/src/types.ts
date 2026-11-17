export interface ToolItem {
  id: number;
  slug: string;
  name: string;
  category: string;
  description: string;
  execution_type: 'builtin' | 'http_api' | 'webhook' | 'data_template';
  endpoint_url: string;
  http_method: string;
  headers_json: Record<string, string>;
  payload_template: string;
  is_builtin: boolean;
  created_at: string;
}

export interface AgentItem {
  id: number;
  name: string;
  role_title: string;
  domain: string;
  description: string;
  system_prompt: string;
  model: string;
  installed_tools: string[];
  can_delegate: boolean;
  trigger_type: 'manual' | 'cron' | 'webhook';
  cron_interval_minutes: number;
  webhook_token: string;
  price_per_run: number;
  max_cost_usd: number;
  is_system_agent: boolean;
  status: 'idle' | 'running' | 'paused_by_cfo';
  total_runs: number;
  total_cost_usd: number;
  total_revenue_usd: number;
  memory_notes: string;
  last_run_at: string;
  created_at: string;
}

export interface MissionStep {
  id: number;
  mission_id: number;
  step_order: number;
  agent_id: number | null;
  agent_name: string;
  agent_domain: string;
  step_type: 'orchestration' | 'agent_execution' | 'tool_call' | 'delegation' | 'qa_review' | 'cfo_audit';
  summary: string;
  detail_output: string;
  tool_used: string;
  cost_usd: number;
  tokens: number;
  created_at: string;
}

export interface MissionItem {
  id: number;
  title: string;
  goal_prompt: string;
  mode: 'standalone' | 'swarm';
  orchestration_strategy: 'auto' | 'manual';
  selected_agent_ids: number[];
  trigger_source: string;
  status: string;
  final_output: string;
  total_cost_usd: number;
  estimated_value_usd: number;
  net_profit_usd: number;
  tokens_used: number;
  qa_score: number;
  created_at: string;
  completed_at: string;
  steps?: MissionStep[];
}

export interface DomainStat {
  domain: string;
  agents_count: number;
  runs: number;
  revenue_usd: number;
  cost_usd: number;
}

export interface OverviewData {
  platform_name: string;
  active_provider: string;
  metrics: {
    total_agents: number;
    worker_agents: number;
    active_domains: number;
    installed_tools_pool: number;
    autonomous_triggers: number;
    total_runs: number;
    internal_engine_revenue_usd: number;
    saas_mrr_usd: number;
    combined_gross_usd: number;
    total_api_cost_usd: number;
    net_profit_usd: number;
    profit_margin_pct: number;
    active_saas_clients: number;
  };
  domains: string[];
  domain_breakdown: DomainStat[];
  recent_missions: MissionItem[];
}

export interface PlatformSettings {
  active_provider: string;
  has_openrouter_key: boolean;
  has_openai_key: boolean;
  has_gemini_key: boolean;
  custom_base_url: string;
  has_custom_key: boolean;
  default_model: string;
  cfo_auto_pause: boolean;
  qa_gate_enabled: boolean;
  saas_platform_name: string;
  saas_credit_markup_x: number;
}

export interface SaasClient {
  id: number;
  client_name: string;
  company: string;
  plan_name: string;
  monthly_fee_usd: number;
  credits_balance: number;
  credits_used: number;
  assigned_agent_ids: number[];
  status: string;
  created_at: string;
}

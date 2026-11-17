export interface SubscriptionPlan {
  id: number;
  code: string;
  name_ar: string;
  description_ar: string;
  monthly_price_usd: number;
  included_credits: number;
  max_agents: number;
  allow_swarm: boolean;
  allow_custom_tools: boolean;
  allow_api_access: boolean;
  allow_autonomous_cron: boolean;
  is_active: boolean;
}

export interface ActiveSubscription {
  id: number;
  plan_id: number;
  plan_code: string;
  plan_name: string;
  monthly_price_usd: number;
  included_credits: number;
  max_agents: number;
  allow_swarm: boolean;
  allow_custom_tools: boolean;
  allow_api_access: boolean;
  allow_autonomous_cron: boolean;
  status: string;
  current_period_start: string;
  current_period_end: string;
}

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  company_name: string;
  role: 'super_admin' | 'subscriber';
  is_active: boolean;
  credits_balance: number;
  total_spent_credits: number;
  tenant_llm_provider: string;
  has_tenant_api_key: boolean;
  subscription: ActiveSubscription | null;
  created_at: string;
}

export interface PublicPlatformInfo {
  platform_name: string;
  stripe_enabled: boolean;
  manual_payment_instructions: string;
  allow_tenant_byok: boolean;
  plans: SubscriptionPlan[];
}

export interface AgentRecord {
  id: number;
  user_id: number;
  is_marketplace_public: boolean;
  marketplace_credit_fee: number;
  name: string;
  role_title: string;
  domain: string;
  description: string;
  system_prompt: string;
  model: string;
  temperature: number;
  installed_tools: string[];
  can_delegate: boolean;
  max_iterations: number;
  trigger_type: 'manual' | 'cron' | 'webhook';
  cron_interval_minutes: number;
  webhook_secret: string;
  status: string;
  total_runs: number;
  total_tokens: number;
  created_at: string;
}

export interface ToolRecord {
  id: number;
  user_id: number | null;
  slug: string;
  name: string;
  category: string;
  description: string;
  execution_type: string;
  endpoint_url: string;
  http_method: string;
}

export interface MissionStepRecord {
  id: number;
  step_order: number;
  agent_id: number | null;
  agent_name: string;
  step_kind: string;
  tool_name: string;
  input_payload: string;
  output_payload: string;
  tokens_used: number;
  duration_ms: number;
  created_at: string;
}

export interface MissionRecord {
  id: number;
  user_id: number;
  title: string;
  goal_prompt: string;
  execution_mode: 'standalone' | 'swarm_sequential' | 'swarm_orchestrated';
  agent_ids_json: number[];
  status: string;
  final_output: string;
  prompt_tokens: number;
  completion_tokens: number;
  actual_api_cost_usd: number;
  credits_charged: number;
  error_message: string;
  created_at: string;
  completed_at: string;
  steps?: MissionStepRecord[];
}

export interface InvoiceRecord {
  id: number;
  invoice_number: string;
  user_id: number;
  user_email?: string;
  user_name?: string;
  plan_id: number | null;
  plan_name?: string;
  amount_usd: number;
  credits_to_grant: number;
  payment_method: string;
  payment_reference: string;
  status: 'pending' | 'paid' | 'rejected';
  created_at: string;
  paid_at: string;
}

export interface WalletTxRecord {
  id: number;
  tx_type: string;
  credits_delta: number;
  balance_after: number;
  actual_api_cost_usd: number;
  platform_profit_usd: number;
  reference_note: string;
  created_at: string;
}

export interface DeveloperKeyRecord {
  id: number;
  label: string;
  key_prefix: string;
  secret_key?: string;
  is_active: boolean;
  last_used_at: string;
  created_at: string;
}

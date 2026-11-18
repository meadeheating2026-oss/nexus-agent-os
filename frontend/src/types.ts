export type ThemeMode = 'dark' | 'light';

export type NavTabId =
  | 'overview'
  | 'chat'
  | 'workflows'
  | 'agents'
  | 'knowledge'
  | 'missions'
  | 'automations'
  | 'tools'
  | 'billing'
  | 'admin';

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
}

export interface UserSubscriptionInfo extends SubscriptionPlan {
  plan_id: number;
  plan_name: string;
  status: string;
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
  created_at: string;
  subscription: UserSubscriptionInfo | null;
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
  trigger_type: string;
  cron_interval_minutes: number;
  webhook_secret?: string;
  status: string;
  total_runs: number;
  total_tokens: number;
  last_run_at?: string;
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
  endpoint_url?: string;
  http_method?: string;
  parameters_schema_json?: Record<string, unknown>;
}

export interface MissionStep {
  id?: number;
  step_order: number;
  agent_name: string;
  step_kind: string;
  tool_name: string;
  input_payload: string;
  output_payload: string;
  tokens_used: number;
  duration_ms: number;
  created_at?: string;
}

export interface MissionRecord {
  id: number;
  title: string;
  goal_prompt: string;
  execution_mode: 'standalone' | 'swarm_sequential' | 'swarm_orchestrated';
  status: string;
  final_output: string;
  prompt_tokens: number;
  completion_tokens: number;
  actual_api_cost_usd: number;
  credits_charged: number;
  error_message?: string;
  created_at: string;
  steps?: MissionStep[];
}

export interface KnowledgeDoc {
  id: number;
  title: string;
  category: string;
  source_type: 'text' | 'file' | 'url';
  source_url: string;
  content: string;
  word_count: number;
  chunks_json: string[];
  created_at: string;
}

export interface KnowledgeMatch {
  doc_id: number;
  doc_title: string;
  category: string;
  chunk_index: number;
  excerpt: string;
  score: number;
}

export interface AgentMemoryRecord {
  id: number;
  agent_id: number;
  agent_name?: string;
  mem_key: string;
  mem_value: string;
  updated_at: string;
}

export interface ChatArtifact {
  id: string;
  title: string;
  kind: 'report' | 'code' | 'table';
  content: string;
}

export interface ChatThread {
  id: number;
  title: string;
  mode: 'single' | 'council';
  agent_ids_json: number[];
  use_kb: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  thread_id: number;
  role: 'user' | 'assistant';
  sender_name: string;
  content: string;
  steps_json: MissionStep[];
  artifacts_json: ChatArtifact[];
  tokens_used: number;
  credits_charged: number;
  created_at: string;
}

export interface WorkflowNode {
  id: string;
  kind: 'trigger' | 'rag' | 'agent' | 'router' | 'output';
  label: string;
  subtitle: string;
  agent_id?: number;
  config?: string;
}

export interface WorkflowEdge {
  from: string;
  to: string;
  label?: string;
}

export interface WorkflowRecord {
  id: number;
  name: string;
  description: string;
  category: string;
  nodes_json: WorkflowNode[];
  edges_json: WorkflowEdge[];
  total_runs: number;
  last_run_at: string;
  created_at: string;
}

export interface AutomationRecord {
  id: number;
  agent_id: number;
  agent_name?: string;
  name: string;
  cron_expression: string;
  schedule_label: string;
  goal_prompt: string;
  channel_target: string;
  is_active: boolean;
  total_runs: number;
  last_run_at: string;
  created_at: string;
}

export interface ConnectorRecord {
  id: number;
  platform: 'telegram' | 'whatsapp' | 'slack' | 'discord' | 'webhook' | 'email' | 'notion';
  name: string;
  endpoint_or_token: string;
  target_channel: string;
  is_active: boolean;
  last_tested_at: string;
  created_at: string;
}

export interface DeveloperKeyRecord {
  id: number;
  label: string;
  key_prefix: string;
  full_once?: string;
  is_active: boolean;
  created_at: string;
}

export interface WalletTx {
  id: number;
  tx_type: string;
  credits_delta: number;
  balance_after: number;
  actual_api_cost_usd: number;
  platform_profit_usd: number;
  reference_note: string;
  created_at: string;
}

export interface InvoiceRecord {
  id: number;
  invoice_number: string;
  user_id: number;
  user_email?: string;
  user_name?: string;
  plan_id: number;
  plan_name?: string;
  amount_usd: number;
  credits_to_grant: number;
  payment_method: string;
  payment_reference: string;
  status: 'pending' | 'paid' | 'rejected';
  created_at: string;
}

export interface VoucherRecord {
  id?: number;
  code: string;
  plan_id: number | null;
  plan_name?: string;
  bonus_credits: number;
  max_uses: number;
  used_count: number;
}

export interface AdminOverviewStats {
  total_subscribers: number;
  paid_revenue_usd: number;
  pending_invoices_count: number;
  total_wholesale_api_cost_usd: number;
  usage_net_profit_usd: number;
  total_missions_executed: number;
  daily_telemetry: Array<{
    day: string;
    tokens: number;
    credits: number;
    revenue_usd: number;
    cost_usd: number;
  }>;
}

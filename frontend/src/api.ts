import type {
  AgentRecord,
  DeveloperKeyRecord,
  InvoiceRecord,
  MissionRecord,
  PublicPlatformInfo,
  SubscriptionPlan,
  ToolRecord,
  UserProfile,
  WalletTxRecord,
} from './types';

const TOKEN_STORAGE_KEY = 'nexus_enterprise_jwt';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    let msg = `خطأ (${res.status})`;
    try {
      const body = await res.json();
      if (body.detail) msg = body.detail;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const enterpriseApi = {
  // Public & Auth
  getPublicInfo: () => apiFetch<PublicPlatformInfo>('/api/public/info'),

  register: (payload: {
    email: string;
    password: string;
    full_name: string;
    company_name: string;
  }) =>
    apiFetch<{ access_token: string; user: UserProfile }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    apiFetch<{ access_token: string; user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  me: () => apiFetch<UserProfile>('/api/auth/me'),

  saveByok: (provider: string, api_key: string) =>
    apiFetch<UserProfile>('/api/auth/byok', {
      method: 'PUT',
      body: JSON.stringify({ provider, api_key }),
    }),

  // Billing & Subscriptions
  getWallet: () =>
    apiFetch<{
      credits_balance: number;
      total_spent_credits: number;
      subscription: UserProfile['subscription'];
      invoices: InvoiceRecord[];
      transactions: WalletTxRecord[];
    }>('/api/billing/wallet'),

  checkoutPlan: (plan_id: number, payment_method: string, payment_reference: string) =>
    apiFetch<{
      status: string;
      checkout_url?: string;
      invoice_number: string;
      message?: string;
      user?: UserProfile;
    }>('/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan_id, payment_method, payment_reference }),
    }),

  redeemVoucher: (code: string) =>
    apiFetch<{ redeemed: boolean; user: UserProfile }>('/api/billing/redeem-voucher', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  // Tenant Workspace
  getDashboard: () =>
    apiFetch<{
      user: UserProfile;
      llm_ready: boolean;
      stats: {
        private_agents_count: number;
        marketplace_agents_count: number;
        custom_domains_count: number;
        missions_count: number;
        total_tokens_processed: number;
      };
      domains: string[];
      recent_missions: MissionRecord[];
    }>('/api/dashboard'),

  listAgents: () =>
    apiFetch<{ my_agents: AgentRecord[]; marketplace_agents: AgentRecord[] }>('/api/agents'),

  createAgent: (payload: Partial<AgentRecord>) =>
    apiFetch<AgentRecord>('/api/agents', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  installMarketplaceAgent: (id: number) =>
    apiFetch<AgentRecord>(`/api/agents/${id}/install`, { method: 'POST' }),

  updateAgent: (id: number, payload: Partial<AgentRecord>) =>
    apiFetch<AgentRecord>(`/api/agents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteAgent: (id: number) =>
    apiFetch<{ deleted: boolean }>(`/api/agents/${id}`, { method: 'DELETE' }),

  // Tools & Developer API Keys
  listTools: () => apiFetch<ToolRecord[]>('/api/tools'),

  createTool: (payload: Record<string, unknown>) =>
    apiFetch<ToolRecord>('/api/tools', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  testTool: (id: number, sampleArgs: Record<string, unknown>) =>
    apiFetch<{ tool: string; result: string }>(`/api/tools/${id}/test`, {
      method: 'POST',
      body: JSON.stringify(sampleArgs),
    }),

  deleteTool: (id: number) =>
    apiFetch<{ deleted: boolean }>(`/api/tools/${id}`, { method: 'DELETE' }),

  listDeveloperKeys: () => apiFetch<DeveloperKeyRecord[]>('/api/developer/keys'),

  createDeveloperKey: (label: string) =>
    apiFetch<DeveloperKeyRecord>('/api/developer/keys', {
      method: 'POST',
      body: JSON.stringify({ label }),
    }),

  revokeDeveloperKey: (id: number) =>
    apiFetch<{ revoked: boolean }>(`/api/developer/keys/${id}`, { method: 'DELETE' }),

  // Missions
  listMissions: () => apiFetch<MissionRecord[]>('/api/missions'),

  getMission: (id: number) => apiFetch<MissionRecord>(`/api/missions/${id}`),

  executeMission: (payload: {
    title?: string;
    goal_prompt: string;
    execution_mode: 'standalone' | 'swarm_sequential' | 'swarm_orchestrated';
    agent_ids: number[];
  }) =>
    apiFetch<MissionRecord>('/api/missions/execute', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Super Admin
  adminOverview: () => apiFetch<Record<string, number>>('/api/admin/overview'),
  adminUsers: () => apiFetch<Array<Record<string, unknown>>>('/api/admin/users'),
  adminToggleUser: (uid: number) =>
    apiFetch<{ id: number; is_active: boolean }>(`/api/admin/users/${uid}/toggle-active`, {
      method: 'PATCH',
    }),
  adminAdjustCredits: (uid: number, credits_delta: number, note: string) =>
    apiFetch<{ credits_balance: number }>(`/api/admin/users/${uid}/adjust-credits`, {
      method: 'POST',
      body: JSON.stringify({ credits_delta, note }),
    }),
  adminAssignPlan: (uid: number, planId: number) =>
    apiFetch<{ assigned: boolean; plan: string }>(`/api/admin/users/${uid}/assign-plan/${planId}`, {
      method: 'POST',
    }),
  adminInvoices: () => apiFetch<InvoiceRecord[]>('/api/admin/invoices'),
  adminApproveInvoice: (invId: number) =>
    apiFetch<{ approved: boolean }>(`/api/admin/invoices/${invId}/approve`, { method: 'POST' }),
  adminRejectInvoice: (invId: number) =>
    apiFetch<{ rejected: boolean }>(`/api/admin/invoices/${invId}/reject`, { method: 'POST' }),
  adminVouchers: () => apiFetch<Array<Record<string, unknown>>>('/api/admin/vouchers'),
  adminCreateVoucher: (payload: { code: string; plan_id: number | null; bonus_credits: number; max_uses: number }) =>
    apiFetch<Record<string, unknown>>('/api/admin/vouchers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  adminUpdatePlan: (planId: number, payload: Partial<SubscriptionPlan>) =>
    apiFetch<SubscriptionPlan>(`/api/admin/plans/${planId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  adminGetConfig: () => apiFetch<Record<string, unknown>>('/api/admin/config'),
  adminUpdateConfig: (payload: Record<string, unknown>) =>
    apiFetch<Record<string, unknown>>('/api/admin/config', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  adminTestLlm: (provider: string, api_key: string, base_url = '', model = '') =>
    apiFetch<{ ok: boolean; latency_ms: number; model: string; sample_reply: string }>(
      '/api/admin/test-llm',
      {
        method: 'POST',
        body: JSON.stringify({ provider, api_key, base_url, model }),
      }
    ),
};

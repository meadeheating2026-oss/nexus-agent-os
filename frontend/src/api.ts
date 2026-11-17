import type {
  AgentItem,
  MissionItem,
  OverviewData,
  PlatformSettings,
  SaasClient,
  ToolItem,
} from './types';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    let errText = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data.detail) errText = data.detail;
    } catch {
      // ignore
    }
    throw new Error(errText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getOverview: () => request<OverviewData>('/api/overview'),

  listAgents: (domain?: string, search?: string) => {
    const params = new URLSearchParams();
    if (domain && domain !== 'all') params.set('domain', domain);
    if (search) params.set('search', search);
    const qs = params.toString();
    return request<AgentItem[]>(`/api/agents${qs ? `?${qs}` : ''}`);
  },

  generateBlueprint: (idea_prompt: string, preferred_domain = '') =>
    request<Partial<AgentItem>>('/api/agents/generate-blueprint', {
      method: 'POST',
      body: JSON.stringify({ idea_prompt, preferred_domain }),
    }),

  createAgent: (payload: Partial<AgentItem>) =>
    request<AgentItem>('/api/agents', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateAgent: (id: number, payload: Partial<AgentItem>) =>
    request<AgentItem>(`/api/agents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  cloneAgent: (id: number) =>
    request<AgentItem>(`/api/agents/${id}/clone`, { method: 'POST' }),

  deleteAgent: (id: number) =>
    request<{ deleted: boolean }>(`/api/agents/${id}`, { method: 'DELETE' }),

  listTools: () => request<ToolItem[]>('/api/tools'),

  createTool: (payload: Partial<ToolItem>) =>
    request<ToolItem>('/api/tools', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  testTool: (id: number, sample_input: string) =>
    request<{ ok: boolean; output_summary: string; raw_data: string }>(
      `/api/tools/${id}/test`,
      {
        method: 'POST',
        body: JSON.stringify({ sample_input }),
      }
    ),

  deleteTool: (id: number) =>
    request<{ deleted: boolean }>(`/api/tools/${id}`, { method: 'DELETE' }),

  listMissions: () => request<MissionItem[]>('/api/missions'),

  getMission: (id: number) => request<MissionItem>(`/api/missions/${id}`),

  runMission: (payload: {
    title?: string;
    goal_prompt: string;
    mode: 'standalone' | 'swarm';
    orchestration_strategy: 'auto' | 'manual';
    selected_agent_ids: number[];
    estimated_value_usd?: number;
  }) =>
    request<MissionItem>('/api/missions/run', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getSettings: () => request<PlatformSettings>('/api/settings'),

  updateSettings: (payload: Record<string, unknown>) =>
    request<PlatformSettings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  listSaasClients: () => request<SaasClient[]>('/api/saas-clients'),

  createSaasClient: (payload: Partial<SaasClient>) =>
    request<SaasClient>('/api/saas-clients', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteSaasClient: (id: number) =>
    request<{ deleted: boolean }>(`/api/saas-clients/${id}`, { method: 'DELETE' }),
};

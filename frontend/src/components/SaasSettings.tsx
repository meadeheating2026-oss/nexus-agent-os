import React, { useEffect, useState } from 'react';
import { Check, KeyRound, Plus, Trash2, Users } from 'lucide-react';
import { api } from '../api';
import type { AgentItem, PlatformSettings, SaasClient } from '../types';

interface Props {
  settings: PlatformSettings | null;
  clients: SaasClient[];
  agents: AgentItem[];
  onRefresh: () => Promise<void>;
}

export const SaasSettings: React.FC<Props> = ({ settings, clients, agents, onRefresh }) => {
  const workerAgents = agents.filter((a) => !a.is_system_agent);

  const [provider, setProvider] = useState(settings?.active_provider || 'simulation');
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [customUrl, setCustomUrl] = useState(settings?.custom_base_url || '');
  const [customKey, setCustomKey] = useState('');
  const [defaultModel, setDefaultModel] = useState(settings?.default_model || 'google/gemini-2.5-flash');
  const [cfoAutoPause, setCfoAutoPause] = useState(settings?.cfo_auto_pause ?? true);
  const [qaGate, setQaGate] = useState(settings?.qa_gate_enabled ?? true);
  const [platformName, setPlatformName] = useState(settings?.saas_platform_name || 'Nexus AgentOS');
  const [markupX, setMarkupX] = useState(settings?.saas_credit_markup_x || 4.0);
  const [savedBanner, setSavedBanner] = useState(false);

  // New SaaS Client state
  const [clientName, setClientName] = useState('');
  const [company, setCompany] = useState('');
  const [planName, setPlanName] = useState('باقة الشركات الذكية (Business Swarm)');
  const [monthlyFee, setMonthlyFee] = useState(299);
  const [creditsBal, setCreditsBal] = useState(1000);
  const [assignedIds, setAssignedIds] = useState<number[]>([]);

  useEffect(() => {
    if (settings) {
      setProvider(settings.active_provider);
      setCustomUrl(settings.custom_base_url);
      setDefaultModel(settings.default_model);
      setCfoAutoPause(settings.cfo_auto_pause);
      setQaGate(settings.qa_gate_enabled);
      setPlatformName(settings.saas_platform_name);
      setMarkupX(settings.saas_credit_markup_x);
    }
  }, [settings]);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      active_provider: provider,
      default_model: defaultModel,
      cfo_auto_pause: cfoAutoPause,
      qa_gate_enabled: qaGate,
      saas_platform_name: platformName,
      saas_credit_markup_x: Number(markupX) || 4.0,
      custom_base_url: customUrl,
    };
    if (openrouterKey.trim()) payload.openrouter_api_key = openrouterKey.trim();
    if (geminiKey.trim()) payload.gemini_api_key = geminiKey.trim();
    if (openaiKey.trim()) payload.openai_api_key = openaiKey.trim();
    if (customKey.trim()) payload.custom_api_key = customKey.trim();

    await api.updateSettings(payload);
    setOpenrouterKey('');
    setGeminiKey('');
    setOpenaiKey('');
    setCustomKey('');
    await onRefresh();
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2500);
  }

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim()) return;
    await api.createSaasClient({
      client_name: clientName,
      company: company || clientName,
      plan_name: planName,
      monthly_fee_usd: Number(monthlyFee) || 199,
      credits_balance: Number(creditsBal) || 500,
      assigned_agent_ids: assignedIds,
    });
    setClientName('');
    setCompany('');
    setAssignedIds([]);
    await onRefresh();
  }

  function toggleClientAgent(id: number) {
    setAssignedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <section aria-labelledby="saas-settings-heading">
      <header className="page-header">
        <div>
          <h1 id="saas-settings-heading">إدارة عملاء الـ SaaS ومحرك الذكاء الاصطناعي</h1>
          <p>
            اربط مفاتيح التشغيل الفعلية (OpenRouter / Gemini / OpenAI)، اضبط هامش ربح التوكنز، وأدر الشركات المشتركة شهرياً في منصتك.
          </p>
        </div>
      </header>

      <div className="split-2">
        {/* LLM & CFO Engine Settings */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <KeyRound size={18} color="var(--emerald)" />
              إعدادات مزود الذكاء الاصطناعي وحوكمة الربح
            </div>
            {savedBanner && (
              <span className="tag tag-emerald">
                <Check size={13} /> تم الحفظ بنجاح
              </span>
            )}
          </div>

          <form onSubmit={handleSaveSettings} className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div className="form-grid-2">
              <div className="field-group">
                <label className="field-label" htmlFor="settings-brand-input">اسم منصتك التجارية (White-Label SaaS)</label>
                <input
                  id="settings-brand-input"
                  type="text"
                  className="input"
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="settings-markup-input">مضاعف هامش ربح الـ Credits على العملاء (x)</label>
                <input
                  id="settings-markup-input"
                  type="number"
                  step="0.5"
                  min="1"
                  className="input mono"
                  value={markupX}
                  onChange={(e) => setMarkupX(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="settings-provider-select">مزود تشغيل الوكلاء النشط</label>
              <select
                id="settings-provider-select"
                className="select"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              >
                <option value="simulation">المحرك الذاتي الفوري (تجربة شاملة بدون مفتاح API)</option>
                <option value="openrouter">OpenRouter (يفتح كل الموديلات بمفتاح واحد — موصى به)</option>
                <option value="gemini">Google Gemini API مباشر</option>
                <option value="openai">OpenAI API مباشر</option>
                <option value="custom">مزود مخصص متوافق مع OpenAI (Groq / Together / Local vLLM)</option>
              </select>
            </div>

            {provider === 'openrouter' && (
              <div className="field-group">
                <label className="field-label" htmlFor="key-openrouter">
                  <span>مفتاح OpenRouter API Key</span>
                  {settings?.has_openrouter_key && <span style={{ color: 'var(--emerald)' }}>محفوظ مسبقاً</span>}
                </label>
                <input
                  id="key-openrouter"
                  type="password"
                  className="input mono"
                  placeholder="sk-or-v1-..."
                  value={openrouterKey}
                  onChange={(e) => setOpenrouterKey(e.target.value)}
                />
              </div>
            )}

            {provider === 'gemini' && (
              <div className="field-group">
                <label className="field-label" htmlFor="key-gemini">
                  <span>مفتاح Google Gemini API Key</span>
                  {settings?.has_gemini_key && <span style={{ color: 'var(--emerald)' }}>محفوظ مسبقاً</span>}
                </label>
                <input
                  id="key-gemini"
                  type="password"
                  className="input mono"
                  placeholder="AIzaSy..."
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                />
              </div>
            )}

            {provider === 'openai' && (
              <div className="field-group">
                <label className="field-label" htmlFor="key-openai">
                  <span>مفتاح OpenAI API Key</span>
                  {settings?.has_openai_key && <span style={{ color: 'var(--emerald)' }}>محفوظ مسبقاً</span>}
                </label>
                <input
                  id="key-openai"
                  type="password"
                  className="input mono"
                  placeholder="sk-proj-..."
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                />
              </div>
            )}

            {provider === 'custom' && (
              <div className="form-grid-2">
                <div className="field-group">
                  <label className="field-label" htmlFor="custom-base-url">رابط Endpoint</label>
                  <input
                    id="custom-base-url"
                    type="url"
                    className="input mono"
                    placeholder="https://api.groq.com/openai/v1"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                  />
                </div>
                <div className="field-group">
                  <label className="field-label" htmlFor="custom-api-key">مفتاح الـ API</label>
                  <input
                    id="custom-api-key"
                    type="password"
                    className="input mono"
                    placeholder="Bearer key..."
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                  />
                </div>
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.86rem', cursor: 'pointer' }}>
              <input
                id="chk-cfo-autopause"
                type="checkbox"
                checked={cfoAutoPause}
                onChange={(e) => setCfoAutoPause(e.target.checked)}
              />
              <span>تفعيل وكيل المدير المالي (CFO): إيقاف أي وكيل تلقائياً إذا تخطت تكلفته السقف المسموح</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.86rem', cursor: 'pointer' }}>
              <input
                id="chk-qa-gate"
                type="checkbox"
                checked={qaGate}
                onChange={(e) => setQaGate(e.target.checked)}
              />
              <span>تفعيل بوابة فحص الجودة الذاتية (QA Critic) قبل اعتماد وتسليم مخرجات المهام</span>
            </label>

            <button id="btn-save-settings" type="submit" className="btn btn-primary">
              حفظ إعدادات النظام والربح
            </button>
          </form>
        </div>

        {/* Multi-Tenant SaaS Clients Manager */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <Users size={18} color="var(--sky)" />
              عملاء ومشتركو منصة الـ SaaS (تأجير الوكلاء شهرياً)
            </div>
          </div>

          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <form onSubmit={handleAddClient} style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="form-grid-2">
                <div className="field-group">
                  <label className="field-label" htmlFor="client-name-input">اسم العميل / الشركة *</label>
                  <input
                    id="client-name-input"
                    type="text"
                    className="input"
                    placeholder="مثال: عيادات النور التخصصية"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    required
                  />
                </div>
                <div className="field-group">
                  <label className="field-label" htmlFor="client-fee-input">الاشتراك الشهري ($ MRR)</label>
                  <input
                    id="client-fee-input"
                    type="number"
                    min="0"
                    className="input mono"
                    value={monthlyFee}
                    onChange={(e) => setMonthlyFee(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="field-group">
                  <label className="field-label" htmlFor="client-plan-input">اسم الباقة</label>
                  <input
                    id="client-plan-input"
                    type="text"
                    className="input"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                  />
                </div>
                <div className="field-group">
                  <label className="field-label" htmlFor="client-credits-input">رصيد الـ Credits الممنوح</label>
                  <input
                    id="client-credits-input"
                    type="number"
                    min="0"
                    className="input mono"
                    value={creditsBal}
                    onChange={(e) => setCreditsBal(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="field-group">
                <span className="field-label">تخصيص وكلاء لهذا المشترك ({assignedIds.length} محدد):</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {workerAgents.map((a) => {
                    const active = assignedIds.includes(a.id);
                    return (
                      <button
                        id={`assign-client-agent-${a.id}`}
                        key={a.id}
                        type="button"
                        className={`domain-tab ${active ? 'active' : ''}`}
                        style={{ fontSize: '0.75rem', padding: '4px 9px' }}
                        onClick={() => toggleClientAgent(a.id)}
                      >
                        {a.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button id="btn-add-saas-client" type="submit" className="btn btn-secondary">
                <Plus size={15} />
                إضافة مشترك SaaS جديد
              </button>
            </form>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الشركة المشتركة</th>
                    <th>الباقة</th>
                    <th>الاشتراك الشهري</th>
                    <th>حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.client_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {c.assigned_agent_ids.length} وكلاء مخصصين
                        </div>
                      </td>
                      <td>{c.plan_name}</td>
                      <td>
                        <span className="mono" style={{ color: 'var(--emerald)', fontWeight: 600 }}>
                          ${c.monthly_fee_usd}/mo
                        </span>
                      </td>
                      <td>
                        <button
                          id={`del-client-${c.id}`}
                          type="button"
                          className="btn btn-ghost"
                          onClick={async () => {
                            await api.deleteSaasClient(c.id);
                            await onRefresh();
                          }}
                        >
                          <Trash2 size={15} color="var(--danger)" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

import React, { useMemo, useState } from 'react';
import {
  Bot,
  Check,
  Copy,
  Edit3,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Webhook,
  Wrench,
  X,
} from 'lucide-react';
import { api } from '../api';
import type { AgentItem, ToolItem } from '../types';

interface Props {
  agents: AgentItem[];
  tools: ToolItem[];
  domains: string[];
  openModalOnMount?: boolean;
  onClearModalMount?: () => void;
  onRefresh: () => Promise<void>;
  onRunAgentSolo: (agent: AgentItem) => void;
  onSendToSwarm: (agent: AgentItem) => void;
}

const MODEL_OPTIONS = [
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (سريع جداً وأقل تكلفة — موصى به)' },
  { value: 'openai/gpt-4o-mini', label: 'OpenAI GPT-4o Mini (توازن ممتاز للمبيعات والمحتوى)' },
  { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet (الأقوى للبرمجة والتحليل المعقد)' },
  { value: 'deepseek/deepseek-chat', label: 'DeepSeek V3 (أداء كمي وتحليلي بتكلفة منخفضة جداً)' },
  { value: 'openrouter/auto', label: 'OpenRouter Auto-Router (اختيار تلقائي ذكي)' },
];

export const AgentStudio: React.FC<Props> = ({
  agents,
  tools,
  domains,
  openModalOnMount,
  onClearModalMount,
  onRefresh,
  onRunAgentSolo,
  onSendToSwarm,
}) => {
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(Boolean(openModalOnMount));
  const [editingAgent, setEditingAgent] = useState<AgentItem | null>(null);
  const [copiedWebhookId, setCopiedWebhookId] = useState<number | null>(null);

  // Builder State
  const [ideaPrompt, setIdeaPrompt] = useState('');
  const [generatingBlueprint, setGeneratingBlueprint] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [name, setName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [domain, setDomain] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [model, setModel] = useState('google/gemini-2.5-flash');
  const [installedTools, setInstalledTools] = useState<string[]>([
    'web_search',
    'persistent_memory',
    'delegate_to_agent',
    'publish_deliverable',
  ]);
  const [canDelegate, setCanDelegate] = useState(true);
  const [triggerType, setTriggerType] = useState<'manual' | 'cron' | 'webhook'>('manual');
  const [cronMinutes, setCronMinutes] = useState(60);
  const [pricePerRun, setPricePerRun] = useState(35);
  const [maxCostUsd, setMaxCostUsd] = useState(0.5);
  const [memoryNotes, setMemoryNotes] = useState('');

  React.useEffect(() => {
    if (openModalOnMount) {
      openCreateModal();
      onClearModalMount?.();
    }
  }, [openModalOnMount]);

  const filteredAgents = useMemo(() => {
    return agents.filter((a) => {
      if (selectedDomain !== 'all' && a.domain !== selectedDomain) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${a.name} ${a.role_title} ${a.domain} ${a.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [agents, selectedDomain, searchQuery]);

  const toolsMap = useMemo(() => {
    const m: Record<string, string> = {};
    tools.forEach((t) => {
      m[t.slug] = t.name;
    });
    return m;
  }, [tools]);

  function openCreateModal() {
    setEditingAgent(null);
    setIdeaPrompt('');
    setName('');
    setRoleTitle('');
    setDomain('');
    setDescription('');
    setSystemPrompt('');
    setModel('google/gemini-2.5-flash');
    setInstalledTools(['web_search', 'persistent_memory', 'delegate_to_agent', 'publish_deliverable']);
    setCanDelegate(true);
    setTriggerType('manual');
    setCronMinutes(60);
    setPricePerRun(35);
    setMaxCostUsd(0.5);
    setMemoryNotes('');
    setErrorMsg('');
    setShowModal(true);
  }

  function openEditModal(agent: AgentItem) {
    setEditingAgent(agent);
    setIdeaPrompt('');
    setName(agent.name);
    setRoleTitle(agent.role_title);
    setDomain(agent.domain);
    setDescription(agent.description);
    setSystemPrompt(agent.system_prompt);
    setModel(agent.model);
    setInstalledTools(agent.installed_tools || []);
    setCanDelegate(agent.can_delegate);
    setTriggerType(agent.trigger_type);
    setCronMinutes(agent.cron_interval_minutes);
    setPricePerRun(agent.price_per_run);
    setMaxCostUsd(agent.max_cost_usd);
    setMemoryNotes(agent.memory_notes || '');
    setErrorMsg('');
    setShowModal(true);
  }

  async function handleGenerateBlueprint() {
    if (!ideaPrompt.trim()) {
      setErrorMsg('اكتب سطراً واحداً يصف فكرة الوكيل أو المجال الجديد ليقوم المولّد ببنائه لك.');
      return;
    }
    setGeneratingBlueprint(true);
    setErrorMsg('');
    try {
      const bp = await api.generateBlueprint(ideaPrompt, domain);
      if (bp.name) setName(bp.name);
      if (bp.role_title) setRoleTitle(bp.role_title);
      if (bp.domain) setDomain(bp.domain);
      if (bp.description) setDescription(bp.description);
      if (bp.system_prompt) setSystemPrompt(bp.system_prompt);
      if (bp.installed_tools) setInstalledTools(bp.installed_tools);
      if (typeof bp.price_per_run === 'number') setPricePerRun(bp.price_per_run);
      if (typeof bp.max_cost_usd === 'number') setMaxCostUsd(bp.max_cost_usd);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر توليد القالب');
    } finally {
      setGeneratingBlueprint(false);
    }
  }

  function toggleTool(slug: string) {
    setInstalledTools((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  async function handleSaveAgent(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !domain.trim() || !systemPrompt.trim()) {
      setErrorMsg('يرجى إدخال اسم الوكيل، المجال (أي مجال تريده)، وتعليمات البرومبت الأساسية.');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      const payload = {
        name,
        role_title: roleTitle || `خبير ${domain}`,
        domain,
        description: description || name,
        system_prompt: systemPrompt,
        model,
        installed_tools: installedTools,
        can_delegate: canDelegate,
        trigger_type: triggerType,
        cron_interval_minutes: Number(cronMinutes) || 60,
        price_per_run: Number(pricePerRun) || 25,
        max_cost_usd: Number(maxCostUsd) || 0.5,
        memory_notes: memoryNotes,
      };
      if (editingAgent) {
        await api.updateAgent(editingAgent.id, payload);
      } else {
        await api.createAgent(payload);
      }
      await onRefresh();
      setShowModal(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  }

  async function handleClone(agent: AgentItem) {
    await api.cloneAgent(agent.id);
    await onRefresh();
  }

  async function handleTogglePause(agent: AgentItem) {
    const nextStatus = agent.status === 'paused_by_cfo' ? 'idle' : 'paused_by_cfo';
    await api.updateAgent(agent.id, { status: nextStatus });
    await onRefresh();
  }

  async function handleDelete(agent: AgentItem) {
    if (agent.is_system_agent) return;
    await api.deleteAgent(agent.id);
    await onRefresh();
  }

  function copyWebhookUrl(agent: AgentItem) {
    const url = `${window.location.origin}/api/webhooks/agent/${agent.id}`;
    navigator.clipboard?.writeText(url);
    setCopiedWebhookId(agent.id);
    setTimeout(() => setCopiedWebhookId(null), 2000);
  }

  return (
    <section aria-labelledby="agent-studio-heading">
      <header className="page-header">
        <div>
          <h1 id="agent-studio-heading">مصنع وأسطول الوكلاء اللانهائي (Agent Studio)</h1>
          <p>
            أنشئ عدداً لا نهائياً من الوكلاء في أي مجال يخطر ببالك، زوّد كل وكيل بالبرومبت والأدوات المناسبة، وشغّله مستقلاً أو متكاملاً مع باقي الأسطول.
          </p>
        </div>
        <div className="header-actions">
          <button
            id="studio-btn-new-agent"
            type="button"
            className="btn btn-primary"
            onClick={openCreateModal}
          >
            <Plus size={16} />
            بناء وكيل جديد
          </button>
        </div>
      </header>

      <div className="filter-bar">
        <div className="domain-tabs" role="tablist" aria-label="تصفية حسب المجال">
          <button
            id="filter-domain-all"
            type="button"
            className={`domain-tab ${selectedDomain === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedDomain('all')}
          >
            كل المجالات ({agents.length})
          </button>
          {domains.map((dom, idx) => (
            <button
              id={`filter-domain-${idx}`}
              key={dom}
              type="button"
              className={`domain-tab ${selectedDomain === dom ? 'active' : ''}`}
              onClick={() => setSelectedDomain(dom)}
            >
              {dom}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', minWidth: '260px' }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            id="agent-search-input"
            type="search"
            className="input"
            style={{ paddingRight: '36px' }}
            placeholder="ابحث في 100+ وكيل بالاسم أو التخصص..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="agent-grid">
        {filteredAgents.map((agent) => (
          <article key={agent.id} className="agent-row-card">
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '10px',
                  marginBottom: '8px',
                }}
              >
                <div>
                  <span
                    className={`tag ${
                      agent.is_system_agent
                        ? 'tag-amber'
                        : agent.status === 'paused_by_cfo'
                        ? 'tag-danger'
                        : 'tag-emerald'
                    }`}
                  >
                    {agent.domain}
                  </span>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '8px' }}>
                    {agent.name}
                  </h2>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {agent.role_title}
                  </div>
                </div>
                <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--emerald)', fontWeight: 600 }}>
                  ${agent.price_per_run}/مهمة
                </span>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                {agent.description}
              </p>

              <div className="tool-pills" style={{ marginBottom: '12px' }}>
                {agent.installed_tools.map((slug) => (
                  <span key={slug} className="tool-pill">
                    <Wrench size={11} style={{ marginLeft: 4, verticalAlign: 'middle' }} />
                    {(toolsMap[slug] || slug).split('(')[0].trim()}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.77rem',
                  color: 'var(--text-muted)',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--border-subtle)',
                  marginBottom: '12px',
                }}
              >
                <span>
                  المهام: <strong className="mono" style={{ color: 'var(--text-primary)' }}>{agent.total_runs}</strong> | العائد:{' '}
                  <strong className="mono" style={{ color: 'var(--emerald)' }}>${agent.total_revenue_usd.toFixed(0)}</strong>
                </span>
                <span>
                  التشغيل:{' '}
                  <strong>
                    {agent.trigger_type === 'cron'
                      ? `آلي كل ${agent.cron_interval_minutes} د`
                      : agent.trigger_type === 'webhook'
                      ? 'Webhook حي'
                      : 'عند الطلب'}
                  </strong>
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flexWrap: 'wrap' }}>
                {!agent.is_system_agent ? (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      id={`run-solo-agent-${agent.id}`}
                      type="button"
                      className="btn btn-primary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={() => onRunAgentSolo(agent)}
                    >
                      <Play size={14} />
                      تشغيل مستقل
                    </button>
                    <button
                      id={`swarm-add-agent-${agent.id}`}
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                      onClick={() => onSendToSwarm(agent)}
                      title="دمج مع وكلاء آخرين في مهمة مشتركة"
                    >
                      دمج جماعي
                    </button>
                  </div>
                ) : (
                  <span className="tag tag-amber">وكيل حوكمة ورقابة ذاتية</span>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <button
                    id={`webhook-copy-${agent.id}`}
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => copyWebhookUrl(agent)}
                    title="نسخ رابط الـ Webhook لتشغيل هذا الوكيل خارجياً 24/7"
                  >
                    {copiedWebhookId === agent.id ? <Check size={15} color="var(--emerald)" /> : <Webhook size={15} />}
                  </button>
                  <button
                    id={`clone-agent-${agent.id}`}
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => handleClone(agent)}
                    title="استنساخ الوكيل لتوسيع الأسطول بسرعة"
                  >
                    <Copy size={15} />
                  </button>
                  <button
                    id={`edit-agent-${agent.id}`}
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => openEditModal(agent)}
                    title="تعديل البرومبت والأدوات والمجال"
                  >
                    <Edit3 size={15} />
                  </button>
                  {!agent.is_system_agent && (
                    <>
                      <button
                        id={`pause-agent-${agent.id}`}
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => handleTogglePause(agent)}
                        title={agent.status === 'paused_by_cfo' ? 'إعادة تفعيل الوكيل' : 'إيقاف مؤقت'}
                      >
                        <Bot size={15} color={agent.status === 'paused_by_cfo' ? 'var(--danger)' : 'var(--emerald)'} />
                      </button>
                      <button
                        id={`delete-agent-${agent.id}`}
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => handleDelete(agent)}
                        title="حذف الوكيل"
                      >
                        <Trash2 size={15} color="var(--danger)" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {showModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-agent-title">
          <div className="modal-sheet">
            <div className="panel-header">
              <div className="panel-title" id="modal-agent-title">
                <Bot size={20} color="var(--emerald)" />
                {editingAgent ? `تعديل الوكيل: ${editingAgent.name}` : 'بناء وتثبيت وكيل جديد (أي مجال في العالم)'}
              </div>
              <button
                id="close-agent-modal"
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAgent} className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {!editingAgent && (
                <div
                  style={{
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                  }}
                >
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, marginBottom: '8px', color: 'var(--amber)' }}>
                    <Sparkles size={15} style={{ marginLeft: 6, verticalAlign: 'middle' }} />
                    المولّد الذكي للوكلاء (اختياري — اكتب الفكرة في سطر واحد وسيكتب البرومبت ويختار الأدوات تلقائياً):
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input
                      id="ai-blueprint-idea-input"
                      type="text"
                      className="input"
                      style={{ flex: 1, minWidth: '240px' }}
                      placeholder="مثال: وكيل خبير في مراجعة العقود القانونية، أو صيد صفقات مزادات السيارات، أو حجوزات السياحة..."
                      value={ideaPrompt}
                      onChange={(e) => setIdeaPrompt(e.target.value)}
                    />
                    <button
                      id="btn-generate-blueprint"
                      type="button"
                      className="btn btn-amber"
                      disabled={generatingBlueprint}
                      onClick={handleGenerateBlueprint}
                    >
                      <Sparkles size={15} />
                      {generatingBlueprint ? 'جاري التوليد...' : 'توليد البرومبت والأدوات'}
                    </button>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--danger-soft)',
                    color: 'var(--danger)',
                    fontSize: '0.85rem',
                  }}
                >
                  {errorMsg}
                </div>
              )}

              <div className="form-grid-2">
                <div className="field-group">
                  <label className="field-label" htmlFor="agent-name-input">اسم الوكيل *</label>
                  <input
                    id="agent-name-input"
                    type="text"
                    className="input"
                    placeholder="مثال: مستشار العقود والمناقصات الذكي"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="agent-domain-input">
                    <span>المجال / القطاع *</span>
                    <span style={{ fontWeight: 400, color: 'var(--emerald)', fontSize: '0.75rem' }}>
                      اكتب أي مجال جديد بحرية كاملة
                    </span>
                  </label>
                  <input
                    id="agent-domain-input"
                    list="existing-domains-datalist"
                    type="text"
                    className="input"
                    placeholder="اكتب أي مجال (عقارات، قانون، طب، طيران، استيراد...)"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    required
                  />
                  <datalist id="existing-domains-datalist">
                    {domains.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="field-group">
                  <label className="field-label" htmlFor="agent-role-input">المسمى التخصصي للوكيل</label>
                  <input
                    id="agent-role-input"
                    type="text"
                    className="input"
                    placeholder="مثال: محلل صفقات وتسعير أوتوماتيكي"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                  />
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="agent-model-select">موديل الذكاء الاصطناعي المشغّل</label>
                  <select
                    id="agent-model-select"
                    className="select"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  >
                    {MODEL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="agent-desc-input">وصف مختصر لدور الوكيل (يقرأه المنسق الرئيسي عند دمج الوكلاء)</label>
                <input
                  id="agent-desc-input"
                  type="text"
                  className="input"
                  placeholder="وصف سريع لمهارة هذا الوكيل متى يستعين به باقي الأسطول..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="agent-prompt-textarea">
                  <span>برومبت المهمة والقواعد التشغيلية (System Prompt & SOP) *</span>
                </label>
                <textarea
                  id="agent-prompt-textarea"
                  className="textarea"
                  style={{ minHeight: '135px' }}
                  placeholder="اكتب التعليمات التفصيلية للمهمة التي سينفذها الوكيل، خطوات العمل، وشكل المخرج النهائي..."
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  required
                />
              </div>

              <div className="field-group">
                <span className="field-label">تثبيت الأدوات اللازمة للمهمة (Pluggable Tools)</span>
                <div className="tool-selector-list">
                  {tools.map((t) => {
                    const checked = installedTools.includes(t.slug);
                    return (
                      <label
                        key={t.slug}
                        className={`tool-check-item ${checked ? 'checked' : ''}`}
                      >
                        <input
                          id={`chk-tool-${t.slug}`}
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTool(t.slug)}
                          style={{ marginTop: '4px' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{t.name}</div>
                          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                            {t.description.slice(0, 75)}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="form-grid-3">
                <div className="field-group">
                  <label className="field-label" htmlFor="agent-trigger-select">طريقة التشغيل الذاتي</label>
                  <select
                    id="agent-trigger-select"
                    className="select"
                    value={triggerType}
                    onChange={(e) => setTriggerType(e.target.value as 'manual' | 'cron' | 'webhook')}
                  >
                    <option value="manual">يدوي / استدعاء من المنسق</option>
                    <option value="cron">جدولة ذاتية دورية (Cron 24/7)</option>
                    <option value="webhook">حدث خارجي فوري (Webhook)</option>
                  </select>
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="agent-price-input">العائد / تسعير المهمة ($)</label>
                  <input
                    id="agent-price-input"
                    type="number"
                    step="1"
                    min="0"
                    className="input mono"
                    value={pricePerRun}
                    onChange={(e) => setPricePerRun(Number(e.target.value))}
                  />
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="agent-maxcost-input">سقف تكلفة الـ API للمرة ($)</label>
                  <input
                    id="agent-maxcost-input"
                    type="number"
                    step="0.05"
                    min="0.01"
                    className="input mono"
                    value={maxCostUsd}
                    onChange={(e) => setMaxCostUsd(Number(e.target.value))}
                  />
                </div>
              </div>

              {triggerType === 'cron' && (
                <div className="form-grid-2">
                  <div className="field-group">
                    <label className="field-label" htmlFor="agent-cron-min">دورة التكرار التلقائي (بالدقائق)</label>
                    <input
                      id="agent-cron-min"
                      type="number"
                      min="1"
                      className="input mono"
                      value={cronMinutes}
                      onChange={(e) => setCronMinutes(Number(e.target.value))}
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label" htmlFor="agent-autotask-input">
                      مهمة الجدولة التلقائية (ابدأها بـ AUTO_TASK: للتشغيل في الخلفية)
                    </label>
                    <input
                      id="agent-autotask-input"
                      type="text"
                      className="input"
                      placeholder="AUTO_TASK: افحص أحدث الفرص في المجال وجهز تقرير الربح"
                      value={memoryNotes}
                      onChange={(e) => setMemoryNotes(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.86rem', cursor: 'pointer' }}>
                <input
                  id="agent-can-delegate-chk"
                  type="checkbox"
                  checked={canDelegate}
                  onChange={(e) => setCanDelegate(e.target.checked)}
                />
                <span>
                  السماح لهذا الوكيل بالتكامل التلقائي وطلب المساعدة من أي وكيل آخر في الأسطول إذا احتاجت المهمة ذلك
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
                <button
                  id="cancel-save-agent"
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  إلغاء
                </button>
                <button
                  id="submit-save-agent"
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'جاري التثبيت...' : editingAgent ? 'حفظ تعديلات الوكيل' : 'تثبيت وتشغيل الوكيل في الأسطول'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

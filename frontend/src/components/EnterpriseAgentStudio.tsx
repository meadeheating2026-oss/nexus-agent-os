import React, { useState } from 'react';
import {
  Bot,
  Check,
  Download,
  Edit3,
  Play,
  Plus,
  Store,
  Trash2,
  Webhook,
  X,
} from 'lucide-react';
import { enterpriseApi } from '../api';
import type { AgentRecord, ToolRecord, UserProfile } from '../types';

interface Props {
  user: UserProfile;
  myAgents: AgentRecord[];
  marketplaceAgents: AgentRecord[];
  tools: ToolRecord[];
  onRefresh: () => Promise<void>;
  onRunAgent: (agent: AgentRecord, mode: 'standalone' | 'swarm_sequential') => void;
}

const MODELS = [
  { value: 'google/gemini-2.5-flash', label: 'Google Gemini 2.5 Flash' },
  { value: 'google/gemini-2.5-pro', label: 'Google Gemini 2.5 Pro' },
  { value: 'openai/gpt-4o-mini', label: 'OpenAI GPT-4o Mini' },
  { value: 'openai/gpt-4o', label: 'OpenAI GPT-4o' },
  { value: 'anthropic/claude-3.5-sonnet', label: 'Anthropic Claude 3.5 Sonnet' },
  { value: 'deepseek/deepseek-chat', label: 'DeepSeek V3' },
];

export const EnterpriseAgentStudio: React.FC<Props> = ({
  user,
  myAgents,
  marketplaceAgents,
  tools,
  onRefresh,
  onRunAgent,
}) => {
  const [subTab, setSubTab] = useState<'private' | 'marketplace'>('private');
  const [domainFilter, setDomainFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AgentRecord | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [errorBanner, setErrorBanner] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [model, setModel] = useState('google/gemini-2.5-flash');
  const [temperature, setTemperature] = useState(0.3);
  const [maxIterations, setMaxIterations] = useState(5);
  const [installedTools, setInstalledTools] = useState<string[]>(['web_search', 'python_eval', 'memory_write']);
  const [canDelegate, setCanDelegate] = useState(true);
  const [isPublicMarketplace, setIsPublicMarketplace] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const domains = Array.from(new Set(myAgents.map((a) => a.domain)));
  const visibleAgents = myAgents.filter((a) => domainFilter === 'all' || a.domain === domainFilter);

  function openNewModal() {
    setEditing(null);
    setName('');
    setDomain('');
    setRoleTitle('');
    setDescription('');
    setSystemPrompt('');
    setModel('google/gemini-2.5-flash');
    setTemperature(0.3);
    setMaxIterations(5);
    setInstalledTools(['web_search', 'scrape_webpage', 'python_eval', 'memory_write']);
    setCanDelegate(true);
    setIsPublicMarketplace(false);
    setModalError('');
    setShowModal(true);
  }

  function openEditModal(a: AgentRecord) {
    setEditing(a);
    setName(a.name);
    setDomain(a.domain);
    setRoleTitle(a.role_title);
    setDescription(a.description);
    setSystemPrompt(a.system_prompt);
    setModel(a.model);
    setTemperature(a.temperature);
    setMaxIterations(a.max_iterations);
    setInstalledTools(a.installed_tools || []);
    setCanDelegate(a.can_delegate);
    setIsPublicMarketplace(a.is_marketplace_public);
    setModalError('');
    setShowModal(true);
  }

  function toggleTool(slug: string) {
    setInstalledTools((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setModalError('');
    try {
      const payload = {
        name,
        domain,
        role_title: roleTitle || `خبير ${domain}`,
        description: description || name,
        system_prompt: systemPrompt,
        model,
        temperature: Number(temperature),
        max_iterations: Number(maxIterations),
        installed_tools: installedTools,
        can_delegate: canDelegate,
        is_marketplace_public: isPublicMarketplace,
      };
      if (editing) {
        await enterpriseApi.updateAgent(editing.id, payload);
      } else {
        await enterpriseApi.createAgent(payload);
      }
      await onRefresh();
      setShowModal(false);
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'تعذر حفظ الوكيل');
    } finally {
      setSaving(false);
    }
  }

  async function handleInstallTemplate(tplId: number) {
    setErrorBanner('');
    try {
      await enterpriseApi.installMarketplaceAgent(tplId);
      await onRefresh();
      setSubTab('private');
    } catch (err: unknown) {
      setErrorBanner(err instanceof Error ? err.message : 'تعذر تثبيت القالب');
    }
  }

  function copyWebhook(a: AgentRecord) {
    const url = `${window.location.origin}/api/webhooks/agent/${a.id}/${a.webhook_secret}`;
    navigator.clipboard?.writeText(url);
    setCopiedId(a.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const maxAllowed = user.subscription?.max_agents ?? 3;

  return (
    <section aria-labelledby="ent-studio-heading">
      <header className="page-header">
        <div>
          <h1 id="ent-studio-heading">إدارة ومصنع الوكلاء الأذكياء (Multi-Tenant Studio)</h1>
          <p>
            وكلاؤك معزولون بالكامل داخل مساحة عملك الخاصة. حد باقتك الحالي:{' '}
            <strong className="mono">
              {user.role === 'super_admin' || maxAllowed === -1
                ? 'غير محدود (Unlimited)'
                : `${myAgents.length} / ${maxAllowed}`}
            </strong>{' '}
            وكيل.
          </p>
        </div>
        <div className="header-actions">
          <button
            id="btn-subtab-private"
            type="button"
            className={`btn ${subTab === 'private' ? 'btn-secondary' : 'btn-ghost'}`}
            onClick={() => setSubTab('private')}
          >
            <Bot size={16} />
            وكلائي الخاصون ({myAgents.length})
          </button>
          <button
            id="btn-subtab-marketplace"
            type="button"
            className={`btn ${subTab === 'marketplace' ? 'btn-secondary' : 'btn-ghost'}`}
            onClick={() => setSubTab('marketplace')}
          >
            <Store size={16} />
            متجر القوالب الجاهزة ({marketplaceAgents.length})
          </button>
          <button
            id="btn-create-new-agent"
            type="button"
            className="btn btn-primary"
            onClick={openNewModal}
          >
            <Plus size={16} />
            بناء وكيل جديد
          </button>
        </div>
      </header>

      {errorBanner && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: '16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--danger-soft)',
            color: 'var(--danger)',
            fontSize: '0.86rem',
          }}
        >
          {errorBanner}
        </div>
      )}

      {subTab === 'private' ? (
        <>
          {domains.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
              <button
                type="button"
                className={`btn ${domainFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '5px 12px', fontSize: '0.8rem' }}
                onClick={() => setDomainFilter('all')}
              >
                كل القطاعات ({myAgents.length})
              </button>
              {domains.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`btn ${domainFilter === d ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '5px 12px', fontSize: '0.8rem' }}
                  onClick={() => setDomainFilter(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          )}

          {visibleAgents.length === 0 ? (
            <div className="panel">
              <div className="panel-body" style={{ textAlign: 'center', padding: '48px 20px' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '14px' }}>
                  لا يوجد وكلاء في مساحة عملك الخاصة بعد. يمكنك بناء وكيلك الأول في أي مجال أو تثبيت قالب جاهز من المتجر بضغطة زر.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  <button type="button" className="btn btn-primary" onClick={openNewModal}>
                    + بناء وكيل مخصص الآن
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setSubTab('marketplace')}>
                    استعراض متجر القوالب
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="agent-grid">
              {visibleAgents.map((ag) => (
                <article key={ag.id} className="agent-row-card">
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="tag tag-emerald">{ag.domain}</span>
                      <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        ID #{ag.id} | {ag.model.split('/').pop()}
                      </span>
                    </div>
                    <h2 style={{ fontSize: '1.02rem', fontWeight: 700 }}>{ag.name}</h2>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      {ag.role_title}
                    </div>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                      {ag.description}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {ag.installed_tools.map((sl) => (
                        <span key={sl} className="tag">
                          {sl}
                        </span>
                      ))}
                      {ag.is_marketplace_public && <span className="tag tag-amber">منشور بالمتجر العام</span>}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.76rem',
                        color: 'var(--text-muted)',
                        paddingTop: '10px',
                        borderTop: '1px solid var(--border-subtle)',
                        marginBottom: '10px',
                      }}
                    >
                      <span>
                        التشغيلات: <strong className="mono">{ag.total_runs}</strong>
                      </span>
                      <span>
                        التوكنز: <strong className="mono">{ag.total_tokens.toLocaleString()}</strong>
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          id={`btn-run-ag-${ag.id}`}
                          type="button"
                          className="btn btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          onClick={() => onRunAgent(ag, 'standalone')}
                        >
                          <Play size={14} />
                          تشغيل
                        </button>
                        <button
                          id={`btn-swarm-ag-${ag.id}`}
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                          onClick={() => onRunAgent(ag, 'swarm_sequential')}
                        >
                          دمج بفريق
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '2px' }}>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => copyWebhook(ag)}
                          title="نسخ رابط Webhook المؤمّن لهذا الوكيل"
                        >
                          {copiedId === ag.id ? <Check size={15} color="var(--emerald)" /> : <Webhook size={15} />}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => openEditModal(ag)}
                          title="تعديل"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={async () => {
                            await enterpriseApi.deleteAgent(ag.id);
                            await onRefresh();
                          }}
                          title="حذف"
                        >
                          <Trash2 size={15} color="var(--danger)" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="agent-grid">
          {marketplaceAgents.map((tpl) => (
            <article key={tpl.id} className="agent-row-card">
              <div>
                <span className="tag tag-amber">{tpl.domain}</span>
                <h2 style={{ fontSize: '1.02rem', fontWeight: 700, marginTop: '8px' }}>{tpl.name}</h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {tpl.role_title}
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  {tpl.description}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {tpl.installed_tools.map((sl) => (
                    <span key={sl} className="tag">
                      {sl}
                    </span>
                  ))}
                </div>
              </div>

              <button
                id={`install-tpl-${tpl.id}`}
                type="button"
                className="btn btn-primary"
                onClick={() => handleInstallTemplate(tpl.id)}
              >
                <Download size={15} />
                تثبيت نسخة في حسابي الخاص
              </button>
            </article>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-sheet">
            <div className="panel-header">
              <div className="panel-title">
                {editing ? `تعديل الوكيل: ${editing.name}` : 'بناء وكيل ذكي جديد (في أي قطاع)'}
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {modalError && (
                <div style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: '0.84rem' }}>
                  {modalError}
                </div>
              )}

              <div className="form-grid-2">
                <div className="field-group">
                  <label className="field-label" htmlFor="ent-ag-name">اسم الوكيل *</label>
                  <input
                    id="ent-ag-name"
                    type="text"
                    className="input"
                    placeholder="مثال: مدقق العقود التجارية"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="field-group">
                  <label className="field-label" htmlFor="ent-ag-domain">المجال / القطاع المفتوح *</label>
                  <input
                    id="ent-ag-domain"
                    type="text"
                    className="input"
                    placeholder="اكتب أي قطاع (قانون، عقارات، تجارة، برمجة...)"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-grid-3">
                <div className="field-group">
                  <label className="field-label" htmlFor="ent-ag-role">المسمى الوظيفي</label>
                  <input
                    id="ent-ag-role"
                    type="text"
                    className="input"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                  />
                </div>
                <div className="field-group">
                  <label className="field-label" htmlFor="ent-ag-model">الموديل</label>
                  <select
                    id="ent-ag-model"
                    className="select"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  >
                    {MODELS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label" htmlFor="ent-ag-iters">أقصى دورات تفكير ReAct</label>
                  <input
                    id="ent-ag-iters"
                    type="number"
                    min="1"
                    max="8"
                    className="input mono"
                    value={maxIterations}
                    onChange={(e) => setMaxIterations(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="ent-ag-desc">وصف مختصر (يستخدمه المنسق التلقائي لاختيار الوكيل)</label>
                <input
                  id="ent-ag-desc"
                  type="text"
                  className="input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="ent-ag-prompt">التعليمات الصارمة للمهمة (System Prompt) *</label>
                <textarea
                  id="ent-ag-prompt"
                  className="textarea"
                  style={{ minHeight: '130px' }}
                  placeholder="حدد مهمة الوكيل، متى يستدعي أدواته المثبتة، وكيف يصيغ المخرج النهائي..."
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  required
                />
              </div>

              <div className="field-group">
                <span className="field-label">الأدوات الفعلية المثبتة (Function Calling Tools):</span>
                <div className="tool-selector-list">
                  {tools.map((t) => {
                    const checked = installedTools.includes(t.slug);
                    return (
                      <label key={t.slug} className={`tool-check-item ${checked ? 'checked' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTool(t.slug)}
                          style={{ marginTop: '3px' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{t.name}</div>
                          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{t.slug}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={canDelegate}
                  onChange={(e) => setCanDelegate(e.target.checked)}
                />
                <span>تفعيل أداة التفويض التلقائي لوكيل زميل (delegate_to_colleague) عند الحاجة لتكامل التخصصات</span>
              </label>

              {user.role === 'super_admin' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--amber)' }}>
                  <input
                    type="checkbox"
                    checked={isPublicMarketplace}
                    onChange={(e) => setIsPublicMarketplace(e.target.checked)}
                  />
                  <span>نشر هذا الوكيل في المتجر العام (Marketplace) ليتمكن كافة المشتركين من تثبيته</span>
                </label>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'جاري الحفظ...' : 'حفظ وتفعيل الوكيل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

import React, { useState } from 'react';
import {
  Bot,
  Check,
  Download,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import {
  BUILTIN_TOOLS_CATALOG,
  ENTERPRISE_SECTORS,
  MARKETPLACE_AGENTS_24,
  type MarketplaceBlueprint,
} from '../data/enterpriseCatalog';
import { nexusEngine } from '../engine/nexusEngine';
import type { AgentRecord, UserProfile } from '../types';

interface Props {
  user: UserProfile;
  agents: AgentRecord[];
  onRefresh: () => Promise<void>;
  onLaunchAgentPrompt: (prompt: string) => void;
  notify: (msg: string, isError?: boolean) => void;
}

export const AgentMarketplaceStudio: React.FC<Props> = ({
  user,
  agents,
  onRefresh,
  onLaunchAgentPrompt,
  notify,
}) => {
  const [view, setView] = useState<'marketplace' | 'my_agents'>('marketplace');
  const [sector, setSector] = useState<string>('الكل');
  const [query, setQuery] = useState('');
  const [showBuilder, setShowBuilder] = useState(false);

  // Custom agent form
  const [name, setName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [domain, setDomain] = useState('المالية والاستثمار');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [prompt, setPrompt] = useState('');
  const [selectedTools, setSelectedTools] = useState<string[]>(['kb_search', 'python_eval', 'memory_write']);

  const filteredMarketplace = MARKETPLACE_AGENTS_24.filter((tpl) => {
    const matchSec = sector === 'الكل' || tpl.domain === sector;
    const q = query.trim().toLowerCase();
    const matchQ =
      !q ||
      tpl.name.toLowerCase().includes(q) ||
      tpl.role_title.toLowerCase().includes(q) ||
      tpl.description.toLowerCase().includes(q) ||
      tpl.domain.toLowerCase().includes(q);
    return matchSec && matchQ;
  });

  const filteredMine = agents.filter((ag) => {
    const matchSec = sector === 'الكل' || ag.domain === sector;
    const q = query.trim().toLowerCase();
    return matchSec && (!q || ag.name.toLowerCase().includes(q) || ag.domain.toLowerCase().includes(q));
  });

  async function handleInstallBlueprint(tpl: MarketplaceBlueprint) {
    try {
      await nexusEngine.createAgent({
        name: tpl.name,
        role_title: tpl.role_title,
        domain: tpl.domain,
        description: tpl.description,
        system_prompt: tpl.system_prompt,
        model: tpl.model,
        installed_tools: tpl.tools,
        can_delegate: true,
      });
      await onRefresh();
      notify(`تم تثبيت الوكيل "${tpl.name}" في مساحتك بنجاح.`);
    } catch (err) {
      notify((err as Error).message, true);
    }
  }

  async function handleCreateCustom(e: React.FormEvent) {
    e.preventDefault();
    try {
      await nexusEngine.createAgent({
        name,
        role_title: roleTitle,
        domain,
        description: roleTitle,
        system_prompt: prompt,
        model,
        installed_tools: selectedTools,
        can_delegate: true,
      });
      await onRefresh();
      setShowBuilder(false);
      setName('');
      setRoleTitle('');
      setPrompt('');
      setView('my_agents');
      notify('تم بناء وتفعيل الوكيل المخصص في مساحتك.');
    } catch (err) {
      notify((err as Error).message, true);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="nx-page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="nx-page-title">مصنع ومتجر الوكلاء الشامل (24+ Enterprise Agents)</h1>
          <p className="nx-page-subtitle">
            ثبّت وكلاء جاهزين عبر 8 قطاعات أعمال أو صمم وكيلك المخصص بأدواتك وسياساتك الخاصة • السعة:{' '}
            <strong>
              {agents.length} / {user.role === 'super_admin' || (user.subscription?.max_agents ?? 4) < 0 ? '∞' : user.subscription?.max_agents}
            </strong>
          </p>
        </div>
        <button type="button" onClick={() => setShowBuilder(true)} className="btn btn-primary">
          <Plus size={15} />
          <span>بناء وكيل مخصص جديد</span>
        </button>
      </div>

      {/* Top Controls: Segmented Switch + Search */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div className="seg-tabs">
          <button
            type="button"
            onClick={() => setView('marketplace')}
            className={`seg-tab ${view === 'marketplace' ? 'active' : ''}`}
          >
            <Sparkles size={14} />
            <span>متجر القوالب المتخصصة ({MARKETPLACE_AGENTS_24.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setView('my_agents')}
            className={`seg-tab ${view === 'my_agents' ? 'active' : ''}`}
          >
            <Bot size={14} />
            <span>وكلائي المثبتون ({agents.length})</span>
          </button>
        </div>

        <div style={{ position: 'relative', minWidth: 280, flex: '0 1 360px' }}>
          <Search
            size={15}
            style={{ position: 'absolute', top: 11, insetInlineStart: 11, color: 'var(--text-muted)' }}
          />
          <input
            className="nx-input"
            style={{ paddingInlineStart: 34 }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث باسم الوكيل، الوظيفة، أو التخصص..."
          />
        </div>
      </div>

      {/* Sector Filter Pills */}
      <div className="pill-bar">
        {ENTERPRISE_SECTORS.map((sec) => (
          <button
            key={sec}
            type="button"
            onClick={() => setSector(sec)}
            className={`filter-pill ${sector === sec ? 'active' : ''}`}
          >
            {sec}
          </button>
        ))}
      </div>

      {/* Marketplace Grid */}
      {view === 'marketplace' ? (
        <div className="grid-3">
          {filteredMarketplace.map((tpl) => {
            const alreadyInstalled = agents.some((a) => a.name === tpl.name);
            return (
              <div
                key={tpl.tpl_id}
                className="nx-card"
                style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14 }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="nx-badge nx-badge-brand">{tpl.domain}</span>
                    <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {tpl.model}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.96rem', marginBottom: 3 }}>{tpl.name}</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--brand)', fontWeight: 600, marginBottom: 8 }}>
                    {tpl.role_title}
                  </div>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.79rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                    {tpl.description}
                  </p>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {tpl.tools.map((t) => (
                      <span key={t} className="nx-badge mono" style={{ fontSize: '0.68rem' }}>
                        <Wrench size={10} />
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                  <button
                    type="button"
                    onClick={() => handleInstallBlueprint(tpl)}
                    className={`btn btn-sm ${alreadyInstalled ? '' : 'btn-primary'}`}
                    style={{ flex: 1 }}
                  >
                    {alreadyInstalled ? <Check size={13} /> : <Download size={13} />}
                    <span>{alreadyInstalled ? 'مثبّت (إضافة نسخة)' : 'تثبيت في مساحتي'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onLaunchAgentPrompt(tpl.starter_prompt)}
                    className="btn btn-sm"
                    title="تجربة سيناريو فوري"
                  >
                    <MessageSquare size={13} />
                    <span>تجربة</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid-3">
          {filteredMine.map((ag) => (
            <div
              key={ag.id}
              className="nx-card"
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14 }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span className="nx-badge nx-badge-cyan">{ag.domain}</span>
                  <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {ag.total_runs} مهام
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.96rem', marginBottom: 3 }}>{ag.name}</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: 8 }}>{ag.role_title}</div>
                <div
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.74rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {ag.system_prompt.slice(0, 130)}...
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => onLaunchAgentPrompt(`نفّذ تحليلاً تنفيذياً متخصصاً بصفتك ${ag.name} حول أولويات الربع الحالي.`)}
                  className="btn btn-sm btn-primary"
                  style={{ flex: 1 }}
                >
                  <MessageSquare size={13} />
                  <span>بدء جلسة حوار</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await nexusEngine.deleteAgent(ag.id);
                    await onRefresh();
                    notify('تم حذف الوكيل.');
                  }}
                  className="btn btn-sm btn-danger"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom Agent Builder Modal */}
      {showBuilder && (
        <div className="nx-modal-backdrop" onClick={() => setShowBuilder(false)}>
          <div className="nx-modal" onClick={(e) => e.stopPropagation()}>
            <div className="nx-card-header">
              <div style={{ fontWeight: 700, fontSize: '1.02rem' }}>بناء وكيل ذكاء اصطناعي متخصص</div>
              <button type="button" onClick={() => setShowBuilder(false)} className="btn btn-ghost btn-sm">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCustom} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div className="grid-2">
                <div>
                  <label className="nx-label">اسم الوكيل</label>
                  <input
                    className="nx-input"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: مستشار التوريد والمشتريات"
                  />
                </div>
                <div>
                  <label className="nx-label">المسمى الوظيفي</label>
                  <input
                    className="nx-input"
                    required
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder="مثال: محلل عروض الموردين والتكاليف"
                  />
                </div>
              </div>

              <div className="grid-2">
                <div>
                  <label className="nx-label">القطاع / المجال (يمكن كتابة أي مجال حر)</label>
                  <input
                    className="nx-input"
                    required
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                  />
                </div>
                <div>
                  <label className="nx-label">النموذج الأساسي</label>
                  <select className="nx-select" value={model} onChange={(e) => setModel(e.target.value)}>
                    <option value="gemini-2.5-flash">Google Gemini 2.5 Flash (سريع واقتصادي)</option>
                    <option value="gemini-2.5-pro">Google Gemini 2.5 Pro (تحليل عميق)</option>
                    <option value="openai/gpt-4o-mini">OpenAI GPT-4o Mini</option>
                    <option value="anthropic/claude-3.5-sonnet">Anthropic Claude 3.5 Sonnet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="nx-label">الأدوات المسموحة للوكيل</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {BUILTIN_TOOLS_CATALOG.map((tl) => {
                    const active = selectedTools.includes(tl.slug);
                    return (
                      <button
                        key={tl.slug}
                        type="button"
                        onClick={() =>
                          setSelectedTools((prev) =>
                            prev.includes(tl.slug) ? prev.filter((x) => x !== tl.slug) : [...prev, tl.slug],
                          )
                        }
                        className={`filter-pill ${active ? 'active' : ''}`}
                      >
                        {tl.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="nx-label">التعليمات البرمجية والمنهجية (System Prompt)</label>
                <textarea
                  className="nx-textarea"
                  required
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="حدد شخصية الوكيل، قواعد العمل، ومتى يستدعي قاعدة المعرفة أو بايثون..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => setShowBuilder(false)} className="btn">
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  اعتماد وإضافة الوكيل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Code2, KeyRound, Play, Plus, Trash2, Wrench } from 'lucide-react';
import { enterpriseApi } from '../api';
import type { AgentRecord, DeveloperKeyRecord, ToolRecord, UserProfile } from '../types';

interface Props {
  user: UserProfile;
  allowByok: boolean;
  tools: ToolRecord[];
  devKeys: DeveloperKeyRecord[];
  agents: AgentRecord[];
  onRefresh: () => Promise<void>;
}

export const ToolsAndApiPortal: React.FC<Props> = ({
  user,
  allowByok,
  tools,
  devKeys,
  agents,
  onRefresh,
}) => {
  // Custom tool form
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const category = 'ربط خارجي';
  const [description, setDescription] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [httpMethod, setHttpMethod] = useState('POST');
  const [toolErr, setToolErr] = useState('');
  const [toolTestOutput, setToolTestOutput] = useState('');

  // Developer API Keys
  const [keyLabel, setKeyLabel] = useState('ربط الموقع / البوت الخارجي');
  const [newlyGeneratedSecret, setNewlyGeneratedSecret] = useState('');
  const [keyErr, setKeyErr] = useState('');

  // BYOK
  const [byokProvider, setByokProvider] = useState(user.tenant_llm_provider || 'openrouter');
  const [byokKey, setByokKey] = useState('');
  const [byokSaved, setByokSaved] = useState(false);

  async function handleAddTool(e: React.FormEvent) {
    e.preventDefault();
    setToolErr('');
    try {
      await enterpriseApi.createTool({
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '_'),
        category,
        description,
        endpoint_url: endpointUrl,
        http_method: httpMethod,
      });
      setName('');
      setSlug('');
      setDescription('');
      setEndpointUrl('');
      await onRefresh();
    } catch (err: unknown) {
      setToolErr(err instanceof Error ? err.message : 'تعذر إنشاء الأداة');
    }
  }

  async function handleTestTool(t: ToolRecord) {
    setToolTestOutput('جاري التنفيذ الفعلي للأداة...');
    const sample =
      t.slug === 'python_eval'
        ? { expression: 'round((299 - 14.5) / 299 * 100, 2)' }
        : t.slug === 'web_search'
        ? { query: 'AI SaaS automation market' }
        : { input_text: 'اختبار اتصال' };
    try {
      const res = await enterpriseApi.testTool(t.id, sample);
      setToolTestOutput(`[${res.tool}] => ${res.result}`);
    } catch (err: unknown) {
      setToolTestOutput(err instanceof Error ? err.message : 'فشل الاختبار');
    }
  }

  async function handleCreateDevKey(e: React.FormEvent) {
    e.preventDefault();
    setKeyErr('');
    setNewlyGeneratedSecret('');
    try {
      const res = await enterpriseApi.createDeveloperKey(keyLabel);
      if (res.secret_key) setNewlyGeneratedSecret(res.secret_key);
      await onRefresh();
    } catch (err: unknown) {
      setKeyErr(err instanceof Error ? err.message : 'تعذر إصدار المفتاح');
    }
  }

  async function handleSaveByok(e: React.FormEvent) {
    e.preventDefault();
    await enterpriseApi.saveByok(byokProvider, byokKey);
    setByokKey('');
    setByokSaved(true);
    setTimeout(() => setByokSaved(false), 2000);
    await onRefresh();
  }

  const sampleAgentId = agents[0]?.id || 1;

  return (
    <section aria-labelledby="tools-api-heading">
      <header className="page-header">
        <div>
          <h1 id="tools-api-heading">ورشة الأدوات وبوابة المطورين (Tools & External API)</h1>
          <p>
            اربط وكلاءك بأي نظام خارجي عبر أدوات REST API مخصصة، واستخرج مفاتيح برمجية لاستدعاء وكلائك مباشرة من موقعك أو بوت واتساب الخاص بك.
          </p>
        </div>
      </header>

      <div className="split-2" style={{ marginBottom: '22px' }}>
        {/* Left: Custom REST Tool Builder & List */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <Wrench size={18} color="var(--emerald)" />
              سجل الأدوات الفعلية وإضافة REST API خاص
            </div>
          </div>

          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <form onSubmit={handleAddTool} style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
              {toolErr && <div style={{ color: 'var(--danger)', fontSize: '0.83rem' }}>{toolErr}</div>}
              <div className="form-grid-2">
                <input
                  type="text"
                  className="input"
                  placeholder="اسم الأداة (مثال: إنشاء طلب Shopify) *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <input
                  type="text"
                  className="input mono"
                  placeholder="slug_name (بالإنجليزية)"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
              </div>
              <div className="form-grid-2">
                <input
                  type="url"
                  className="input mono"
                  placeholder="https://api.yourdomain.com/webhook *"
                  value={endpointUrl}
                  onChange={(e) => setEndpointUrl(e.target.value)}
                  required
                />
                <select className="select mono" value={httpMethod} onChange={(e) => setHttpMethod(e.target.value)}>
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                </select>
              </div>
              <input
                type="text"
                className="input"
                placeholder="وصف دقيق ليفهم الوكيل متى يستدعي هذه الأداة *"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary">
                <Plus size={15} />
                تثبيت أداة الـ API في حسابي
              </button>
            </form>

            {toolTestOutput && (
              <div className="code-box" style={{ maxHeight: '140px' }}>
                {toolTestOutput}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tools.map((t) => (
                <div
                  key={t.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.86rem' }}>
                      {t.name}{' '}
                      <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--sky)' }}>
                        ({t.slug})
                      </span>
                    </div>
                    <div style={{ fontSize: '0.77rem', color: 'var(--text-secondary)' }}>{t.description}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button type="button" className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.76rem' }} onClick={() => handleTestTool(t)}>
                      <Play size={12} /> اختبار
                    </button>
                    {t.user_id !== null && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={async () => {
                          await enterpriseApi.deleteTool(t.id);
                          await onRefresh();
                        }}
                      >
                        <Trash2 size={14} color="var(--danger)" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Programmatic Developer API Keys + BYOK */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <Code2 size={18} color="var(--sky)" />
                مفاتيح الربط البرمجي الخارجي (Customer API Keys)
              </div>
            </div>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <form onSubmit={handleCreateDevKey} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="input"
                  value={keyLabel}
                  onChange={(e) => setKeyLabel(e.target.value)}
                  placeholder="اسم المفتاح..."
                />
                <button type="submit" className="btn btn-primary">
                  توليد مفتاح جديد
                </button>
              </form>

              {keyErr && <div style={{ color: 'var(--danger)', fontSize: '0.83rem' }}>{keyErr}</div>}

              {newlyGeneratedSecret && (
                <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--emerald-soft)', color: 'var(--emerald)', fontSize: '0.83rem' }}>
                  <div>احفظ هذا المفتاح السري الآن (يظهر مرة واحدة فقط):</div>
                  <div className="mono" style={{ fontWeight: 700, marginTop: '4px', wordBreak: 'break-all' }}>
                    {newlyGeneratedSecret}
                  </div>
                </div>
              )}

              {devKeys.map((k) => (
                <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.83rem', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div>
                    <strong>{k.label}</strong> — <span className="mono">{k.key_prefix}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={async () => {
                      await enterpriseApi.revokeDeveloperKey(k.id);
                      await onRefresh();
                    }}
                  >
                    <Trash2 size={14} color="var(--danger)" />
                  </button>
                </div>
              ))}

              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>مثال استدعاء وكيلك برمجياً من أي نظام خارجي:</div>
              <div className="code-box">{`curl -X POST "${window.location.origin}/api/v1/external/agents/${sampleAgentId}/run" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: sk_nexus_YOUR_KEY" \\
  -d '{"prompt": "نفذ المهمة المطلوبة وأعد النتيجة"}'`}</div>
            </div>
          </div>

          {allowByok && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  <KeyRound size={18} color="var(--amber)" />
                  ربط مفتاح الذكاء الاصطناعي الخاص بك (BYOK)
                </div>
              </div>
              <form onSubmit={handleSaveByok} className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  الحالة الحالية: {user.has_tenant_api_key ? <strong style={{ color: 'var(--emerald)' }}>مربوط بمفتاحك الخاص (لا يتم خصم نقاط من المحفظة)</strong> : 'يستخدم محرك المنصة المركزي بنظام النقاط'}
                </p>
                <div className="form-grid-2">
                  <select className="select" value={byokProvider} onChange={(e) => setByokProvider(e.target.value)}>
                    <option value="openrouter">OpenRouter</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="openai">OpenAI</option>
                  </select>
                  <input
                    type="password"
                    className="input mono"
                    placeholder="أدخل مفتاح الـ API الخاص بك..."
                    value={byokKey}
                    onChange={(e) => setByokKey(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-secondary">
                  {byokSaved ? '✓ تم حفظ مفتاحك' : 'حفظ مفتاح BYOK (أو اتركه فارغاً للإلغاء)'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

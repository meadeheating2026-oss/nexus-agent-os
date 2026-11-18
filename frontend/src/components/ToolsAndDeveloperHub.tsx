import React, { useState } from 'react';
import {
  Code2,
  Copy,
  KeyRound,
  Play,
  Plus,
  Terminal,
  Wrench,
} from 'lucide-react';
import { nexusEngine } from '../engine/nexusEngine';
import type { DeveloperKeyRecord, ToolRecord, UserProfile } from '../types';

interface Props {
  user: UserProfile;
  tools: ToolRecord[];
  devKeys: DeveloperKeyRecord[];
  onRefresh: () => Promise<void>;
  notify: (msg: string, isError?: boolean) => void;
}

export const ToolsAndDeveloperHub: React.FC<Props> = ({
  user,
  tools,
  devKeys,
  onRefresh,
  notify,
}) => {
  const [tab, setTab] = useState<'tools' | 'byok' | 'sdk'>('tools');

  // Tool Sandbox
  const [testSlug, setTestSlug] = useState('python_eval');
  const [testArg, setTestArg] = useState('(149 - 18.75) / 149 * 100');
  const [sandboxOut, setSandboxOut] = useState('');

  // Custom tool form
  const [ctName, setCtName] = useState('');
  const [ctSlug, setCtSlug] = useState('');
  const [ctUrl, setCtUrl] = useState('');
  const [ctMethod, setCtMethod] = useState('POST');
  const [ctDesc, setCtDesc] = useState('');

  // BYOK
  const [byokProv, setByokProv] = useState(user.tenant_llm_provider || 'gemini');
  const [byokKey, setByokKey] = useState('');

  // Dev keys
  const [keyLabel, setKeyLabel] = useState('Production Backend Key');
  const [sdkLang, setSdkLang] = useState<'curl' | 'python' | 'js'>('curl');

  async function runSandboxTest(e: React.FormEvent) {
    e.preventDefault();
    const args =
      testSlug === 'python_eval'
        ? { expression: testArg }
        : testSlug === 'memory_write'
          ? { key: 'sandbox_note', value: testArg }
          : { query: testArg };
    const out = await nexusEngine.testToolSandbox(testSlug, args);
    setSandboxOut(out);
  }

  async function handleCreateCustomTool(e: React.FormEvent) {
    e.preventDefault();
    try {
      await nexusEngine.addCustomTool({
        name: ctName,
        slug: ctSlug,
        endpoint_url: ctUrl,
        http_method: ctMethod,
        description: ctDesc,
      });
      await onRefresh();
      setCtName('');
      setCtSlug('');
      setCtUrl('');
      setCtDesc('');
      notify('تمت إضافة أداة الـ REST API المخصصة.');
    } catch (err) {
      notify((err as Error).message, true);
    }
  }

  const sampleKey = devKeys[0]?.full_once || 'sk_nexus_live_your_secret_key';
  const sdkSnippets = {
    curl: `curl -X POST https://api.nexus-os.io/api/v1/run \\
  -H "X-Nexus-Key: ${sampleKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "goal_prompt": "راجع بنود العقد واحسب صافي المخاطر المالية",
    "execution_mode": "swarm_sequential"
  }'`,
    python: `import requests

resp = requests.post(
    "https://api.nexus-os.io/api/v1/run",
    headers={"X-Nexus-Key": "${sampleKey}"},
    json={
        "goal_prompt": "احسب اقتصاديات الوحدة LTV/CAC للربع الرابع",
        "execution_mode": "standalone",
    },
    timeout=30,
)
print(resp.json()["final_output"])`,
    js: `const res = await fetch("https://api.nexus-os.io/api/v1/run", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Nexus-Key": "${sampleKey}",
  },
  body: JSON.stringify({
    goal_prompt: "فحص امتثال سياسة الخصوصية وفق PDPL",
    execution_mode: "standalone",
  }),
});
const data = await res.json();
console.log(data.final_output);`,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="nx-page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="nx-page-title">بوابة الأدوات، المفاتيح الخاصة BYOK، وحزمة المطورين SDK</h1>
          <p className="nx-page-subtitle">
            اختبر الأدوات المدمجة في بيئة معزولة، أضف REST APIs خاصة، أو استخرج مفاتيح ربط برمجية
          </p>
        </div>
      </div>

      <div className="seg-tabs" style={{ alignSelf: 'flex-start' }}>
        <button type="button" onClick={() => setTab('tools')} className={`seg-tab ${tab === 'tools' ? 'active' : ''}`}>
          <Wrench size={14} />
          <span>سجل الأدوات ومختبر الفحص ({tools.length})</span>
        </button>
        <button type="button" onClick={() => setTab('byok')} className={`seg-tab ${tab === 'byok' ? 'active' : ''}`}>
          <KeyRound size={14} />
          <span>مفتاح النماذج الخاص (BYOK)</span>
        </button>
        <button type="button" onClick={() => setTab('sdk')} className={`seg-tab ${tab === 'sdk' ? 'active' : ''}`}>
          <Code2 size={14} />
          <span>مفاتيح المطورين و SDK ({devKeys.length})</span>
        </button>
      </div>

      {tab === 'tools' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="grid-2">
            {/* Live Tool Sandbox */}
            <div className="nx-card">
              <div style={{ fontWeight: 700, marginBottom: 12 }}>
                <Terminal size={15} style={{ verticalAlign: 'middle', marginInlineEnd: 6, color: 'var(--brand)' }} />
                مختبر تجربة الأدوات الفوري (Interactive Tool Sandbox)
              </div>
              <form onSubmit={runSandboxTest} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                <div>
                  <label className="nx-label">اختر الأداة المراد فحصها</label>
                  <select
                    className="nx-select"
                    value={testSlug}
                    onChange={(e) => {
                      const v = e.target.value;
                      setTestSlug(v);
                      if (v === 'python_eval') setTestArg('(399 - 75) / 399 * 100');
                      else if (v === 'kb_search') setTestArg('سقف المسؤولية والاسترداد');
                      else setTestArg('مؤشرات أداء SaaS');
                    }}
                  >
                    <option value="python_eval">python_eval — المحرك الحسابي الآمن</option>
                    <option value="kb_search">kb_search — البحث في قاعدة المعرفة RAG</option>
                    <option value="memory_read">memory_read — قراءة ذاكرة الوكيل</option>
                    <option value="web_search">web_search — بحث الويب</option>
                  </select>
                </div>
                <div>
                  <label className="nx-label">المعامل المدخل (Expression / Query)</label>
                  <input
                    className="nx-input mono"
                    dir="ltr"
                    value={testArg}
                    onChange={(e) => setTestArg(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  <Play size={14} />
                  <span>تشغيل الأداة وعرض الناتج</span>
                </button>
              </form>

              {sandboxOut && (
                <pre className="code-block" style={{ marginTop: 12 }}>
                  {sandboxOut}
                </pre>
              )}
            </div>

            {/* Custom HTTP Tool Form */}
            <div className="nx-card">
              <div style={{ fontWeight: 700, marginBottom: 12 }}>
                <Plus size={15} style={{ verticalAlign: 'middle', marginInlineEnd: 6 }} />
                ربط أداة HTTP REST API مخصصة لوكلائك
              </div>
              <form onSubmit={handleCreateCustomTool} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="grid-2">
                  <div>
                    <label className="nx-label">اسم الأداة</label>
                    <input
                      className="nx-input"
                      required
                      value={ctName}
                      onChange={(e) => setCtName(e.target.value)}
                      placeholder="فحص مخزون المستودع"
                    />
                  </div>
                  <div>
                    <label className="nx-label">المعرّف البرمجي (Slug)</label>
                    <input
                      className="nx-input mono"
                      dir="ltr"
                      required
                      value={ctSlug}
                      onChange={(e) => setCtSlug(e.target.value)}
                      placeholder="erp_stock_check"
                    />
                  </div>
                </div>
                <div className="grid-2">
                  <div>
                    <label className="nx-label">Endpoint URL</label>
                    <input
                      className="nx-input mono"
                      dir="ltr"
                      required
                      value={ctUrl}
                      onChange={(e) => setCtUrl(e.target.value)}
                      placeholder="https://api.company.com/stock"
                    />
                  </div>
                  <div>
                    <label className="nx-label">HTTP Method</label>
                    <select className="nx-select" value={ctMethod} onChange={(e) => setCtMethod(e.target.value)}>
                      <option value="POST">POST</option>
                      <option value="GET">GET</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="nx-label">متى يستدعيها الوكيل؟</label>
                  <input
                    className="nx-input"
                    required
                    value={ctDesc}
                    onChange={(e) => setCtDesc(e.target.value)}
                    placeholder="تُستدعى للتحقق من الكمية المتوفرة لأي منتج بالـ SKU"
                  />
                </div>
                <button type="submit" className="btn">
                  حفظ الأداة في السجل
                </button>
              </form>
            </div>
          </div>

          <div className="grid-3">
            {tools.map((t) => (
              <div key={t.slug} className="nx-card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="nx-badge nx-badge-brand mono">{t.slug}</span>
                  <span className="nx-badge">{t.category}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 4 }}>{t.name}</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{t.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'byok' && (
        <div className="nx-card" style={{ maxWidth: 640 }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>
            خزنة المفتاح الخاص للمستأجر (Bring Your Own Key — BYOK)
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 0, marginBottom: 16 }}>
            عند ربط مفتاحك المباشر من Google AI Studio أو OpenRouter أو OpenAI، يتم تشغيل وكلائك عبر حسابك مباشرة{' '}
            <strong>دون خصم نقاط استهلاك</strong> من محفظتك.
          </p>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await nexusEngine.saveByok(byokProv, byokKey);
              await onRefresh();
              notify('تم حفظ مفتاحك الخاص وتفعيله على كافة وكلائك.');
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 13 }}
          >
            <div>
              <label className="nx-label">مزود النماذج</label>
              <select className="nx-select" value={byokProv} onChange={(e) => setByokProv(e.target.value)}>
                <option value="gemini">Google Gemini API (AIza...)</option>
                <option value="openrouter">OpenRouter Unified API (sk-or-...)</option>
                <option value="openai">OpenAI Official API (sk-...)</option>
              </select>
            </div>
            <div>
              <label className="nx-label">مفتاح الـ API السري</label>
              <input
                type="password"
                dir="ltr"
                className="nx-input mono"
                value={byokKey}
                onChange={(e) => setByokKey(e.target.value)}
                placeholder="AIzaSy... أو sk-or-v1-..."
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary">
                حفظ وتفعيل المفتاح
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await nexusEngine.testLiveLlmKey(byokProv, byokKey);
                    notify(res);
                  } catch (err) {
                    notify((err as Error).message, true);
                  }
                }}
                className="btn"
              >
                اختبار الاتصال المباشر
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === 'sdk' && (
        <div className="grid-2">
          <div className="nx-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontWeight: 700 }}>توليد مفاتيح الربط البرمجي (sk_nexus_...)</div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const created = await nexusEngine.createDeveloperKey(keyLabel);
                  await onRefresh();
                  notify(`تم إصدار المفتاح بنجاح: ${created.full_once || created.key_prefix}`);
                } catch (err) {
                  notify((err as Error).message, true);
                }
              }}
              style={{ display: 'flex', gap: 8 }}
            >
              <input
                className="nx-input"
                value={keyLabel}
                onChange={(e) => setKeyLabel(e.target.value)}
                placeholder="اسم التطبيق أو الخادم"
              />
              <button type="submit" className="btn btn-primary">
                إصدار مفتاح جديد
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
              {devKeys.map((k) => (
                <div
                  key={k.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{k.label}</div>
                    <div className="mono" style={{ fontSize: '0.74rem', color: 'var(--brand)' }} dir="ltr">
                      {k.full_once || k.key_prefix}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(k.full_once || k.key_prefix);
                      notify('تم نسخ المفتاح.');
                    }}
                    className="btn btn-sm"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="nx-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 700 }}>أكواد التكامل الفوري (Developer SDK)</div>
              <div className="seg-tabs">
                <button type="button" onClick={() => setSdkLang('curl')} className={`seg-tab ${sdkLang === 'curl' ? 'active' : ''}`}>
                  cURL
                </button>
                <button type="button" onClick={() => setSdkLang('python')} className={`seg-tab ${sdkLang === 'python' ? 'active' : ''}`}>
                  Python
                </button>
                <button type="button" onClick={() => setSdkLang('js')} className={`seg-tab ${sdkLang === 'js' ? 'active' : ''}`}>
                  Node / JS
                </button>
              </div>
            </div>

            <pre className="code-block">{sdkSnippets[sdkLang]}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Play, Plus, Trash2, Wrench, X } from 'lucide-react';
import { api } from '../api';
import type { ToolItem } from '../types';

interface Props {
  tools: ToolItem[];
  onRefresh: () => Promise<void>;
}

export const ToolRegistryView: React.FC<Props> = ({ tools, onRefresh }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [execType, setExecType] = useState<'http_api' | 'webhook' | 'data_template'>('http_api');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [httpMethod, setHttpMethod] = useState('POST');
  const [payloadTemplate, setPayloadTemplate] = useState('{"query": "{{input}}", "agent": "{{agent}}"}');
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ toolName: string; summary: string; raw: string } | null>(null);

  async function handleCreateTool(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !description.trim()) return;
    setSaving(true);
    try {
      await api.createTool({
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '_'),
        category: category || 'أدوات مخصصة',
        description,
        execution_type: execType,
        endpoint_url: endpointUrl,
        http_method: httpMethod,
        payload_template: payloadTemplate,
      });
      await onRefresh();
      setShowCreate(false);
      setName('');
      setSlug('');
      setCategory('');
      setDescription('');
      setEndpointUrl('');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestTool(tool: ToolItem) {
    const res = await api.testTool(tool.id, 'اختبار تشغيلي مباشر للأداة من مخزن النظام');
    setTestResult({
      toolName: tool.name,
      summary: res.output_summary,
      raw: res.raw_data,
    });
  }

  async function handleDelete(tool: ToolItem) {
    if (tool.is_builtin) return;
    await api.deleteTool(tool.id);
    await onRefresh();
  }

  return (
    <section aria-labelledby="tool-registry-heading">
      <header className="page-header">
        <div>
          <h1 id="tool-registry-heading">مخزن ومنشئ الأدوات القابلة للتثبيت (Tool Registry)</h1>
          <p>
            الأدوات هي عضلات الوكيل التي تمكّنه من العمل 100% ذاتياً. ركّب الأدوات المدمجة أو أنشئ أداة جديدة مرتبطة بأي موقع أو API لأي مجال جديد في ثوانٍ.
          </p>
        </div>
        <div className="header-actions">
          <button
            id="btn-open-new-tool"
            type="button"
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={16} />
            إضافة أداة مخصصة جديدة
          </button>
        </div>
      </header>

      {testResult && (
        <div className="panel" style={{ marginBottom: '20px' }}>
          <div className="panel-header">
            <div className="panel-title">نتيجة الفحص الحي للأداة: {testResult.toolName}</div>
            <button
              id="btn-close-tool-test"
              type="button"
              className="btn btn-ghost"
              onClick={() => setTestResult(null)}
            >
              <X size={16} />
            </button>
          </div>
          <div className="panel-body">
            <div style={{ color: 'var(--emerald)', fontWeight: 600, marginBottom: '6px' }}>
              {testResult.summary}
            </div>
            {testResult.raw && (
              <div className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                {testResult.raw}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="agent-grid">
        {tools.map((tool) => (
          <article key={tool.id} className="agent-row-card">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className={`tag ${tool.is_builtin ? 'tag-emerald' : 'tag-amber'}`}>
                  {tool.category}
                </span>
                <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {tool.slug}
                </span>
              </div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>{tool.name}</h2>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>{tool.description}</p>
              {tool.endpoint_url && (
                <div className="mono" style={{ fontSize: '0.74rem', color: 'var(--sky)', marginTop: '8px', wordBreak: 'break-all' }}>
                  {tool.http_method} {tool.endpoint_url}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                id={`test-tool-${tool.id}`}
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                onClick={() => handleTestTool(tool)}
              >
                <Play size={13} />
                اختبار الأداة
              </button>

              {!tool.is_builtin ? (
                <button
                  id={`delete-tool-${tool.id}`}
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => handleDelete(tool)}
                >
                  <Trash2 size={15} color="var(--danger)" />
                </button>
              ) : (
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>مدمجة بنواة النظام</span>
              )}
            </div>
          </article>
        ))}
      </div>

      {showCreate && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="new-tool-modal-title">
          <div className="modal-sheet">
            <div className="panel-header">
              <div className="panel-title" id="new-tool-modal-title">
                <Wrench size={18} color="var(--emerald)" />
                إنشاء أداة جديدة قابلة للتركيب لأي وكيل
              </div>
              <button
                id="close-new-tool-modal"
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowCreate(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateTool} className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-grid-2">
                <div className="field-group">
                  <label className="field-label" htmlFor="tool-name-input">اسم الأداة *</label>
                  <input
                    id="tool-name-input"
                    type="text"
                    className="input"
                    placeholder="مثال: نشر مقال ووردبريس / فحص أسعار منصة مزادات"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="field-group">
                  <label className="field-label" htmlFor="tool-cat-input">تصنيف / مجال الأداة</label>
                  <input
                    id="tool-cat-input"
                    type="text"
                    className="input"
                    placeholder="مثال: عقارات، تجارة إلكترونية، واتساب..."
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="field-group">
                  <label className="field-label" htmlFor="tool-slug-input">المعرّف البرمجي (Slug بالإنجليزية)</label>
                  <input
                    id="tool-slug-input"
                    type="text"
                    className="input mono"
                    placeholder="custom_crm_connector"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                  />
                </div>
                <div className="field-group">
                  <label className="field-label" htmlFor="tool-type-select">نوع التنفيذ</label>
                  <select
                    id="tool-type-select"
                    className="select"
                    value={execType}
                    onChange={(e) => setExecType(e.target.value as 'http_api' | 'webhook' | 'data_template')}
                  >
                    <option value="http_api">اتصال REST API مباشر</option>
                    <option value="webhook">إرسال Webhook أوتوماتيكي (Zapier / Make / n8n)</option>
                    <option value="data_template">قالب معالجة بيانات مخصص</option>
                  </select>
                </div>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="tool-desc-input">وصف وظيفة الأداة (يفهم منه الوكيل متى يستخدمها) *</label>
                <input
                  id="tool-desc-input"
                  type="text"
                  className="input"
                  placeholder="اشرح ماذا تفعل الأداة وما البيانات التي تعيدها..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              {execType !== 'data_template' && (
                <div className="form-grid-2">
                  <div className="field-group">
                    <label className="field-label" htmlFor="tool-url-input">رابط الـ API أو الـ Webhook (اختياري الآن)</label>
                    <input
                      id="tool-url-input"
                      type="url"
                      className="input mono"
                      placeholder="https://api.example.com/v1/action"
                      value={endpointUrl}
                      onChange={(e) => setEndpointUrl(e.target.value)}
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label" htmlFor="tool-method-select">HTTP Method</label>
                    <select
                      id="tool-method-select"
                      className="select mono"
                      value={httpMethod}
                      onChange={(e) => setHttpMethod(e.target.value)}
                    >
                      <option value="POST">POST</option>
                      <option value="GET">GET</option>
                      <option value="PUT">PUT</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="field-group">
                <label className="field-label" htmlFor="tool-template-textarea">
                  قالب الحمولة المرسلة (يدعم المتغيرات {'{{input}}'} و {'{{agent}}'})
                </label>
                <textarea
                  id="tool-template-textarea"
                  className="textarea mono"
                  style={{ minHeight: '80px', fontSize: '0.82rem' }}
                  value={payloadTemplate}
                  onChange={(e) => setPayloadTemplate(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  id="cancel-new-tool"
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreate(false)}
                >
                  إلغاء
                </button>
                <button
                  id="submit-new-tool"
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'جاري الإضافة...' : 'تثبيت الأداة في مخزن النظام'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

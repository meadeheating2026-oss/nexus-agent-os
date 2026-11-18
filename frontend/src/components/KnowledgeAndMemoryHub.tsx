import React, { useRef, useState } from 'react';
import {
  BookOpen,
  Database,
  FileUp,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { nexusEngine } from '../engine/nexusEngine';
import type { AgentMemoryRecord, AgentRecord, KnowledgeDoc, KnowledgeMatch } from '../types';

interface Props {
  docs: KnowledgeDoc[];
  memories: AgentMemoryRecord[];
  agents: AgentRecord[];
  onRefresh: () => Promise<void>;
  notify: (msg: string, isError?: boolean) => void;
}

export const KnowledgeAndMemoryHub: React.FC<Props> = ({
  docs,
  memories,
  agents,
  onRefresh,
  notify,
}) => {
  const [subTab, setSubTab] = useState<'docs' | 'rag_test' | 'memories'>('docs');

  // Add document state
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('سياسات الشركة');
  const [content, setContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // RAG search tester
  const [ragQuery, setRagQuery] = useState('ما سياسة الاسترداد وسقف المسؤولية التعاقدية وهامش الربح؟');
  const [ragMatches, setRagMatches] = useState<KnowledgeMatch[]>([]);
  const [searching, setSearching] = useState(false);

  // Add memory state
  const [memAgentId, setMemAgentId] = useState<number>(agents[0]?.id || 0);
  const [memKey, setMemKey] = useState('');
  const [memVal, setMemVal] = useState('');

  function handleUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const txt = String(reader.result || '');
      await nexusEngine.addKnowledgeDoc({
        title: file.name,
        category: 'ملفات مرفوعة',
        source_type: 'file',
        content: txt,
      });
      await onRefresh();
      notify(`تمت فهرسة الملف "${file.name}" وتقسيمه إلى مقاطع دلالية بنجاح.`);
    };
    reader.readAsText(file);
  }

  async function handleSaveDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    await nexusEngine.addKnowledgeDoc({
      title,
      category,
      source_type: 'text',
      content,
    });
    await onRefresh();
    setShowAddDoc(false);
    setTitle('');
    setContent('');
    notify('تمت إضافة الوثيقة إلى قاعدة المعرفة المؤسسية.');
  }

  async function handleRunRagSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!ragQuery.trim()) return;
    setSearching(true);
    try {
      const hits = await nexusEngine.searchKnowledge(ragQuery, 5);
      setRagMatches(hits);
    } finally {
      setSearching(false);
    }
  }

  async function handleSaveMemory(e: React.FormEvent) {
    e.preventDefault();
    const targetId = memAgentId || agents[0]?.id || 0;
    if (!targetId || !memKey.trim() || !memVal.trim()) return;
    await nexusEngine.upsertMemory(targetId, memKey, memVal);
    await onRefresh();
    setMemKey('');
    setMemVal('');
    notify('تم حفظ السجل في الذاكرة الدائمة للوكيل.');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="nx-page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="nx-page-title">قاعدة المعرفة المؤسسية والذاكرة الدائمة (RAG & Memory Hub)</h1>
          <p className="nx-page-subtitle">
            ارفع وثائق وسياسات شركتك ليعتمد عليها كافة الوكلاء تلقائياً مع فاحص استرجاع دلالي مباشر
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.csv,.json"
            style={{ display: 'none' }}
            onChange={handleUploadFile}
          />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="btn">
            <FileUp size={15} />
            <span>رفع ملف (.txt / .md / .csv / .json)</span>
          </button>
          <button type="button" onClick={() => setShowAddDoc(true)} className="btn btn-primary">
            <Plus size={15} />
            <span>إضافة وثيقة نصية</span>
          </button>
        </div>
      </div>

      <div className="seg-tabs" style={{ alignSelf: 'flex-start' }}>
        <button type="button" onClick={() => setSubTab('docs')} className={`seg-tab ${subTab === 'docs' ? 'active' : ''}`}>
          <BookOpen size={14} />
          <span>الوثائق المفهرسة ({docs.length})</span>
        </button>
        <button type="button" onClick={() => setSubTab('rag_test')} className={`seg-tab ${subTab === 'rag_test' ? 'active' : ''}`}>
          <Search size={14} />
          <span>مختبر البحث الدلالي الحي (RAG Tester)</span>
        </button>
        <button type="button" onClick={() => setSubTab('memories')} className={`seg-tab ${subTab === 'memories' ? 'active' : ''}`}>
          <Database size={14} />
          <span>ذاكرة الوكلاء الدائمة ({memories.length})</span>
        </button>
      </div>

      {subTab === 'docs' && (
        <div className="grid-3">
          {docs.map((doc) => (
            <div key={doc.id} className="nx-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span className="nx-badge nx-badge-cyan">{doc.category}</span>
                  <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {doc.chunks_json?.length || 1} مقاطع • {doc.word_count} كلمة
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.94rem', marginBottom: 8 }}>{doc.title}</div>
                <div
                  style={{
                    fontSize: '0.77rem',
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    maxHeight: 140,
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {doc.content.slice(0, 360)}...
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
                <span className="mono" style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>
                  المصدر: {doc.source_type.toUpperCase()}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await nexusEngine.deleteKnowledgeDoc(doc.id);
                    await onRefresh();
                    notify('تم حذف الوثيقة من الفهرس.');
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

      {subTab === 'rag_test' && (
        <div className="nx-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <form onSubmit={handleRunRagSearch} style={{ display: 'flex', gap: 10 }}>
            <input
              className="nx-input"
              value={ragQuery}
              onChange={(e) => setRagQuery(e.target.value)}
              placeholder="اكتب سؤالاً لاختبار المقاطع التي يسترجعها الوكيل من وثائق شركتك..."
            />
            <button type="submit" disabled={searching} className="btn btn-primary">
              <Sparkles size={14} />
              <span>{searching ? 'جارٍ البحث...' : 'فحص الاسترجاع الدلالي'}</span>
            </button>
          </form>

          {ragMatches.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ragMatches.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <strong style={{ fontSize: '0.84rem' }}>
                      📄 {m.doc_title} (مقطع #{m.chunk_index})
                    </strong>
                    <span className="nx-badge nx-badge-brand mono">تطابق {Math.round(m.score * 100)}%</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                    {m.excerpt}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === 'memories' && (
        <div className="grid-2">
          <div className="nx-card">
            <div style={{ fontWeight: 700, marginBottom: 12 }}>إضافة حقيقة / قيد في ذاكرة الوكيل الدائمة</div>
            <form onSubmit={handleSaveMemory} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div>
                <label className="nx-label">الوكيل المستهدف</label>
                <select
                  className="nx-select"
                  value={memAgentId}
                  onChange={(e) => setMemAgentId(Number(e.target.value))}
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="nx-label">مفتاح المعلومة (Key)</label>
                <input
                  className="nx-input mono"
                  dir="ltr"
                  required
                  value={memKey}
                  onChange={(e) => setMemKey(e.target.value)}
                  placeholder="approved_discount_ceiling"
                />
              </div>
              <div>
                <label className="nx-label">القيمة التفصيلية المحفوظة</label>
                <textarea
                  className="nx-textarea"
                  required
                  value={memVal}
                  onChange={(e) => setMemVal(e.target.value)}
                  placeholder="الحد الأقصى للخصم المسموح لفريق المبيعات دون تصعيد هو 15%."
                />
              </div>
              <button type="submit" className="btn btn-primary">
                حفظ في الذاكرة المستديمة
              </button>
            </form>
          </div>

          <div className="nx-card">
            <div style={{ fontWeight: 700, marginBottom: 12 }}>سجل الذاكرة الدائمة للوكلاء ({memories.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {memories.map((mem) => (
                <div
                  key={mem.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span className="mono" style={{ fontWeight: 700, color: 'var(--brand)', fontSize: '0.78rem' }}>
                      {mem.mem_key}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        await nexusEngine.deleteMemory(mem.id);
                        await onRefresh();
                      }}
                      className="btn btn-ghost btn-sm"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div style={{ fontSize: '0.8rem', marginBottom: 3 }}>{mem.mem_value}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{mem.agent_name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showAddDoc && (
        <div className="nx-modal-backdrop" onClick={() => setShowAddDoc(false)}>
          <div className="nx-modal" onClick={(e) => e.stopPropagation()}>
            <div className="nx-card-header">
              <div style={{ fontWeight: 700 }}>إضافة وثيقة مرجعية جديدة إلى قاعدة المعرفة</div>
              <button type="button" onClick={() => setShowAddDoc(false)} className="btn btn-ghost btn-sm">
                إغلاق
              </button>
            </div>
            <form onSubmit={handleSaveDoc} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="grid-2">
                <div>
                  <label className="nx-label">عنوان الوثيقة</label>
                  <input
                    className="nx-input"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: لائحة الموارد البشرية والعمل المرن"
                  />
                </div>
                <div>
                  <label className="nx-label">التصنيف</label>
                  <input
                    className="nx-input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="nx-label">نص الوثيقة الكامل (سيتم تقسيمه تلقائياً لمقاطع RAG)</label>
                <textarea
                  className="nx-textarea"
                  style={{ minHeight: 180 }}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="الصق بنود اللائحة أو السياسة أو دليل المنتجات هنا..."
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => setShowAddDoc(false)} className="btn">
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  فهرسة وحفظ الوثيقة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

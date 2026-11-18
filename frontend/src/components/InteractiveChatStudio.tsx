import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Bot,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FileText,
  Layers,
  Paperclip,
  Plus,
  Printer,
  Send,
  Trash2,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { nexusEngine } from '../engine/nexusEngine';
import type { AgentRecord, ChatArtifact, ChatMessage, ChatThread } from '../types';

interface Props {
  agents: AgentRecord[];
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
  onWorkspaceRefresh: () => Promise<void>;
  notify: (msg: string, isError?: boolean) => void;
}

export const InteractiveChatStudio: React.FC<Props> = ({
  agents,
  initialPrompt,
  onClearInitialPrompt,
  onWorkspaceRefresh,
  notify,
}) => {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  // Thread creation modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMode, setNewMode] = useState<'single' | 'council'>('single');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [useKb, setUseKb] = useState(true);

  // Attachment state
  const [attachName, setAttachName] = useState('');
  const [attachText, setAttachText] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Side Artifact Canvas & Expanded trace
  const [activeArtifact, setActiveArtifact] = useState<ChatArtifact | null>(null);
  const [openStepMsgId, setOpenStepMsgId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const list = await nexusEngine.listChatThreads();
      setThreads(list);
      if (list.length > 0) {
        setActiveThreadId(list[0].id);
      } else if (agents[0]) {
        const created = await nexusEngine.createChatThread({
          title: 'جلسة حوار تنفيذية',
          agent_ids: [agents[0].id],
          mode: 'single',
          use_kb: true,
        });
        setThreads([created]);
        setActiveThreadId(created.id);
      }
    })();
  }, [agents]);

  useEffect(() => {
    if (!activeThreadId) return;
    (async () => {
      const msgs = await nexusEngine.listChatMessages(activeThreadId);
      setMessages(msgs);
      const lastWithArt = [...msgs].reverse().find((m) => m.artifacts_json && m.artifacts_json.length > 0);
      setActiveArtifact(lastWithArt ? lastWithArt.artifacts_json[0] : null);
    })();
  }, [activeThreadId]);

  useEffect(() => {
    if (initialPrompt) {
      setDraft(initialPrompt);
      onClearInitialPrompt?.();
    }
  }, [initialPrompt, onClearInitialPrompt]);

  async function handleCreateThread(e: React.FormEvent) {
    e.preventDefault();
    const ids = selectedIds.length > 0 ? selectedIds : agents[0] ? [agents[0].id] : [];
    const created = await nexusEngine.createChatThread({
      title: newTitle || (newMode === 'council' ? 'مجلس استشاري متعدد الوكلاء' : 'جلسة حوار متخصصة'),
      agent_ids: ids,
      mode: newMode,
      use_kb: useKb,
    });
    setThreads((prev) => [created, ...prev]);
    setActiveThreadId(created.id);
    setMessages([]);
    setActiveArtifact(null);
    setShowNewModal(false);
    setNewTitle('');
    notify('تم فتح جلسة حوار جديدة.');
  }

  async function handleDeleteThread(id: number) {
    await nexusEngine.deleteChatThread(id);
    const remaining = threads.filter((t) => t.id !== id);
    setThreads(remaining);
    setActiveThreadId(remaining[0]?.id || null);
    if (remaining.length === 0) setMessages([]);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAttachName(file.name);
      setAttachText(String(reader.result || '').slice(0, 12000));
      notify(`تم إرفاق الملف "${file.name}" للتحليل ضمن الجلسة.`);
    };
    reader.readAsText(file);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !activeThreadId || sending) return;
    const promptText = draft.trim();
    setDraft('');
    setSending(true);
    try {
      const botMsg = await nexusEngine.sendChatMessage(activeThreadId, promptText, attachName, attachText);
      setAttachName('');
      setAttachText('');
      const updatedMsgs = await nexusEngine.listChatMessages(activeThreadId);
      setMessages(updatedMsgs);
      if (botMsg.artifacts_json && botMsg.artifacts_json[0]) {
        setActiveArtifact(botMsg.artifacts_json[0]);
      }
      const updatedThreads = await nexusEngine.listChatThreads();
      setThreads(updatedThreads);
      await onWorkspaceRefresh();
    } catch (err) {
      notify((err as Error).message, true);
      setDraft(promptText);
    } finally {
      setSending(false);
    }
  }

  function downloadFile(filename: string, content: string, mime = 'text/markdown;charset=utf-8') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printReport(art: ChatArtifact) {
    const win = window.open('', '_blank', 'width=860,height=720');
    if (!win) return;
    win.document.write(`
      <html lang="ar" dir="rtl">
        <head>
          <title>${art.title}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 36px; line-height: 1.75; color: #0f172a; }
            h1 { border-bottom: 2px solid #059669; padding-bottom: 10px; font-size: 22px; }
            pre { background: #f8fafc; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; white-space: pre-wrap; font-family: inherit; }
          </style>
        </head>
        <body>
          <h1>${art.title} — Nexus AgentOS Enterprise</h1>
          <pre>${art.content.replace(/</g, '&lt;')}</pre>
          <script>window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  }

  const activeThread = threads.find((t) => t.id === activeThreadId);

  return (
    <div>
      <div className="nx-page-header" style={{ marginBottom: 14 }}>
        <div>
          <h1 className="nx-page-title">استوديو المحادثة التفاعلية ولوحة المخرجات (Chat & Artifacts Canvas)</h1>
          <p className="nx-page-subtitle">
            حوار مستمر متعدد الأدوار مع ربط وثائق RAG، إرفاق ملفات، وتتبع خطوات الأدوات وتصدير التقارير
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedIds(agents[0] ? [agents[0].id] : []);
            setShowNewModal(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={15} />
          <span>جلسة جديدة (فردي أو مجلس خبراء)</span>
        </button>
      </div>

      <div className={`chat-layout ${activeArtifact ? '' : 'no-canvas'}`}>
        {/* Right Panel: Threads List */}
        <div className="chat-panel">
          <div
            style={{
              padding: '12px 14px',
              borderBottom: '1px solid var(--border-subtle)',
              fontWeight: 700,
              fontSize: '0.83rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>سجل الجلسات ({threads.length})</span>
            <Layers size={15} style={{ color: 'var(--text-muted)' }} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {threads.map((t) => (
              <div
                key={t.id}
                onClick={() => setActiveThreadId(t.id)}
                style={{
                  padding: '9px 10px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: t.id === activeThreadId ? 'var(--brand-soft)' : 'transparent',
                  border: `1px solid ${t.id === activeThreadId ? 'hsla(160,84%,39%,0.25)' : 'transparent'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 6,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '0.81rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {t.title}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', gap: 6, marginTop: 2 }}>
                    <span>{t.mode === 'council' ? 'مجلس خبراء' : 'وكيل متخصص'}</span>
                    {t.use_kb && <span>• RAG</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    handleDeleteThread(t.id);
                  }}
                  className="btn btn-ghost btn-sm"
                  style={{ padding: 4 }}
                  title="حذف الجلسة"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Center Panel: Multi-turn Conversation */}
        <div className="chat-panel">
          {/* Conversation Topbar */}
          <div
            style={{
              padding: '11px 16px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bot size={17} style={{ color: 'var(--brand)' }} />
              <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{activeThread?.title || 'اختر جلسة'}</span>
              {activeThread?.use_kb && (
                <span className="nx-badge nx-badge-cyan">
                  <BookOpen size={11} />
                  مربوط بقاعدة المعرفة RAG
                </span>
              )}
            </div>
            {activeThread?.mode === 'council' && (
              <span className="nx-badge nx-badge-brand">
                <Users size={12} />
                مجلس متعدد الوكلاء
              </span>
            )}
          </div>

          {/* Messages Feed */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {messages.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 420, color: 'var(--text-secondary)' }}>
                <Bot size={32} style={{ color: 'var(--brand)', marginBottom: 8 }} />
                <div style={{ fontWeight: 700, marginBottom: 4 }}>ابدأ الحوار مع فريقك الذكي</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  اطرح سؤالك أو أرفق ملف بيانات (.txt, .csv, .md, .json) ليقوم الوكيل بفحص قاعدة المعرفة وإجراء الحسابات وتوليد التقرير.
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                      fontSize: '0.74rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <strong style={{ color: m.role === 'user' ? 'var(--brand)' : 'var(--text-primary)' }}>
                      {m.sender_name}
                    </strong>
                    {m.tokens_used > 0 && (
                      <span className="mono">
                        {m.tokens_used} tok {m.credits_charged > 0 ? `• ${m.credits_charged} cr` : ''}
                      </span>
                    )}
                  </div>

                  {/* Tool Steps Accordion */}
                  {m.steps_json && m.steps_json.filter((s) => s.step_kind === 'tool_call').length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <button
                        type="button"
                        onClick={() => setOpenStepMsgId(openStepMsgId === m.id ? null : m.id)}
                        className="btn btn-sm"
                        style={{ fontSize: '0.73rem', background: 'var(--bg-surface)' }}
                      >
                        <Wrench size={12} style={{ color: 'var(--brand)' }} />
                        <span>
                          تم استدعاء {m.steps_json.filter((s) => s.step_kind === 'tool_call').length} أدوات فعلية (RAG / Python)
                        </span>
                        {openStepMsgId === m.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>

                      {openStepMsgId === m.id && (
                        <div
                          style={{
                            marginTop: 8,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                            padding: 10,
                            borderRadius: 8,
                            background: 'var(--bg-canvas)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          {m.steps_json
                            .filter((s) => s.step_kind === 'tool_call')
                            .map((st, idx) => (
                              <div key={idx} style={{ fontSize: '0.74rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                  <span className="mono" style={{ color: 'var(--brand)' }}>
                                    ⚡ {st.tool_name} ({st.agent_name})
                                  </span>
                                  <span className="mono" style={{ color: 'var(--text-muted)' }}>
                                    {st.duration_ms}ms
                                  </span>
                                </div>
                                <div className="mono" style={{ color: 'var(--text-secondary)', fontSize: '0.71rem', marginTop: 2 }}>
                                  {st.output_payload}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="md-prose">{m.content}</div>

                  {m.artifacts_json && m.artifacts_json.length > 0 && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {m.artifacts_json.map((art) => (
                        <button
                          key={art.id}
                          type="button"
                          onClick={() => setActiveArtifact(art)}
                          className="btn btn-sm"
                        >
                          <FileText size={13} style={{ color: 'var(--brand)' }} />
                          <span>فتح في لوحة التقارير: {art.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}

            {sending && (
              <div className="chat-bubble-bot" style={{ color: 'var(--text-secondary)', fontSize: '0.83rem' }}>
                جارٍ استرجاع سياق المعرفة وتشغيل الأدوات وصياغة الرد التنفيذي...
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={handleSend}
            style={{
              padding: 12,
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-sidebar)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {attachName && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: 'var(--brand-soft)',
                  color: 'var(--brand)',
                  fontSize: '0.75rem',
                  alignSelf: 'flex-start',
                }}
              >
                <Paperclip size={13} />
                <span>{attachName}</span>
                <button
                  type="button"
                  onClick={() => {
                    setAttachName('');
                    setAttachText('');
                  }}
                  style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
                >
                  <X size={13} />
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.csv,.json,.log"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="btn"
                title="إرفاق ملف نصي أو جدول CSV/JSON للتحليل"
              >
                <Paperclip size={16} />
              </button>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                placeholder="اكتب طلبك التحليلي أو القانوني أو البرمجي هنا... (اضغط Enter للإرسال)"
                className="nx-textarea"
                style={{ minHeight: 46, maxHeight: 130, padding: '10px 12px' }}
              />
              <button type="submit" disabled={sending || !draft.trim()} className="btn btn-primary" style={{ height: 46 }}>
                <Send size={15} />
                <span>إرسال</span>
              </button>
            </div>
          </form>
        </div>

        {/* Left Panel: Artifacts & Export Canvas */}
        {activeArtifact && (
          <div className="chat-panel">
            <div
              style={{
                padding: '11px 14px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                📄 {activeArtifact.title}
              </div>
              <button type="button" onClick={() => setActiveArtifact(null)} className="btn btn-ghost btn-sm" style={{ padding: 4 }}>
                <X size={14} />
              </button>
            </div>

            <div
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                background: 'var(--bg-elevated)',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(activeArtifact.content);
                  notify('تم نسخ التقرير إلى الحافظة.');
                }}
                className="btn btn-sm"
              >
                <Copy size={12} />
                <span>نسخ</span>
              </button>
              <button
                type="button"
                onClick={() => downloadFile(`${activeArtifact.id}.md`, activeArtifact.content)}
                className="btn btn-sm"
              >
                <Download size={12} />
                <span>MD</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadFile(
                    `${activeArtifact.id}.json`,
                    JSON.stringify(activeArtifact, null, 2),
                    'application/json;charset=utf-8',
                  )
                }
                className="btn btn-sm"
              >
                <Download size={12} />
                <span>JSON</span>
              </button>
              <button type="button" onClick={() => printReport(activeArtifact)} className="btn btn-sm btn-primary">
                <Printer size={12} />
                <span>تصدير PDF</span>
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
              <div className="md-prose" style={{ fontSize: '0.81rem' }}>
                {activeArtifact.content}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Thread Modal */}
      {showNewModal && (
        <div className="nx-modal-backdrop" onClick={() => setShowNewModal(false)}>
          <div className="nx-modal" onClick={(e) => e.stopPropagation()}>
            <div className="nx-card-header">
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>بدء جلسة حوار جديدة</div>
              <button type="button" onClick={() => setShowNewModal(false)} className="btn btn-ghost btn-sm">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateThread} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="nx-label">عنوان الجلسة</label>
                <input
                  className="nx-input"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: مراجعة عقد الشراكة الإقليمية"
                />
              </div>

              <div>
                <label className="nx-label">نمط التفكير والحوار</label>
                <div className="seg-tabs" style={{ width: '100%' }}>
                  <button
                    type="button"
                    onClick={() => setNewMode('single')}
                    className={`seg-tab ${newMode === 'single' ? 'active' : ''}`}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    وكيل متخصص منفرد
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewMode('council')}
                    className={`seg-tab ${newMode === 'council' ? 'active' : ''}`}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    مجلس خبراء مشترك (Multi-Agent Council)
                  </button>
                </div>
              </div>

              <div>
                <label className="nx-label">اختر الوكلاء المشاركين في الجلسة</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                  {agents.map((ag) => {
                    const checked = selectedIds.includes(ag.id);
                    return (
                      <label
                        key={ag.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: `1px solid ${checked ? 'var(--brand)' : 'var(--border-subtle)'}`,
                          background: checked ? 'var(--brand-soft)' : 'var(--bg-input)',
                          cursor: 'pointer',
                          fontSize: '0.78rem',
                        }}
                      >
                        <input
                          type={newMode === 'single' ? 'radio' : 'checkbox'}
                          checked={checked}
                          onChange={() => {
                            if (newMode === 'single') {
                              setSelectedIds([ag.id]);
                            } else {
                              setSelectedIds((prev) =>
                                prev.includes(ag.id) ? prev.filter((x) => x !== ag.id) : [...prev, ag.id],
                              );
                            }
                          }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {ag.name}
                          </div>
                          <div style={{ fontSize: '0.69rem', color: 'var(--text-muted)' }}>{ag.domain}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.82rem' }}>
                <input type="checkbox" checked={useKb} onChange={(e) => setUseKb(e.target.checked)} />
                <span>تفعيل الاسترجاع التلقائي من قاعدة معرفة الشركة (RAG Grounding)</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => setShowNewModal(false)} className="btn">
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  إنشاء وبدء الجلسة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

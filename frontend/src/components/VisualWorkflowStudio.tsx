import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Bot,
  CheckCircle2,
  GitBranch,
  Play,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import { WORKFLOW_BLUEPRINTS } from '../data/enterpriseCatalog';
import { nexusEngine } from '../engine/nexusEngine';
import type { AgentRecord, MissionRecord, WorkflowNode, WorkflowRecord } from '../types';

interface Props {
  agents: AgentRecord[];
  workflows: WorkflowRecord[];
  onRefresh: () => Promise<void>;
  notify: (msg: string, isError?: boolean) => void;
}

export const VisualWorkflowStudio: React.FC<Props> = ({
  agents,
  workflows,
  onRefresh,
  notify,
}) => {
  const [selectedWfId, setSelectedWfId] = useState<number | null>(workflows[0]?.id || null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [runInput, setRunInput] = useState(
    'عقد خدمات سحابية بقيمة 120,000 دولار سنوياً مع غرامة إنهاء مبكر 25% ومسؤولية غير محدودة.',
  );
  const [runningNodeIdx, setRunningNodeIdx] = useState<number>(-1);
  const [completedNodes, setCompletedNodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<MissionRecord | null>(null);

  // Builder Modal
  const [showBuilder, setShowBuilder] = useState(false);
  const [wfName, setWfName] = useState('');
  const [wfCategory, setWfCategory] = useState('أتمتة الأعمال');
  const [wfDesc, setWfDesc] = useState('');
  const [draftNodes, setDraftNodes] = useState<WorkflowNode[]>([
    { id: 'n1', kind: 'trigger', label: 'استلام الطلب / Webhook', subtitle: 'نقطة انطلاق المسار' },
    { id: 'n2', kind: 'rag', label: 'استرجاع وثائق RAG', subtitle: 'فحص سياسات الشركة' },
    { id: 'n3', kind: 'agent', label: agents[0]?.name || 'الوكيل المحلل', subtitle: 'معالجة وتحليل', agent_id: agents[0]?.id },
    { id: 'n4', kind: 'output', label: 'تقرير القرار والإشعار', subtitle: 'حفظ وتصدير' },
  ]);

  useEffect(() => {
    if (!selectedWfId && workflows[0]) {
      setSelectedWfId(workflows[0].id);
    }
  }, [workflows, selectedWfId]);

  const activeWf = workflows.find((w) => w.id === selectedWfId) || workflows[0];

  async function installBlueprint(bpId: string) {
    const bp = WORKFLOW_BLUEPRINTS.find((b) => b.id === bpId);
    if (!bp) return;
    const created = await nexusEngine.createWorkflow({
      name: bp.name,
      description: bp.description,
      category: bp.category,
      nodes_json: bp.nodes,
      edges_json: bp.edges,
    });
    await onRefresh();
    setSelectedWfId(created.id);
    setRunInput(bp.sample_input);
    notify(`تم تثبيت المسار المرئي "${bp.name}" في مساحتك.`);
  }

  async function handleSaveCustomWorkflow(e: React.FormEvent) {
    e.preventDefault();
    if (!wfName.trim() || draftNodes.length < 2) return;
    const edges = draftNodes.slice(0, -1).map((n, idx) => ({
      from: n.id,
      to: draftNodes[idx + 1].id,
    }));
    const created = await nexusEngine.createWorkflow({
      name: wfName,
      description: wfDesc || 'مسار عمل مؤسسي مخصص متعدد المراحل',
      category: wfCategory,
      nodes_json: draftNodes,
      edges_json: edges,
    });
    await onRefresh();
    setSelectedWfId(created.id);
    setShowBuilder(false);
    setWfName('');
    notify('تم حفظ المسار المرئي الجديد بنجاح.');
  }

  async function handleExecuteWorkflow() {
    if (!activeWf || !runInput.trim() || busy) return;
    setBusy(true);
    setCompletedNodes([]);
    setLastResult(null);

    const nodes = activeWf.nodes_json;
    try {
      // Animate node-by-node progression while executing
      for (let i = 0; i < nodes.length - 1; i++) {
        setRunningNodeIdx(i);
        await new Promise((r) => setTimeout(r, 260));
        setCompletedNodes((prev) => [...prev, nodes[i].id]);
      }
      setRunningNodeIdx(nodes.length - 1);
      const res = await nexusEngine.runWorkflow(activeWf.id, runInput);
      setCompletedNodes(nodes.map((n) => n.id));
      setRunningNodeIdx(-1);
      setLastResult(res.mission);
      await onRefresh();
      notify(`اكتمل تنفيذ المسار "${activeWf.name}" بنجاح عبر ${nodes.length} عقد.`);
    } catch (err) {
      setRunningNodeIdx(-1);
      notify((err as Error).message, true);
    } finally {
      setBusy(false);
    }
  }

  function addDraftNode(kind: WorkflowNode['kind']) {
    const id = 'n' + (draftNodes.length + 1) + '_' + Math.floor(Math.random() * 99);
    const ag = agents[draftNodes.length % Math.max(1, agents.length)];
    const map: Record<WorkflowNode['kind'], { label: string; subtitle: string }> = {
      trigger: { label: 'مشغّل Webhook', subtitle: 'حدث خارجي' },
      rag: { label: 'بحث قاعدة المعرفة RAG', subtitle: 'إثراء السياق' },
      agent: { label: ag?.name || 'وكيل متخصص', subtitle: ag?.domain || 'معالجة ذكية' },
      router: { label: 'موزع شرطي ذكي', subtitle: 'فحص الجودة والاعتماد' },
      output: { label: 'إرسال لقناة خارجية', subtitle: 'Telegram / Slack / PDF' },
    };
    setDraftNodes((prev) => [
      ...prev.slice(0, -1),
      { id, kind, label: map[kind].label, subtitle: map[kind].subtitle, agent_id: kind === 'agent' ? ag?.id : undefined },
      prev[prev.length - 1],
    ]);
  }

  const kindColor = (kind: WorkflowNode['kind']) => {
    if (kind === 'trigger') return 'var(--amber)';
    if (kind === 'rag') return 'var(--cyan)';
    if (kind === 'agent') return 'var(--brand)';
    if (kind === 'router') return 'var(--amber)';
    return 'var(--text-primary)';
  };

  const kindIcon = (kind: WorkflowNode['kind']) => {
    if (kind === 'trigger') return <Zap size={14} />;
    if (kind === 'rag') return <BookOpen size={14} />;
    if (kind === 'agent') return <Bot size={14} />;
    if (kind === 'router') return <GitBranch size={14} />;
    return <Send size={14} />;
  };

  const nodes = activeWf?.nodes_json || [];
  const nodeSpacingX = 248;
  const svgWidth = Math.max(820, nodes.length * nodeSpacingX + 60);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="nx-page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="nx-page-title">مصمم المسارات والسرب المرئي (Visual DAG Workflow Studio)</h1>
          <p className="nx-page-subtitle">
            اربط المشغلات، قواعد المعرفة RAG، وسرب الوكلاء المتخصصين في خطوط إنتاج مرئية متتابعة
          </p>
        </div>
        <button type="button" onClick={() => setShowBuilder(true)} className="btn btn-primary">
          <Plus size={15} />
          <span>تصميم مسار عمل مخصص</span>
        </button>
      </div>

      {/* Blueprints Strip */}
      <div className="nx-card" style={{ padding: '14px 18px' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={14} style={{ color: 'var(--brand)' }} />
          <span>قوالب خطوط الإنتاج الجاهزة (اضغط لتثبيتها وتشغيلها فوراً):</span>
        </div>
        <div className="grid-4">
          {WORKFLOW_BLUEPRINTS.map((bp) => (
            <div
              key={bp.id}
              onClick={() => installBlueprint(bp.id)}
              className="nx-card nx-card-interactive"
              style={{ padding: '11px 13px', background: 'var(--bg-elevated)' }}
            >
              <span className="nx-badge" style={{ marginBottom: 5 }}>
                {bp.category}
              </span>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: 4 }}>{bp.name}</div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>{bp.nodes.length} عقد مترابطة ← تثبيت</div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Workflows Selector */}
      {workflows.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div className="pill-bar">
            {workflows.map((wf) => (
              <button
                key={wf.id}
                type="button"
                onClick={() => {
                  setSelectedWfId(wf.id);
                  setCompletedNodes([]);
                  setLastResult(null);
                }}
                className={`filter-pill ${activeWf?.id === wf.id ? 'active' : ''}`}
              >
                {wf.name} ({wf.total_runs})
              </button>
            ))}
          </div>
          {activeWf && (
            <button
              type="button"
              onClick={async () => {
                await nexusEngine.deleteWorkflow(activeWf.id);
                setSelectedWfId(null);
                await onRefresh();
              }}
              className="btn btn-sm btn-danger"
            >
              <Trash2 size={13} />
              <span>حذف المسار</span>
            </button>
          )}
        </div>
      )}

      {/* Visual SVG + Nodes DAG Stage */}
      {activeWf && (
        <div className="nx-card" style={{ padding: 18 }}>
          <div className="nx-card-header">
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{activeWf.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{activeWf.description}</div>
            </div>
            <span className="nx-badge nx-badge-brand mono">{nodes.length} Nodes DAG</span>
          </div>

          <div className="dag-stage" dir="ltr">
            <div style={{ position: 'relative', width: svgWidth, height: 185 }}>
              {/* Bézier Connector Curves */}
              <svg
                width={svgWidth}
                height={185}
                style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
              >
                {nodes.slice(0, -1).map((n, idx) => {
                  const x1 = 20 + idx * nodeSpacingX + 210;
                  const y1 = 88;
                  const x2 = 20 + (idx + 1) * nodeSpacingX;
                  const y2 = 88;
                  const cx = (x1 + x2) / 2;
                  const isDone = completedNodes.includes(n.id);
                  return (
                    <g key={n.id}>
                      <path
                        d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
                        fill="none"
                        stroke={isDone ? 'var(--brand)' : 'var(--border-strong)'}
                        strokeWidth={isDone ? 2.6 : 1.8}
                        strokeDasharray={runningNodeIdx === idx ? '5 4' : undefined}
                      />
                      <circle cx={x2 - 3} cy={y2} r="3.5" fill={isDone ? 'var(--brand)' : 'var(--border-strong)'} />
                    </g>
                  );
                })}
              </svg>

              {/* Node Cards */}
              {nodes.map((n, idx) => {
                const isRunning = runningNodeIdx === idx;
                const isDone = completedNodes.includes(n.id);
                return (
                  <div
                    key={n.id}
                    onClick={() => setSelectedNodeId(n.id)}
                    className={`dag-node ${selectedNodeId === n.id ? 'selected' : ''} ${isRunning ? 'running' : ''} ${isDone ? 'done' : ''}`}
                    style={{
                      position: 'absolute',
                      left: 20 + idx * nodeSpacingX,
                      top: 34,
                      direction: 'rtl',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: '0.69rem',
                          fontWeight: 700,
                          color: kindColor(n.kind),
                        }}
                      >
                        {kindIcon(n.kind)}
                        {n.kind.toUpperCase()}
                      </span>
                      {isDone && <CheckCircle2 size={14} style={{ color: 'var(--brand)' }} />}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: 3 }}>{n.label}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{n.subtitle}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Workflow Trigger Input */}
          <div
            style={{
              marginTop: 16,
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto',
              gap: 12,
              alignItems: 'end',
            }}
          >
            <div>
              <label className="nx-label">بيانات الإدخال لتشغيل خط الإنتاج المرئي</label>
              <input
                className="nx-input"
                value={runInput}
                onChange={(e) => setRunInput(e.target.value)}
                placeholder="أدخل موضوع المهمة أو مسودة العقد أو هدف المشروع لتمريره عبر كافة العقد..."
              />
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={handleExecuteWorkflow}
              className="btn btn-primary btn-lg"
            >
              <Play size={15} />
              <span>{busy ? 'جارٍ تمرير المخرجات بين العقد...' : 'تشغيل المسار الكامل الآن'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Workflow Output Report */}
      {lastResult && (
        <div className="nx-card">
          <div className="nx-card-header">
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.96rem', color: 'var(--brand)' }}>
                ✅ المخرج النهائي الموحّد لخط الإنتاج ({lastResult.prompt_tokens + lastResult.completion_tokens} توكن)
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lastResult.title}</div>
            </div>
          </div>
          <div className="md-prose" style={{ padding: 14, borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            {lastResult.final_output}
          </div>
        </div>
      )}

      {/* Custom Workflow Builder Modal */}
      {showBuilder && (
        <div className="nx-modal-backdrop" onClick={() => setShowBuilder(false)}>
          <div className="nx-modal" onClick={(e) => e.stopPropagation()}>
            <div className="nx-card-header">
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>تصميم مسار عمل مؤسسي جديد</div>
              <button type="button" onClick={() => setShowBuilder(false)} className="btn btn-ghost btn-sm">
                إغلاق
              </button>
            </div>
            <form onSubmit={handleSaveCustomWorkflow} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div className="grid-2">
                <div>
                  <label className="nx-label">اسم المسار</label>
                  <input
                    className="nx-input"
                    required
                    value={wfName}
                    onChange={(e) => setWfName(e.target.value)}
                    placeholder="مثال: خط تدقيق المشتريات والعقود"
                  />
                </div>
                <div>
                  <label className="nx-label">التصنيف</label>
                  <input
                    className="nx-input"
                    value={wfCategory}
                    onChange={(e) => setWfCategory(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="nx-label">وصف المسار</label>
                <input
                  className="nx-input"
                  value={wfDesc}
                  onChange={(e) => setWfDesc(e.target.value)}
                  placeholder="وصف مختصر لآلية تدفق البيانات بين الوكلاء"
                />
              </div>

              <div>
                <label className="nx-label">إضافة عقدة جديدة في خط الإنتاج:</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => addDraftNode('rag')} className="btn btn-sm">
                    + عقدة بحث معرفة RAG
                  </button>
                  <button type="button" onClick={() => addDraftNode('agent')} className="btn btn-sm">
                    + عقدة وكيل ذكي
                  </button>
                  <button type="button" onClick={() => addDraftNode('router')} className="btn btn-sm">
                    + موزع شرطي
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {draftNodes.map((dn, idx) => (
                  <div
                    key={dn.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.8rem',
                    }}
                  >
                    <span>
                      <strong>{idx + 1}. [{dn.kind.toUpperCase()}]</strong> — {dn.label}
                    </span>
                    {idx > 0 && idx < draftNodes.length - 1 && (
                      <button
                        type="button"
                        onClick={() => setDraftNodes((prev) => prev.filter((x) => x.id !== dn.id))}
                        className="btn btn-ghost btn-sm"
                      >
                        حذف
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => setShowBuilder(false)} className="btn">
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  حفظ المسار المرئي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

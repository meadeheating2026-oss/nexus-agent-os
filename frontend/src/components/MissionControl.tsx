import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  GitMerge,
  Play,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { api } from '../api';
import type { AgentItem, MissionItem } from '../types';

interface Props {
  agents: AgentItem[];
  missions: MissionItem[];
  initialMode?: 'standalone' | 'swarm';
  preselectedAgentIds?: number[];
  activeMissionToInspect?: MissionItem | null;
  onMissionComplete: () => Promise<void>;
}

const PRESET_GOALS = [
  {
    label: 'فحص شركات + إغلاق مبيعات فوري',
    mode: 'swarm' as const,
    prompt:
      'افحص نقاط الضعف التسويقية والتقنية لشركات العقارات والعيادات، قدّر حجم الخسارة الشهرية بالأرقام، وجهّز عرض إصلاح مدفوع مع تسلسل 3 رسائل إغلاق مبيعات.',
  },
  {
    label: 'خطة SEO ومقالات أفلييت عالية العمولة',
    mode: 'swarm' as const,
    prompt:
      'استخرج أفضل 5 كلمات مفتاحية شرائية منخفضة المنافسة في برامج الذكاء الاصطناعي للأعمال، وابنِ مقال مقارنة شامل مجهز بروابط العمولة وخطة نشر.',
  },
  {
    label: 'بناء وتسعير أداة Micro-SaaS مربحة',
    mode: 'swarm' as const,
    prompt:
      'صمم أداة رقمية مصغرة لحل مشكلة استرجاع السلات المتروكة للمتاجر الإلكترونية، مع الهيكل البرمجي ونصف صفحة هبوط وخطة التسعير الشهري.',
  },
];

export const MissionControl: React.FC<Props> = ({
  agents,
  missions,
  initialMode = 'swarm',
  preselectedAgentIds = [],
  activeMissionToInspect,
  onMissionComplete,
}) => {
  const workerAgents = agents.filter((a) => !a.is_system_agent);

  const [mode, setMode] = useState<'standalone' | 'swarm'>(initialMode);
  const [strategy, setStrategy] = useState<'auto' | 'manual'>(
    preselectedAgentIds.length > 0 ? 'manual' : 'auto'
  );
  const [selectedIds, setSelectedIds] = useState<number[]>(
    preselectedAgentIds.length > 0
      ? preselectedAgentIds
      : workerAgents[0]
      ? [workerAgents[0].id]
      : []
  );
  const [goalPrompt, setGoalPrompt] = useState('');
  const [customValueUsd, setCustomValueUsd] = useState<string>('');
  const [running, setRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentMission, setCurrentMission] = useState<MissionItem | null>(null);
  const [copiedOutput, setCopiedOutput] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    if (preselectedAgentIds.length > 0) {
      setSelectedIds(preselectedAgentIds);
      if (initialMode === 'swarm') {
        setStrategy('manual');
      }
    }
  }, [initialMode, preselectedAgentIds]);

  useEffect(() => {
    if (activeMissionToInspect) {
      loadMissionDetails(activeMissionToInspect.id);
    } else if (!currentMission && missions.length > 0) {
      loadMissionDetails(missions[0].id);
    }
  }, [activeMissionToInspect, missions.length]);

  async function loadMissionDetails(id: number) {
    try {
      const full = await api.getMission(id);
      setCurrentMission(full);
    } catch {
      // ignore
    }
  }

  function toggleSquadMember(id: number) {
    if (mode === 'standalone') {
      setSelectedIds([id]);
      return;
    }
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleRunMission(e: React.FormEvent) {
    e.preventDefault();
    if (!goalPrompt.trim()) {
      setErrorMsg('اكتب الهدف أو المهمة المطلوب تنفيذها أولاً.');
      return;
    }
    if ((mode === 'standalone' || strategy === 'manual') && selectedIds.length === 0) {
      setErrorMsg('اختر وكيلاً واحداً على الأقل لتنفيذ المهمة.');
      return;
    }
    setRunning(true);
    setErrorMsg('');
    try {
      const valNum = customValueUsd.trim() ? Number(customValueUsd) : undefined;
      const result = await api.runMission({
        goal_prompt: goalPrompt,
        mode,
        orchestration_strategy: mode === 'standalone' ? 'manual' : strategy,
        selected_agent_ids: selectedIds,
        estimated_value_usd: valNum,
      });
      setCurrentMission(result);
      await onMissionComplete();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر تشغيل المهمة');
    } finally {
      setRunning(false);
    }
  }

  function handleCopyDeliverable() {
    if (!currentMission?.final_output) return;
    navigator.clipboard?.writeText(currentMission.final_output);
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  }

  return (
    <section aria-labelledby="mission-control-heading">
      <header className="page-header">
        <div>
          <h1 id="mission-control-heading">غرفة العمليات والتكامل الحي (Mission Control)</h1>
          <p>
            شغّل أي وكيل منفرداً بكامل استقلاليته، أو ادمج عدة وكلاء من مجالات مختلفة ليتكاملوا تلقائياً في إنجاز هدف واحد مع حساب فوري للتكلفة وصافي الربح.
          </p>
        </div>
      </header>

      <div className="mission-split">
        {/* Right Column (in RTL): Mission Configuration */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <GitMerge size={18} color="var(--emerald)" />
              إعداد وإطلاق المهمة
            </div>
          </div>

          <form onSubmit={handleRunMission} className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="field-group">
              <span className="field-label">نمط التشغيل</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  id="mode-btn-swarm"
                  type="button"
                  className={`btn ${mode === 'swarm' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setMode('swarm')}
                >
                  <GitMerge size={15} />
                  تكامل عدة وكلاء
                </button>
                <button
                  id="mode-btn-standalone"
                  type="button"
                  className={`btn ${mode === 'standalone' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    setMode('standalone');
                    if (selectedIds.length === 0 && workerAgents[0]) {
                      setSelectedIds([workerAgents[0].id]);
                    } else if (selectedIds.length > 1) {
                      setSelectedIds([selectedIds[0]]);
                    }
                  }}
                >
                  <UserCheck size={15} />
                  وكيل مستقل منفرد
                </button>
              </div>
            </div>

            {mode === 'swarm' && (
              <div className="field-group">
                <span className="field-label">طريقة اختيار الفريق المتكامل</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    id="strategy-btn-auto"
                    type="button"
                    className={`btn ${strategy === 'auto' ? 'btn-amber' : 'btn-secondary'}`}
                    onClick={() => setStrategy('auto')}
                  >
                    <Sparkles size={14} />
                    اختيار تلقائي ذكي
                  </button>
                  <button
                    id="strategy-btn-manual"
                    type="button"
                    className={`btn ${strategy === 'manual' ? 'btn-amber' : 'btn-secondary'}`}
                    onClick={() => setStrategy('manual')}
                  >
                    تحديد يدوي للوكلاء
                  </button>
                </div>
              </div>
            )}

            {(mode === 'standalone' || strategy === 'manual') && (
              <div className="field-group">
                <span className="field-label">
                  {mode === 'standalone'
                    ? 'اختر الوكيل المسؤول عن المهمة:'
                    : `اختر الوكلاء المراد دمجهم بالترتيب (${selectedIds.length} محدد):`}
                </span>
                <div style={{ maxHeight: '215px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {workerAgents.map((ag) => {
                    const active = selectedIds.includes(ag.id);
                    return (
                      <label
                        key={ag.id}
                        className={`tool-check-item ${active ? 'checked' : ''}`}
                        style={{ padding: '8px 10px' }}
                      >
                        <input
                          id={`select-mission-agent-${ag.id}`}
                          type={mode === 'standalone' ? 'radio' : 'checkbox'}
                          name="mission-agent-selector"
                          checked={active}
                          onChange={() => toggleSquadMember(ag.id)}
                          style={{ marginTop: '3px' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.83rem' }}>{ag.name}</div>
                          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                            {ag.domain} — ${ag.price_per_run}/مهمة
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="field-group">
              <div className="field-label">
                <label htmlFor="mission-goal-textarea">الهدف أو المهمة المطلوبة *</label>
              </div>
              <textarea
                id="mission-goal-textarea"
                className="textarea"
                style={{ minHeight: '115px' }}
                placeholder="اكتب الهدف بالتفصيل (أو ضع رابط موقع لفحصه فعلياً)... مثال: ابحث عن أفضل فرص الربح في المجال وجهز خطة تنفيذ ورسائل بيع جاهزة."
                value={goalPrompt}
                onChange={(e) => setGoalPrompt(e.target.value)}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                {PRESET_GOALS.map((p, idx) => (
                  <button
                    id={`preset-goal-${idx}`}
                    key={p.label}
                    type="button"
                    className="domain-tab"
                    style={{ fontSize: '0.74rem', padding: '4px 9px' }}
                    onClick={() => {
                      setMode(p.mode);
                      setGoalPrompt(p.prompt);
                    }}
                  >
                    + {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="mission-value-input">
                تسعير العميل أو القيمة المالية المستهدفة بالدولار (اختياري)
              </label>
              <input
                id="mission-value-input"
                type="number"
                min="0"
                step="5"
                className="input mono"
                placeholder="يُحسب تلقائياً من تسعير الوكلاء المشاركين إن تُرك فارغاً"
                value={customValueUsd}
                onChange={(e) => setCustomValueUsd(e.target.value)}
              />
            </div>

            {errorMsg && (
              <div
                style={{
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--danger-soft)',
                  color: 'var(--danger)',
                  fontSize: '0.84rem',
                }}
              >
                {errorMsg}
              </div>
            )}

            <button
              id="btn-execute-mission"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px' }}
              disabled={running}
            >
              <Play size={16} />
              {running ? 'جاري تشغيل الوكلاء وتكامل المخرجات...' : 'إطلاق التنفيذ الآن'}
            </button>

            {missions.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  سجل المهام الأخيرة (انقر للاستعراض):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                  {missions.slice(0, 8).map((m) => (
                    <button
                      id={`history-mission-${m.id}`}
                      key={m.id}
                      type="button"
                      className="nav-btn"
                      style={{
                        padding: '7px 10px',
                        fontSize: '0.8rem',
                        background: currentMission?.id === m.id ? 'var(--bg-elevated)' : 'transparent',
                      }}
                      onClick={() => loadMissionDetails(m.id)}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        #{m.id} — {m.title}
                      </span>
                      <span className="mono" style={{ color: 'var(--emerald)', fontSize: '0.75rem' }}>
                        +${m.net_profit_usd.toFixed(1)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Left Column (in RTL): Live Step-by-Step Collaboration Trace & Final Deliverable */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {currentMission ? (
            <>
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <div className="panel-title">
                      سجل تدفق وتكامل الوكلاء — مهمة #{currentMission.id}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {currentMission.title}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="tag tag-emerald">
                      صافي الربح: <strong className="mono">${currentMission.net_profit_usd.toFixed(2)}</strong>
                    </span>
                    <span className="tag tag-amber">
                      التكلفة: <strong className="mono">${currentMission.total_cost_usd.toFixed(4)}</strong>
                    </span>
                    <span className="tag tag-sky">
                      الجودة: <strong className="mono">{currentMission.qa_score}/100</strong>
                    </span>
                  </div>
                </div>

                <div className="timeline">
                  {(currentMission.steps || []).map((st) => (
                    <div key={st.id} className="timeline-step">
                      <div className={`step-badge ${st.step_type}`}>{st.step_order}</div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                            {st.agent_name}{' '}
                            <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                              ({st.agent_domain})
                            </span>
                          </span>
                          {st.tool_used && (
                            <span className="mono" style={{ fontSize: '0.73rem', color: 'var(--sky)' }}>
                              [{st.tool_used}]
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                          {st.summary}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">المخرج النهائي الجاهز للتسليم أو النشر الآلي</div>
                  <button
                    id="btn-copy-deliverable"
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCopyDeliverable}
                  >
                    {copiedOutput ? <Check size={15} color="var(--emerald)" /> : <Copy size={15} />}
                    {copiedOutput ? 'تم النسخ!' : 'نسخ المخرج الكامل'}
                  </button>
                </div>
                <div className="panel-body">
                  <div className="deliverable-box">{currentMission.final_output}</div>
                </div>
              </div>
            </>
          ) : (
            <div className="panel">
              <div className="panel-body" style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--text-secondary)' }}>
                اكتب هدفك على اليمين واضغط <strong>إطلاق التنفيذ الآن</strong> لترى الوكلاء يتعاونون خطوة بخطوة أمامك.
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

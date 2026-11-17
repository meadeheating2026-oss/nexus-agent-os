import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, Copy, GitMerge, Play, Sparkles, UserCheck } from 'lucide-react';
import { enterpriseApi } from '../api';
import type { AgentRecord, MissionRecord } from '../types';

interface Props {
  llmReady: boolean;
  agents: AgentRecord[];
  missions: MissionRecord[];
  initialMode?: 'standalone' | 'swarm_sequential' | 'swarm_orchestrated';
  initialAgentIds?: number[];
  onCompleted: () => Promise<void>;
  onGoToKeySetup: () => void;
}

export const EnterpriseMissionRoom: React.FC<Props> = ({
  llmReady,
  agents,
  missions,
  initialMode = 'standalone',
  initialAgentIds = [],
  onCompleted,
  onGoToKeySetup,
}) => {
  const [execMode, setExecMode] = useState<'standalone' | 'swarm_sequential' | 'swarm_orchestrated'>(initialMode);
  const [selectedIds, setSelectedIds] = useState<number[]>(
    initialAgentIds.length > 0 ? initialAgentIds : agents[0] ? [agents[0].id] : []
  );
  const [goalPrompt, setGoalPrompt] = useState('');
  const [running, setRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeMission, setActiveMission] = useState<MissionRecord | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setExecMode(initialMode);
    if (initialAgentIds.length > 0) setSelectedIds(initialAgentIds);
  }, [initialMode, initialAgentIds]);

  useEffect(() => {
    if (!activeMission && missions.length > 0) {
      loadMission(missions[0].id);
    }
  }, [missions.length]);

  async function loadMission(id: number) {
    try {
      const m = await enterpriseApi.getMission(id);
      setActiveMission(m);
    } catch {
      // ignore
    }
  }

  function toggleAgent(id: number) {
    if (execMode === 'standalone') {
      setSelectedIds([id]);
      return;
    }
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleExecute(e: React.FormEvent) {
    e.preventDefault();
    if (!goalPrompt.trim()) {
      setErrorMsg('يرجى كتابة المهمة المطلوب تنفيذها.');
      return;
    }
    setRunning(true);
    setErrorMsg('');
    try {
      const res = await enterpriseApi.executeMission({
        goal_prompt: goalPrompt,
        execution_mode: execMode,
        agent_ids: selectedIds,
      });
      setActiveMission(res);
      await onCompleted();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'فشل تنفيذ المهمة');
    } finally {
      setRunning(false);
    }
  }

  return (
    <section aria-labelledby="mission-room-heading">
      <header className="page-header">
        <div>
          <h1 id="mission-room-heading">غرفة العمليات والتنفيذ الفعلي (ReAct & Swarm Engine)</h1>
          <p>
            تنفيذ حقيقي بحلقات استدعاء الأدوات (Function Calling) والتكامل بين الوكلاء مع خصم فوري ودقيق من محفظة النقاط بناءً على استهلاك التوكنز الفعلي.
          </p>
        </div>
      </header>

      {!llmReady && (
        <div
          style={{
            padding: '14px 18px',
            marginBottom: '20px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--amber-soft)',
            color: 'var(--amber)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
            <AlertTriangle size={18} />
            <span>
              المنصة تعمل بدون ردود وهمية — لتشغيل الوكلاء فعلياً يجب ربط مفتاح Gemini أو OpenRouter أو OpenAI في الإعدادات أولاً.
            </span>
          </div>
          <button type="button" className="btn btn-amber" onClick={onGoToKeySetup}>
            إعداد مفتاح الـ API الآن
          </button>
        </div>
      )}

      <div className="mission-split">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">تكوين وإطلاق المهمة</div>
          </div>

          <form onSubmit={handleExecute} className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div className="field-group">
              <span className="field-label">وضع التنفيذ الفعلي</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  id="exec-mode-standalone"
                  type="button"
                  className={`btn ${execMode === 'standalone' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ justifyContent: 'flex-start' }}
                  onClick={() => {
                    setExecMode('standalone');
                    if (selectedIds.length !== 1 && agents[0]) setSelectedIds([agents[0].id]);
                  }}
                >
                  <UserCheck size={15} />
                  وكيل مستقل منفرد (مع دعم استدعاء زميل تلقائياً)
                </button>
                <button
                  id="exec-mode-sequential"
                  type="button"
                  className={`btn ${execMode === 'swarm_sequential' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ justifyContent: 'flex-start' }}
                  onClick={() => setExecMode('swarm_sequential')}
                >
                  <GitMerge size={15} />
                  سلسلة تكامل يدوية (Sequential Multi-Agent Pipeline)
                </button>
                <button
                  id="exec-mode-orchestrated"
                  type="button"
                  className={`btn ${execMode === 'swarm_orchestrated' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ justifyContent: 'flex-start' }}
                  onClick={() => setExecMode('swarm_orchestrated')}
                >
                  <Sparkles size={15} />
                  توزيع ذكي تلقائي عبر المنسق (AI Orchestrator)
                </button>
              </div>
            </div>

            {execMode !== 'swarm_orchestrated' && (
              <div className="field-group">
                <span className="field-label">
                  {execMode === 'standalone' ? 'اختر الوكيل المنفذ:' : `اختر الوكلاء بالترتيب (${selectedIds.length}):`}
                </span>
                <div style={{ maxHeight: '195px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {agents.map((a) => {
                    const checked = selectedIds.includes(a.id);
                    return (
                      <label key={a.id} className={`tool-check-item ${checked ? 'checked' : ''}`}>
                        <input
                          type={execMode === 'standalone' ? 'radio' : 'checkbox'}
                          name="exec-agent-pick"
                          checked={checked}
                          onChange={() => toggleAgent(a.id)}
                          style={{ marginTop: '3px' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.83rem' }}>{a.name}</div>
                          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{a.domain}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="field-group">
              <label className="field-label" htmlFor="ent-goal-input">المهمة / المدخلات الفعلية *</label>
              <textarea
                id="ent-goal-input"
                className="textarea"
                style={{ minHeight: '125px' }}
                placeholder="مثال: افحص الرابط https://example.com واستخرج العناوين ونقاط التحسين، واحسب العائد المتوقع إذا ارتفع التحويل من 1.4% إلى 3.2% لمتجر زياراته 25000 شهرياً..."
                value={goalPrompt}
                onChange={(e) => setGoalPrompt(e.target.value)}
                required
              />
            </div>

            {errorMsg && (
              <div style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: '0.84rem' }}>
                {errorMsg}
              </div>
            )}

            <button id="btn-run-real-mission" type="submit" className="btn btn-primary" disabled={running}>
              <Play size={16} />
              {running ? 'جاري الاتصال بالـ LLM وتنفيذ الأدوات فعلياً...' : 'بدء التنفيذ الحقيقي'}
            </button>

            {missions.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  سجل العمليات السابقة:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                  {missions.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className="nav-btn"
                      style={{
                        padding: '6px 10px',
                        fontSize: '0.8rem',
                        background: activeMission?.id === m.id ? 'var(--bg-elevated)' : 'transparent',
                      }}
                      onClick={() => loadMission(m.id)}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        #{m.id} — {m.title}
                      </span>
                      <span className={`tag ${m.status === 'completed' ? 'tag-emerald' : 'tag-danger'}`}>
                        {m.status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Trace & Final Output */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {activeMission ? (
            <>
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <div className="panel-title">شجرة استدعاء الأدوات والوكلاء — عملية #{activeMission.id}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{activeMission.title}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="tag tag-emerald">
                      التوكنز: <strong className="mono">{activeMission.prompt_tokens + activeMission.completion_tokens}</strong>
                    </span>
                    <span className="tag tag-amber">
                      المخصوم: <strong className="mono">{activeMission.credits_charged} نقطة</strong>
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {(activeMission.steps || []).map((st) => (
                    <div
                      key={st.id}
                      style={{
                        padding: '13px 18px',
                        borderBottom: '1px solid var(--border-subtle)',
                        fontSize: '0.84rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '6px' }}>
                        <strong>
                          #{st.step_order} {st.agent_name} —{' '}
                          <span style={{ color: 'var(--emerald)' }}>[{st.step_kind}]</span>{' '}
                          {st.tool_name && <span className="mono" style={{ color: 'var(--sky)' }}>({st.tool_name})</span>}
                        </strong>
                        <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {st.duration_ms}ms | {st.tokens_used} tok
                        </span>
                      </div>
                      {st.input_payload && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                          المدخل: <span className="mono">{st.input_payload.slice(0, 260)}</span>
                        </div>
                      )}
                      <div style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                        {st.output_payload.slice(0, 500)}
                        {st.output_payload.length > 500 ? '...' : ''}
                      </div>
                    </div>
                  ))}
                  {activeMission.error_message && (
                    <div style={{ padding: '14px 18px', color: 'var(--danger)' }}>
                      سبب التوقف: {activeMission.error_message}
                    </div>
                  )}
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">المخرج النهائي الكامل</div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      navigator.clipboard?.writeText(activeMission.final_output || '');
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1800);
                    }}
                  >
                    {copied ? <Check size={15} color="var(--emerald)" /> : <Copy size={15} />}
                    {copied ? 'تم النسخ' : 'نسخ'}
                  </button>
                </div>
                <div className="panel-body">
                  <div className="deliverable-box">{activeMission.final_output || 'لا يوجد مخرج نهائي مسجل.'}</div>
                </div>
              </div>
            </>
          ) : (
            <div className="panel">
              <div className="panel-body" style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--text-secondary)' }}>
                لم تقم بتشغيل أي عملية بعد. اختر وكيلاً أو فريقاً على اليمين وأطلق أول مهمة حقيقية.
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

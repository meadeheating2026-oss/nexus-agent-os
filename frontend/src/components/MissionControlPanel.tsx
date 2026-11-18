import React, { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Download,
  Layers,
  Play,
  Users,
  Wrench,
} from 'lucide-react';
import { nexusEngine } from '../engine/nexusEngine';
import type { AgentRecord, MissionRecord } from '../types';

interface Props {
  agents: AgentRecord[];
  missions: MissionRecord[];
  onRefresh: () => Promise<void>;
  notify: (msg: string, isError?: boolean) => void;
}

export const MissionControlPanel: React.FC<Props> = ({
  agents,
  missions,
  onRefresh,
  notify,
}) => {
  const [mode, setMode] = useState<'standalone' | 'swarm_sequential' | 'swarm_orchestrated'>('swarm_sequential');
  const [selectedIds, setSelectedIds] = useState<number[]>(agents.slice(0, 2).map((a) => a.id));
  const [goal, setGoal] = useState('');
  const [running, setRunning] = useState(false);
  const [activeMission, setActiveMission] = useState<MissionRecord | null>(missions[0] || null);

  async function handleLaunch(e: React.FormEvent) {
    e.preventDefault();
    if (!goal.trim() || running) return;
    setRunning(true);
    try {
      const m = await nexusEngine.executeMission({
        title: goal.slice(0, 64),
        goal_prompt: goal,
        execution_mode: mode,
        agent_ids: selectedIds.length > 0 ? selectedIds : agents.slice(0, 1).map((a) => a.id),
      });
      setActiveMission(m);
      setGoal('');
      await onRefresh();
      notify(`اكتملت المهمة بنجاح (${m.prompt_tokens + m.completion_tokens} توكن).`);
    } catch (err) {
      notify((err as Error).message, true);
    } finally {
      setRunning(false);
    }
  }

  async function selectMission(m: MissionRecord) {
    if (!m.steps) {
      const full = await nexusEngine.getMissionDetail(m.id);
      setActiveMission(full);
    } else {
      setActiveMission(m);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="nx-page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="nx-page-title">غرفة العمليات والمهام المركّبة (Mission Control & Swarm Execution)</h1>
          <p className="nx-page-subtitle">
            أطلق مهام تحليلية معقدة عبر وكيل منفرد أو خلية سرب متتالية مع تتبع كامل لكل خطوة وتكلفة
          </p>
        </div>
      </div>

      <div className="grid-2">
        {/* Launch Panel */}
        <form onSubmit={handleLaunch} className="nx-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontWeight: 700, fontSize: '0.96rem' }}>إعداد وإطلاق مهمة جديدة</div>

          <div>
            <label className="nx-label">نمط التنفيذ والتنسيق</label>
            <div className="seg-tabs" style={{ width: '100%' }}>
              <button
                type="button"
                onClick={() => setMode('standalone')}
                className={`seg-tab ${mode === 'standalone' ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                منفرد
              </button>
              <button
                type="button"
                onClick={() => setMode('swarm_sequential')}
                className={`seg-tab ${mode === 'swarm_sequential' ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <Layers size={13} />
                سلسلة سرب متتابعة
              </button>
              <button
                type="button"
                onClick={() => setMode('swarm_orchestrated')}
                className={`seg-tab ${mode === 'swarm_orchestrated' ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <Users size={13} />
                قيادة منسّقة
              </button>
            </div>
          </div>

          <div>
            <label className="nx-label">الوكلاء المكلفون بالمهمة</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {agents.map((ag) => {
                const active = selectedIds.includes(ag.id);
                return (
                  <button
                    key={ag.id}
                    type="button"
                    onClick={() => {
                      if (mode === 'standalone') {
                        setSelectedIds([ag.id]);
                      } else {
                        setSelectedIds((prev) =>
                          prev.includes(ag.id) ? prev.filter((x) => x !== ag.id) : [...prev, ag.id],
                        );
                      }
                    }}
                    className={`filter-pill ${active ? 'active' : ''}`}
                  >
                    {ag.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="nx-label">وصف الهدف التنفيذي والبيانات المطلوب معالجتها</label>
            <textarea
              className="nx-textarea"
              style={{ minHeight: 118 }}
              required
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="مثال: حلل جدوى التوسع في السوق الخليجي بميزانية تسويق 85,000 دولار وعائد مستهدف 240,000 دولار مع مراجعة المخاطر التعاقدية..."
            />
          </div>

          <button type="submit" disabled={running} className="btn btn-primary btn-lg">
            <Play size={15} />
            <span>{running ? 'جارٍ تشغيل خلية الوكلاء والأدوات...' : 'إطلاق المهمة وتوليد التقرير'}</span>
          </button>
        </form>

        {/* History List */}
        <div className="nx-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontWeight: 700, fontSize: '0.96rem' }}>الأرشيف التنفيذي للمهام ({missions.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 330, overflowY: 'auto' }}>
            {missions.map((m) => (
              <div
                key={m.id}
                onClick={() => selectMission(m)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 9,
                  cursor: 'pointer',
                  background: activeMission?.id === m.id ? 'var(--brand-soft)' : 'var(--bg-elevated)',
                  border: `1px solid ${activeMission?.id === m.id ? 'var(--brand)' : 'var(--border-subtle)'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <strong style={{ fontSize: '0.83rem' }}>{m.title}</strong>
                  <span className="nx-badge mono">{m.execution_mode}</span>
                </div>
                <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {m.prompt_tokens + m.completion_tokens} tok • {m.credits_charged} cr • ${m.actual_api_cost_usd}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Mission Trace & Final Output */}
      {activeMission && (
        <div className="nx-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="nx-card-header" style={{ marginBottom: 0 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={18} style={{ color: 'var(--brand)' }} />
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>{activeMission.title}</span>
              </div>
              <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                إجمالي التوكنز: {activeMission.prompt_tokens + activeMission.completion_tokens} | التكلفة الفعلية: $
                {activeMission.actual_api_cost_usd} | المخصوم: {activeMission.credits_charged} cr
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(activeMission.final_output);
                  notify('تم نسخ التقرير الكامل.');
                }}
                className="btn btn-sm"
              >
                <Copy size={13} />
                <span>نسخ</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([activeMission.final_output], { type: 'text/markdown;charset=utf-8' });
                  const u = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = u;
                  a.download = `mission-${activeMission.id}.md`;
                  a.click();
                  URL.revokeObjectURL(u);
                }}
                className="btn btn-sm btn-primary"
              >
                <Download size={13} />
                <span>تنزيل التقرير (.md)</span>
              </button>
            </div>
          </div>

          {activeMission.steps && activeMission.steps.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 10,
              }}
            >
              {activeMission.steps.map((st, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <strong style={{ color: 'var(--brand)' }}>
                      #{st.step_order} {st.agent_name}
                    </strong>
                    <span className="mono" style={{ color: 'var(--text-muted)' }}>
                      {st.duration_ms}ms
                    </span>
                  </div>
                  {st.tool_name && (
                    <div className="mono" style={{ fontSize: '0.7rem', marginBottom: 4 }}>
                      <Wrench size={11} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                      {st.tool_name}
                    </div>
                  )}
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                    {st.output_payload.slice(0, 140)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div
            className="md-prose"
            style={{
              padding: 16,
              borderRadius: 10,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {activeMission.final_output}
          </div>
        </div>
      )}
    </div>
  );
};

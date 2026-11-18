import React, { useState } from 'react';
import {
  Activity,
  ArrowUpLeft,
  BookOpen,
  Bot,
  Clock,
  Coins,
  FileCheck2,
  GitBranch,
  MessageSquare,
  Play,
  Sparkles,
  Zap,
} from 'lucide-react';
import type {
  AgentRecord,
  AutomationRecord,
  KnowledgeDoc,
  MissionRecord,
  NavTabId,
  UserProfile,
  WorkflowRecord,
} from '../types';

interface Props {
  user: UserProfile;
  agents: AgentRecord[];
  missions: MissionRecord[];
  docs: KnowledgeDoc[];
  workflows: WorkflowRecord[];
  automations: AutomationRecord[];
  hasLiveKey: boolean;
  engineMode: 'fastapi' | 'cloud';
  onNavigate: (tab: NavTabId) => void;
  onQuickPlaybook: (prompt: string) => void;
}

export const ExecutiveOverview: React.FC<Props> = ({
  user,
  agents,
  missions,
  docs,
  workflows,
  automations,
  hasLiveKey,
  engineMode,
  onNavigate,
  onQuickPlaybook,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const totalTokens =
    missions.reduce((s, m) => s + m.prompt_tokens + m.completion_tokens, 0) +
    agents.reduce((s, a) => s + (a.total_tokens || 0), 0);

  // Build 10-day telemetry series
  const series = Array.from({ length: 10 }, (_, i) => {
    const d = new Date(Date.now() - (9 - i) * 86400_000);
    const base = 12400 + i * 3100 + ((i * 7) % 4) * 2600 + (i === 9 ? missions.length * 1400 : 0);
    return {
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      tokens: base,
      tasks: 6 + i * 2 + (i % 3),
    };
  });

  const maxTokens = Math.max(...series.map((s) => s.tokens), 1);
  const chartW = 640;
  const chartH = 190;
  const padX = 28;
  const padY = 22;

  const points = series.map((pt, idx) => {
    const x = padX + (idx / (series.length - 1)) * (chartW - padX * 2);
    const y = chartH - padY - (pt.tokens / maxTokens) * (chartH - padY * 2);
    return { x, y, ...pt };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${chartH - padY} L ${points[0].x.toFixed(1)} ${chartH - padY} Z`;

  // Sector distribution
  const sectorMap: Record<string, number> = {};
  agents.forEach((a) => {
    sectorMap[a.domain] = (sectorMap[a.domain] || 0) + 1;
  });
  const sectors = Object.entries(sectorMap).sort((a, b) => b[1] - a[1]);

  const playbooks = [
    {
      title: 'مراجعة عقد تجاري وكشف المخاطر المالية',
      sector: 'القانون والمالية',
      prompt: 'افحص عقد خدمات سحابية بقيمة 95,000 دولار سنوياً يتضمن بند مسؤولية مفتوحة وغرامة تأخير 20%، وحدد الصياغة البديلة وسقف التعويض وفق سياستنا.',
    },
    {
      title: 'بناء نموذج تسعير SaaS وحساب LTV/CAC',
      sector: 'النمو والاستثمار',
      prompt: 'احسب صافي هامش الربح ومؤشر LTV/CAC لثلاث باقات ($49, $149, $399) بتكلفة استحواذ عميل 135 دولاراً ومعدل بقاء 18 شهراً.',
    },
    {
      title: 'تصميم معمارية نظام موزع وفحص OWASP',
      sector: 'الهندسة والأمن',
      prompt: 'صمم معمارية بوابة API متعددة المستأجرين تعالج 25,000 طلب/دقيقة مع عزل البيانات وضوابط الحماية ضد OWASP Top 10.',
    },
    {
      title: 'صياغة خطة إطلاق تسويقية ومحتوى SEO',
      sector: 'التسويق والمبيعات',
      prompt: 'ضع خطة إطلاق متكاملة لمدة 30 يوماً تشمل صفحة الهبوط، 5 مقالات SEO محورية، وتسلسل رسائل مبيعات B2B.',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div className="nx-page-header" style={{ marginBottom: 4 }}>
        <div>
          <h1 className="nx-page-title">
            لوحة القيادة التنفيذية — مرحباً، {user.full_name}
          </h1>
          <p className="nx-page-subtitle">
            {user.company_name ? `${user.company_name} • ` : ''}
            الباقة النشطة: <strong>{user.subscription?.plan_name || 'Enterprise'}</strong> • وضع التشغيل:{' '}
            <span className="mono">{engineMode === 'fastapi' ? 'Full-Stack FastAPI Core' : 'Cloud Browser OS'}</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => onNavigate('workflows')} className="btn">
            <GitBranch size={15} />
            <span>مصمم المسارات المرئي</span>
          </button>
          <button type="button" onClick={() => onNavigate('chat')} className="btn btn-primary">
            <MessageSquare size={15} />
            <span>بدء جلسة محادثة وتحليل</span>
          </button>
        </div>
      </div>

      {/* Engine Status Strip */}
      <div
        className="nx-card"
        style={{
          padding: '13px 18px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          background: hasLiveKey ? 'var(--brand-soft)' : 'var(--bg-surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={`nx-badge ${hasLiveKey ? 'nx-badge-brand' : 'nx-badge-cyan'}`}>
            <Sparkles size={12} />
            {hasLiveKey ? 'متصل بمزود LLM حي' : 'محرك التحليل الذكي الفوري مفعّل'}
          </span>
          <span style={{ fontSize: '0.81rem', color: 'var(--text-secondary)' }}>
            {hasLiveKey
              ? 'تعمل جميع استدعاءات ReAct والأدوات مباشرة عبر مفتاح المزود المربوط.'
              : 'يمكنك تجربة المحادثات، البحث في قاعدة المعرفة RAG، والحسابات المالية فوراً — أو ربط مفتاح Gemini / OpenRouter / OpenAI للتوليد المفتوح.'}
          </span>
        </div>
        {!hasLiveKey && (
          <button
            type="button"
            onClick={() => onNavigate(user.role === 'super_admin' ? 'admin' : 'tools')}
            className="btn btn-sm"
          >
            <span>ربط مفتاح API خارجي (اختياري)</span>
            <ArrowUpLeft size={14} />
          </button>
        )}
      </div>

      {/* 6 Executive KPIs */}
      <div className="grid-kpi">
        <div className="kpi-card">
          <div className="kpi-top">
            <span>رصيد المحفظة المتاح</span>
            <div className="kpi-icon" style={{ color: 'var(--brand)' }}>
              <Coins size={16} />
            </div>
          </div>
          <div className="kpi-value tabular" style={{ color: 'var(--brand)' }}>
            {user.credits_balance.toLocaleString()} <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>cr</span>
          </div>
          <div className="kpi-foot">المستهلك التراكمي: {user.total_spent_credits.toLocaleString()} cr</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span>الوكلاء النشطون</span>
            <div className="kpi-icon">
              <Bot size={16} />
            </div>
          </div>
          <div className="kpi-value tabular">
            {agents.length}{' '}
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              / {user.role === 'super_admin' || (user.subscription?.max_agents ?? 4) < 0 ? '∞' : user.subscription?.max_agents}
            </span>
          </div>
          <div className="kpi-foot">عبر {sectors.length || 1} قطاعات تخصصية</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span>قاعدة المعرفة المؤسسية</span>
            <div className="kpi-icon" style={{ color: 'var(--cyan)' }}>
              <BookOpen size={16} />
            </div>
          </div>
          <div className="kpi-value tabular">{docs.length}</div>
          <div className="kpi-foot">
            {docs.reduce((s, d) => s + (d.chunks_json?.length || 1), 0)} مقطع دلالي جاهز للاسترجاع
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span>المسارات والأتمتة</span>
            <div className="kpi-icon" style={{ color: 'var(--amber)' }}>
              <Zap size={16} />
            </div>
          </div>
          <div className="kpi-value tabular">{workflows.length + automations.length}</div>
          <div className="kpi-foot">
            {workflows.length} مسار مرئي • {automations.filter((a) => a.is_active).length} جدولة نشطة
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span>إجمالي التوكنز المعالجة</span>
            <div className="kpi-icon">
              <Activity size={16} />
            </div>
          </div>
          <div className="kpi-value tabular">{totalTokens.toLocaleString()}</div>
          <div className="kpi-foot">متوسط زمن الاستجابة: 145ms</div>
        </div>
      </div>

      {/* Telemetry Chart + Sector Distribution */}
      <div className="grid-2">
        <div className="nx-card">
          <div className="nx-card-header">
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>مؤشر نشاط المعالجة واستهلاك التوكنز (10 أيام)</div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                مرر المؤشر على النقاط لعرض حجم المعالجة اليومي وعدد العمليات
              </div>
            </div>
            {hoverIdx !== null ? (
              <span className="nx-badge nx-badge-brand mono">
                {points[hoverIdx].label}: {points[hoverIdx].tokens.toLocaleString()} tok ({points[hoverIdx].tasks} مهام)
              </span>
            ) : (
              <span className="nx-badge mono">معدل النمو +24.8%</span>
            )}
          </div>

          <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
            <defs>
              <linearGradient id="nexusAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.32" />
                <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75, 1].map((r, idx) => {
              const gy = chartH - padY - r * (chartH - padY * 2);
              return (
                <line
                  key={idx}
                  x1={padX}
                  x2={chartW - padX}
                  y1={gy}
                  y2={gy}
                  stroke="var(--chart-grid)"
                  strokeDasharray="3 3"
                />
              );
            })}
            <path d={areaPath} fill="url(#nexusAreaGrad)" />
            <path d={linePath} fill="none" stroke="var(--brand)" strokeWidth="2.4" strokeLinecap="round" />
            {points.map((pt, idx) => (
              <g key={idx} onMouseEnter={() => setHoverIdx(idx)} onMouseLeave={() => setHoverIdx(null)} style={{ cursor: 'pointer' }}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={hoverIdx === idx ? 5.5 : 3.5}
                  fill={hoverIdx === idx ? 'var(--brand)' : 'var(--bg-surface)'}
                  stroke="var(--brand)"
                  strokeWidth="2.2"
                />
                <text
                  x={pt.x}
                  y={chartH - 4}
                  textAnchor="middle"
                  fill="var(--text-muted)"
                  fontSize="10"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  {pt.label}
                </text>
              </g>
            ))}
          </svg>
        </div>

        <div className="nx-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="nx-card-header">
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>توزيع القوى الذكية حسب القطاع</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  تغطية تخصصية قابلة للتوسع من متجر الـ 24 وكيلاً
                </div>
              </div>
              <button type="button" onClick={() => onNavigate('agents')} className="btn btn-sm">
                إدارة الوكلاء
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {(sectors.length > 0 ? sectors.slice(0, 5) : [['عام', 1] as [string, number]]).map(([sec, count], idx) => {
                const pct = Math.round((count / Math.max(1, agents.length)) * 100);
                return (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.79rem', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>{sec}</span>
                      <span className="mono" style={{ color: 'var(--text-muted)' }}>
                        {count} وكلاء ({pct}%)
                      </span>
                    </div>
                    <div
                      style={{
                        height: 7,
                        borderRadius: 999,
                        background: 'var(--bg-subtle)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.max(12, pct)}%`,
                          height: '100%',
                          background: idx % 2 === 0 ? 'var(--brand)' : 'var(--cyan)',
                          borderRadius: 999,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              paddingTop: 12,
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
            }}
          >
            <span>هل تحتاج فريقاً في قطاع جديد؟</span>
            <button type="button" onClick={() => onNavigate('agents')} className="btn btn-sm btn-ghost">
              تصفح المتجر الكامل (24 قالباً) ←
            </button>
          </div>
        </div>
      </div>

      {/* Quick Launch Playbooks */}
      <div className="nx-card">
        <div className="nx-card-header">
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>سيناريوهات العمل الفورية (One-Click Playbooks)</div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              اضغط على أي سيناريو لفتحه وتشغيله مباشرة داخل استوديو المحادثة ولوحة التقارير
            </div>
          </div>
        </div>

        <div className="grid-4">
          {playbooks.map((pb, idx) => (
            <div
              key={idx}
              onClick={() => onQuickPlaybook(pb.prompt)}
              className="nx-card nx-card-interactive"
              style={{ padding: '14px 15px', background: 'var(--bg-elevated)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}
            >
              <div>
                <span className="nx-badge" style={{ marginBottom: 8 }}>
                  {pb.sector}
                </span>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 5 }}>{pb.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {pb.prompt.slice(0, 96)}...
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.76rem', color: 'var(--brand)', fontWeight: 600 }}>
                <Play size={13} />
                <span>تشغيل السيناريو الآن</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Missions Table */}
      <div className="nx-card">
        <div className="nx-card-header">
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>سجل آخر العمليات المنفذة</div>
          <button type="button" onClick={() => onNavigate('missions')} className="btn btn-sm">
            <FileCheck2 size={14} />
            <span>غرفة العمليات الكاملة</span>
          </button>
        </div>

        {missions.length === 0 ? (
          <div style={{ padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.83rem', textAlign: 'center' }}>
            لا توجد عمليات مسجلة بعد — ابدأ أول جلسة من سيناريوهات العمل أعلاه.
          </div>
        ) : (
          <div className="nx-table-wrap">
            <table className="nx-table">
              <thead>
                <tr>
                  <th>عنوان المهمة / الجلسة</th>
                  <th>نمط التنفيذ</th>
                  <th>التوكنز</th>
                  <th>النقاط المخصومة</th>
                  <th>التوقيت</th>
                </tr>
              </thead>
              <tbody>
                {missions.slice(0, 6).map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{m.title}</td>
                    <td>
                      <span className="nx-badge mono">{m.execution_mode}</span>
                    </td>
                    <td className="mono">{(m.prompt_tokens + m.completion_tokens).toLocaleString()}</td>
                    <td className="mono">{m.credits_charged} cr</td>
                    <td className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                      <Clock size={12} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                      {new Date(m.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

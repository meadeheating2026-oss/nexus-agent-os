import React from 'react';
import {
  Activity,
  ArrowUpLeft,
  Bot,
  Coins,
  Layers,
  Play,
  Plus,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { MissionItem, OverviewData } from '../types';

interface Props {
  overview: OverviewData | null;
  onOpenNewAgent: () => void;
  onNavigateMission: (presetMode?: 'standalone' | 'swarm') => void;
  onInspectMission: (mission: MissionItem) => void;
}

export const CommandCenter: React.FC<Props> = ({
  overview,
  onOpenNewAgent,
  onNavigateMission,
  onInspectMission,
}) => {
  const m = overview?.metrics;

  return (
    <section aria-labelledby="command-center-heading">
      <header className="page-header">
        <div>
          <h1 id="command-center-heading">مركز القيادة والأرباح الشامل</h1>
          <p>
            مراقبة حية لأسطول الوكلاء عبر كافة القطاعات، صافي العائد المالي المزدوج (التشغيل الذاتي + اشتراكات الـ SaaS)، وحوكمة التكلفة الآلية.
          </p>
        </div>
        <div className="header-actions">
          <button
            id="cmd-btn-launch-swarm"
            type="button"
            className="btn btn-secondary"
            onClick={() => onNavigateMission('swarm')}
          >
            <Play size={16} />
            تشغيل مهمة تكاملية
          </button>
          <button
            id="cmd-btn-create-agent"
            type="button"
            className="btn btn-primary"
            onClick={onOpenNewAgent}
          >
            <Plus size={16} />
            إضافة وكيل في أي مجال
          </button>
        </div>
      </header>

      <div className="kpi-strip">
        <div className="kpi-tile">
          <div className="kpi-label">
            <span>صافي الربح الإجمالي</span>
            <Coins size={16} color="var(--emerald)" />
          </div>
          <div className="kpi-value profit">${m ? m.net_profit_usd.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</div>
          <div className="kpi-sub">
            هامش الربح الصافي: <span className="mono">{m ? `${m.profit_margin_pct}%` : '—'}</span> بعد خصم الـ API
          </div>
        </div>

        <div className="kpi-tile">
          <div className="kpi-label">
            <span>عوائد مهام الوكلاء الذاتية</span>
            <Activity size={16} color="var(--amber)" />
          </div>
          <div className="kpi-value">${m ? m.internal_engine_revenue_usd.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</div>
          <div className="kpi-sub">
            إجمالي الدورات المنفذة: <span className="mono">{m?.total_runs ?? 0}</span> مهمة مكتملة
          </div>
        </div>

        <div className="kpi-tile">
          <div className="kpi-label">
            <span>الدخل الشهري المتكرر (SaaS MRR)</span>
            <Users size={16} color="var(--sky)" />
          </div>
          <div className="kpi-value">${m ? m.saas_mrr_usd.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</div>
          <div className="kpi-sub">
            المشتركون النشطون: <span className="mono">{m?.active_saas_clients ?? 0}</span> شركات عميلة
          </div>
        </div>

        <div className="kpi-tile">
          <div className="kpi-label">
            <span>حجم الأسطول والقطاعات</span>
            <Bot size={16} color="var(--emerald)" />
          </div>
          <div className="kpi-value">{m?.total_agents ?? 0}</div>
          <div className="kpi-sub">
            موزعين على <span className="mono">{m?.active_domains ?? 0}</span> مجالات | <span className="mono">{m?.installed_tools_pool ?? 0}</span> أداة قابلة للتركيب
          </div>
        </div>

        <div className="kpi-tile">
          <div className="kpi-label">
            <span>إجمالي تكلفة استهلاك التوكنز</span>
            <ShieldCheck size={16} color="var(--text-secondary)" />
          </div>
          <div className="kpi-value">${m ? m.total_api_cost_usd.toFixed(4) : '0.0000'}</div>
          <div className="kpi-sub">
            تحت رقابة وكيل المدير المالي (CFO Guardrail)
          </div>
        </div>
      </div>

      <div className="split-2">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <Layers size={18} color="var(--emerald)" />
              أداء القطاعات والمجالات النشطة
            </div>
            <span className="tag tag-emerald">توسع لا نهائي للمجالات</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>المجال / القطاع</th>
                  <th>عدد الوكلاء</th>
                  <th>المهام المنجزة</th>
                  <th>التكلفة</th>
                  <th>العائد المحقق</th>
                </tr>
              </thead>
              <tbody>
                {(overview?.domain_breakdown || []).map((d) => (
                  <tr key={d.domain}>
                    <td style={{ fontWeight: 600 }}>{d.domain}</td>
                    <td>
                      <span className="mono">{d.agents_count}</span>
                    </td>
                    <td>
                      <span className="mono">{d.runs}</span>
                    </td>
                    <td>
                      <span className="mono" style={{ color: 'var(--text-secondary)' }}>
                        ${d.cost_usd.toFixed(4)}
                      </span>
                    </td>
                    <td>
                      <span className="mono" style={{ color: 'var(--emerald)', fontWeight: 600 }}>
                        ${d.revenue_usd.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!overview || overview.domain_breakdown.length === 0) && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      لا توجد قطاعات مسجلة بعد — أضف أول وكيل في أي مجال تريده.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <Activity size={18} color="var(--amber)" />
              أحدث العمليات المنفذة (مستقلة وتكاملية)
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>المهمة</th>
                  <th>الوضع</th>
                  <th>صافي الربح</th>
                  <th>فحص</th>
                </tr>
              </thead>
              <tbody>
                {(overview?.recent_missions || []).map((mis) => (
                  <tr key={mis.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.86rem' }}>{mis.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        جودة QA: <span className="mono">{mis.qa_score}/100</span>
                      </div>
                    </td>
                    <td>
                      <span className={`tag ${mis.mode === 'swarm' ? 'tag-amber' : 'tag-sky'}`}>
                        {mis.mode === 'swarm' ? 'خلية متكاملة' : 'وكيل مستقل'}
                      </span>
                    </td>
                    <td>
                      <span className="mono" style={{ color: 'var(--emerald)', fontWeight: 600 }}>
                        +${mis.net_profit_usd.toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <button
                        id={`inspect-mission-${mis.id}`}
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => onInspectMission(mis)}
                        title="عرض خطوات التنفيذ والمخرج"
                      >
                        <ArrowUpLeft size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};

import React, { useState } from 'react';
import {
  Bell,
  Clock,
  Play,
  Plus,
  Power,
  Radio,
  Trash2,
  Zap,
} from 'lucide-react';
import { CONNECTOR_PLATFORMS } from '../data/enterpriseCatalog';
import { nexusEngine } from '../engine/nexusEngine';
import type { AgentRecord, AutomationRecord, ConnectorRecord } from '../types';

interface Props {
  agents: AgentRecord[];
  automations: AutomationRecord[];
  connectors: ConnectorRecord[];
  onRefresh: () => Promise<void>;
  notify: (msg: string, isError?: boolean) => void;
}

export const AutomationsAndChannelsView: React.FC<Props> = ({
  agents,
  automations,
  connectors,
  onRefresh,
  notify,
}) => {
  const [tab, setTab] = useState<'cron' | 'channels'>('cron');

  // Cron form
  const [autoName, setAutoName] = useState('');
  const [autoAgentId, setAutoAgentId] = useState<number>(agents[0]?.id || 0);
  const [cronPreset, setCronPreset] = useState('0 8 * * *|يومياً 8:00 صباحاً');
  const [autoPrompt, setAutoPrompt] = useState('');
  const [autoChannel, setAutoChannel] = useState('#executive-ops');

  // Connector form
  const [plat, setPlat] = useState<ConnectorRecord['platform']>('telegram');
  const [connName, setConnName] = useState('');
  const [connEndpoint, setConnEndpoint] = useState('');
  const [connTarget, setConnTarget] = useState('');

  async function handleAddAutomation(e: React.FormEvent) {
    e.preventDefault();
    const [expr, label] = cronPreset.split('|');
    const agId = autoAgentId || agents[0]?.id || 0;
    await nexusEngine.createAutomation({
      name: autoName,
      agent_id: agId,
      cron_expression: expr,
      schedule_label: label,
      goal_prompt: autoPrompt,
      channel_target: autoChannel,
    });
    await onRefresh();
    setAutoName('');
    setAutoPrompt('');
    notify('تمت جدولة المهمة الدورية بنجاح.');
  }

  async function handleRunAutomationNow(au: AutomationRecord) {
    try {
      await nexusEngine.executeMission({
        title: `[تشغيل مجدول] ${au.name}`,
        goal_prompt: au.goal_prompt,
        execution_mode: 'standalone',
        agent_ids: [au.agent_id],
      });
      await onRefresh();
      notify(`تم تنفيذ الجدولة "${au.name}" فوراً وإرسال الملخص إلى ${au.channel_target || 'سجل العمليات'}.`);
    } catch (err) {
      notify((err as Error).message, true);
    }
  }

  async function handleAddConnector(e: React.FormEvent) {
    e.preventDefault();
    await nexusEngine.createConnector({
      platform: plat,
      name: connName,
      endpoint_or_token: connEndpoint,
      target_channel: connTarget,
    });
    await onRefresh();
    setConnName('');
    setConnEndpoint('');
    setConnTarget('');
    notify('تم ربط قناة الاتصال الخارجية بنجاح.');
  }

  const selectedPlatMeta = CONNECTOR_PLATFORMS.find((p) => p.id === plat) || CONNECTOR_PLATFORMS[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="nx-page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="nx-page-title">الأتمتة المجدولة وقنوات الربط الخارجية (Cron & Channels Hub)</h1>
          <p className="nx-page-subtitle">
            شغّل الوكلاء تلقائياً على مدار الساعة واربط مخرجاتهم مع Telegram و WhatsApp و Slack و REST Webhooks
          </p>
        </div>
      </div>

      <div className="seg-tabs" style={{ alignSelf: 'flex-start' }}>
        <button type="button" onClick={() => setTab('cron')} className={`seg-tab ${tab === 'cron' ? 'active' : ''}`}>
          <Clock size={14} />
          <span>المهام الدورية المجدولة ({automations.length})</span>
        </button>
        <button type="button" onClick={() => setTab('channels')} className={`seg-tab ${tab === 'channels' ? 'active' : ''}`}>
          <Radio size={14} />
          <span>قنوات الربط والتنبيهات ({connectors.length})</span>
        </button>
      </div>

      {tab === 'cron' ? (
        <div className="grid-2">
          <div className="nx-card">
            <div style={{ fontWeight: 700, fontSize: '0.96rem', marginBottom: 12 }}>
              <Plus size={15} style={{ verticalAlign: 'middle', marginInlineEnd: 6 }} />
              إنشاء جدولة أتمتة ذاتية (Autonomous Cron)
            </div>
            <form onSubmit={handleAddAutomation} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="nx-label">اسم الجدولة الدورية</label>
                <input
                  className="nx-input"
                  required
                  value={autoName}
                  onChange={(e) => setAutoName(e.target.value)}
                  placeholder="مثال: الملخص المالي الصباحي للإدارة"
                />
              </div>

              <div className="grid-2">
                <div>
                  <label className="nx-label">الوكيل المنفّذ</label>
                  <select
                    className="nx-select"
                    value={autoAgentId}
                    onChange={(e) => setAutoAgentId(Number(e.target.value))}
                  >
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="nx-label">دورية التكرار (Cron)</label>
                  <select className="nx-select" value={cronPreset} onChange={(e) => setCronPreset(e.target.value)}>
                    <option value="0 * * * *|كل ساعة">كل ساعة (0 * * * *)</option>
                    <option value="0 8 * * *|يومياً 8:00 صباحاً">يومياً 8:00 صباحاً</option>
                    <option value="0 18 * * *|يومياً 6:00 مساءً">يومياً 6:00 مساءً</option>
                    <option value="0 9 * * 1|أسبوعياً كل إثنين">أسبوعياً كل إثنين 9:00 صباحاً</option>
                    <option value="0 9 1 * *|مطلع كل شهر">مطلع كل شهر ميلادي</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="nx-label">قناة الإرسال المستهدفة</label>
                <input
                  className="nx-input mono"
                  dir="ltr"
                  value={autoChannel}
                  onChange={(e) => setAutoChannel(e.target.value)}
                  placeholder="#executive-ops / @telegram_channel"
                />
              </div>

              <div>
                <label className="nx-label">تعليمات المهمة الدورية</label>
                <textarea
                  className="nx-textarea"
                  required
                  value={autoPrompt}
                  onChange={(e) => setAutoPrompt(e.target.value)}
                  placeholder="راجع مؤشرات الأداء والفواتير المعلقة وأصدر تقريراً تنفيذياً مختصراً..."
                />
              </div>

              <button type="submit" className="btn btn-primary">
                <Zap size={14} />
                <span>تفعيل الجدولة التلقائية</span>
              </button>
            </form>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {automations.map((au) => (
              <div key={au.id} className="nx-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{au.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {au.agent_name} • <span className="mono">{au.schedule_label}</span> ({au.cron_expression})
                    </div>
                  </div>
                  <span className={`nx-badge ${au.is_active ? 'nx-badge-brand' : ''}`}>
                    {au.is_active ? 'نشط' : 'متوقف'}
                  </span>
                </div>

                <div style={{ fontSize: '0.79rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                  {au.goal_prompt}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                  <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    الوجهة: {au.channel_target || 'داخلي'}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" onClick={() => handleRunAutomationNow(au)} className="btn btn-sm btn-primary">
                      <Play size={12} />
                      <span>تشغيل الآن</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await nexusEngine.toggleAutomation(au.id);
                        await onRefresh();
                      }}
                      className="btn btn-sm"
                    >
                      <Power size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await nexusEngine.deleteAutomation(au.id);
                        await onRefresh();
                      }}
                      className="btn btn-sm btn-danger"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid-2">
          <div className="nx-card">
            <div style={{ fontWeight: 700, fontSize: '0.96rem', marginBottom: 12 }}>
              ربط قناة تواصل أو Webhook خارجي جديد
            </div>
            <form onSubmit={handleAddConnector} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="nx-label">المنصة الخارجية</label>
                <select
                  className="nx-select"
                  value={plat}
                  onChange={(e) => setPlat(e.target.value as ConnectorRecord['platform'])}
                >
                  {CONNECTOR_PLATFORMS.map((cp) => (
                    <option key={cp.id} value={cp.id}>
                      {cp.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="nx-label">اسم الموصل التعريفي</label>
                <input
                  className="nx-input"
                  required
                  value={connName}
                  onChange={(e) => setConnName(e.target.value)}
                  placeholder="مثال: إشعارات مبيعات واتساب"
                />
              </div>
              <div>
                <label className="nx-label">رابط الـ Webhook أو API Endpoint</label>
                <input
                  className="nx-input mono"
                  dir="ltr"
                  required
                  value={connEndpoint}
                  onChange={(e) => setConnEndpoint(e.target.value)}
                  placeholder={selectedPlatMeta.placeholder}
                />
              </div>
              <div>
                <label className="nx-label">القناة / المعرّف المستهدف</label>
                <input
                  className="nx-input mono"
                  dir="ltr"
                  value={connTarget}
                  onChange={(e) => setConnTarget(e.target.value)}
                  placeholder={selectedPlatMeta.channelHint}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                <Bell size={14} />
                <span>حفظ وتفعيل الموصل</span>
              </button>
            </form>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {connectors.map((c) => (
              <div key={c.id} className="nx-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <span className="nx-badge nx-badge-cyan mono">{c.platform.toUpperCase()}</span>
                </div>
                <div className="mono" style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginBottom: 10 }} dir="ltr">
                  {c.endpoint_or_token.slice(0, 56)}...
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
                  <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {c.target_channel}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={async () => {
                        const msg = await nexusEngine.testConnector(c.id);
                        await onRefresh();
                        notify(msg);
                      }}
                      className="btn btn-sm"
                    >
                      اختبار Ping
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await nexusEngine.deleteConnector(c.id);
                        await onRefresh();
                      }}
                      className="btn btn-sm btn-danger"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

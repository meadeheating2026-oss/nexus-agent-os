import React, { useEffect, useState } from 'react';
import {
  Check,
  Cpu,
  DollarSign,
  Shield,
  Ticket,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { nexusEngine } from '../engine/nexusEngine';
import type {
  AdminOverviewStats,
  InvoiceRecord,
  SubscriptionPlan,
  UserProfile,
  VoucherRecord,
} from '../types';

interface Props {
  plans: SubscriptionPlan[];
  onGlobalRefresh: () => Promise<void>;
  notify: (msg: string, isError?: boolean) => void;
}

export const SuperAdminConsole: React.FC<Props> = ({
  plans,
  onGlobalRefresh,
  notify,
}) => {
  const [subTab, setSubTab] = useState<'finance' | 'engine' | 'users' | 'vouchers'>('finance');
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [vouchers, setVouchers] = useState<VoucherRecord[]>([]);

  // Engine Config
  const [provider, setProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [markup, setMarkup] = useState(4.0);
  const [allowByok, setAllowByok] = useState(true);

  // Voucher form
  const [vCode, setVCode] = useState('');
  const [vPlanId, setVPlanId] = useState<number>(2);
  const [vCredits, setVCredits] = useState(10000);

  // Credit grant modal
  const [creditTargetUser, setCreditTargetUser] = useState<UserProfile | null>(null);
  const [creditDelta, setCreditDelta] = useState(5000);

  async function loadAdmin() {
    const data = await nexusEngine.getAdminOverview();
    setStats(data.stats);
    setUsers(data.users);
    setInvoices(data.invoices);
    setVouchers(data.vouchers);
    setProvider(data.config.active_llm_provider);
    setMarkup(data.config.markup_multiplier);
    setAllowByok(data.config.allow_tenant_byok);
  }

  useEffect(() => {
    loadAdmin();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="nx-page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="nx-page-title">لوحة مالك المنصة والتحكم المالي (Super Admin Console)</h1>
          <p className="nx-page-subtitle">
            إدارة الإيرادات، هامش الربح المركزي، اعتماد الفواتير، وحسابات المستأجرين
          </p>
        </div>
        <span className="nx-badge nx-badge-amber">
          <Shield size={13} />
          صلاحيات المالك التنفيذية
        </span>
      </div>

      {/* Executive Financial KPIs */}
      {stats && (
        <div className="grid-kpi">
          <div className="kpi-card">
            <div className="kpi-top">
              <span>إجمالي الإيرادات المحصلة</span>
              <DollarSign size={16} style={{ color: 'var(--brand)' }} />
            </div>
            <div className="kpi-value tabular" style={{ color: 'var(--brand)' }} dir="ltr">
              ${stats.paid_revenue_usd.toLocaleString()}
            </div>
            <div className="kpi-foot">{stats.pending_invoices_count} فواتير بانتظار الاعتماد</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-top">
              <span>صافي ربح المنصة</span>
              <TrendingUp size={16} style={{ color: 'var(--brand)' }} />
            </div>
            <div className="kpi-value tabular" dir="ltr">
              ${stats.usage_net_profit_usd.toLocaleString()}
            </div>
            <div className="kpi-foot">معامل الربح: {markup}x على تكلفة المزود</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-top">
              <span>تكلفة API بالجملة</span>
              <Cpu size={16} />
            </div>
            <div className="kpi-value tabular" dir="ltr">
              ${stats.total_wholesale_api_cost_usd}
            </div>
            <div className="kpi-foot">عبر {stats.total_missions_executed} مهمة منفذة</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-top">
              <span>إجمالي المستأجرين</span>
              <Users size={16} style={{ color: 'var(--cyan)' }} />
            </div>
            <div className="kpi-value tabular">{stats.total_subscribers}</div>
            <div className="kpi-foot">مساحات عمل معزولة بالكامل</div>
          </div>
        </div>
      )}

      <div className="seg-tabs" style={{ alignSelf: 'flex-start' }}>
        <button type="button" onClick={() => setSubTab('finance')} className={`seg-tab ${subTab === 'finance' ? 'active' : ''}`}>
          الفواتير وعوائد التشغيل ({invoices.filter((i) => i.status === 'pending').length} معلقة)
        </button>
        <button type="button" onClick={() => setSubTab('engine')} className={`seg-tab ${subTab === 'engine' ? 'active' : ''}`}>
          المحرك المركزي وهامش الربح
        </button>
        <button type="button" onClick={() => setSubTab('users')} className={`seg-tab ${subTab === 'users' ? 'active' : ''}`}>
          إدارة المشتركين ({users.length})
        </button>
        <button type="button" onClick={() => setSubTab('vouchers')} className={`seg-tab ${subTab === 'vouchers' ? 'active' : ''}`}>
          قسائم الترقية ({vouchers.length})
        </button>
      </div>

      {subTab === 'finance' && stats && (
        <div className="grid-2">
          {/* Pending & Paid Invoices */}
          <div className="nx-card">
            <div style={{ fontWeight: 700, marginBottom: 12 }}>طلبات الفواتير والتحويلات البنكية</div>
            <div className="nx-table-wrap">
              <table className="nx-table">
                <thead>
                  <tr>
                    <th>الفاتورة</th>
                    <th>العميل</th>
                    <th>المبلغ</th>
                    <th>المرجع</th>
                    <th>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="mono">{inv.invoice_number}</td>
                      <td>{inv.user_name || inv.user_email}</td>
                      <td className="mono">${inv.amount_usd}</td>
                      <td className="mono">{inv.payment_reference}</td>
                      <td>
                        {inv.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: 5 }}>
                            <button
                              type="button"
                              onClick={async () => {
                                await nexusEngine.adminApproveInvoice(inv.id);
                                await loadAdmin();
                                await onGlobalRefresh();
                                notify(`تم اعتماد الفاتورة ${inv.invoice_number} وشحن نقاط العميل.`);
                              }}
                              className="btn btn-sm btn-primary"
                            >
                              <Check size={12} />
                              اعتماد
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await nexusEngine.adminRejectInvoice(inv.id);
                                await loadAdmin();
                              }}
                              className="btn btn-sm btn-danger"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <span className={`nx-badge ${inv.status === 'paid' ? 'nx-badge-brand' : 'nx-badge-danger'}`}>
                            {inv.status === 'paid' ? 'معتمدة' : 'مرفوضة'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daily Revenue Bar Chart */}
          <div className="nx-card">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>نمو العوائد اليومية مقابل تكلفة الـ API</div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: 14 }}>
              هامش الربح الصافي يتجاوز 84% بفضل التسعير الذكي للباقات والنقاط
            </div>

            <svg viewBox="0 0 460 180" style={{ width: '100%', height: 'auto' }}>
              {stats.daily_telemetry.map((d, idx) => {
                const maxRev = 220;
                const bh = Math.min(130, (d.revenue_usd / maxRev) * 130);
                const x = 18 + idx * 44;
                return (
                  <g key={idx}>
                    <rect
                      x={x}
                      y={150 - bh}
                      width="24"
                      height={bh}
                      rx="5"
                      fill="var(--brand)"
                      opacity={0.85}
                    />
                    <text
                      x={x + 12}
                      y={168}
                      textAnchor="middle"
                      fontSize="9.5"
                      fill="var(--text-muted)"
                      fontFamily="IBM Plex Mono, monospace"
                    >
                      {d.day}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {subTab === 'engine' && (
        <div className="nx-card" style={{ maxWidth: 660 }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 12 }}>
            إعدادات محرك النماذج المركزي ومعامل الربح (Central LLM Gateway)
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await nexusEngine.adminSaveConfig({
                provider,
                api_key: apiKey,
                markup_multiplier: markup,
                allow_tenant_byok: allowByok,
              });
              setApiKey('');
              await loadAdmin();
              await onGlobalRefresh();
              notify('تم تحديث إعدادات المحرك المركزي ومعامل التسعير بنجاح.');
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 13 }}
          >
            <div className="grid-2">
              <div>
                <label className="nx-label">المزود المركزي الافتراضي</label>
                <select className="nx-select" value={provider} onChange={(e) => setProvider(e.target.value)}>
                  <option value="gemini">Google Gemini (AI Studio)</option>
                  <option value="openrouter">OpenRouter (Multi-Model)</option>
                  <option value="openai">OpenAI Official</option>
                </select>
              </div>
              <div>
                <label className="nx-label">معامل مضاعفة الربح (Markup Multiplier)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  className="nx-input mono"
                  value={markup}
                  onChange={(e) => setMarkup(Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label className="nx-label">مفتاح الـ API المركزي للمنصة</label>
              <input
                type="password"
                dir="ltr"
                className="nx-input mono"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="أدخل مفتاح Gemini أو OpenRouter أو OpenAI لتفعيل التوليد المركزي..."
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.83rem' }}>
              <input type="checkbox" checked={allowByok} onChange={(e) => setAllowByok(e.target.checked)} />
              <span>السماح للمشتركين بإدخال مفاتيحهم الخاصة (Tenant BYOK)</span>
            </label>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary">
                حفظ الإعدادات المركزية
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await nexusEngine.testLiveLlmKey(provider, apiKey);
                    notify(res);
                  } catch (err) {
                    notify((err as Error).message, true);
                  }
                }}
                className="btn"
              >
                اختبار زمن الاستجابة (Ping)
              </button>
            </div>
          </form>
        </div>
      )}

      {subTab === 'users' && (
        <div className="nx-card">
          <div style={{ fontWeight: 700, marginBottom: 12 }}>سجل حسابات المستأجرين والمحافظ</div>
          <div className="nx-table-wrap">
            <table className="nx-table">
              <thead>
                <tr>
                  <th>المشترك</th>
                  <th>البريد</th>
                  <th>الباقة</th>
                  <th>الرصيد الحالي</th>
                  <th>إدارة الرصيد</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>
                      {u.full_name} {u.company_name ? `(${u.company_name})` : ''}
                    </td>
                    <td className="mono">{u.email}</td>
                    <td>
                      <span className="nx-badge">{u.subscription?.plan_name}</span>
                    </td>
                    <td className="mono">{u.credits_balance.toLocaleString()} cr</td>
                    <td>
                      <button type="button" onClick={() => setCreditTargetUser(u)} className="btn btn-sm">
                        شحن / تعديل نقاط
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'vouchers' && (
        <div className="grid-2">
          <div className="nx-card">
            <div style={{ fontWeight: 700, marginBottom: 12 }}>
              <Ticket size={15} style={{ verticalAlign: 'middle', marginInlineEnd: 6 }} />
              إصدار قسيمة ترويجية جديدة
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await nexusEngine.adminCreateVoucher(vCode, vPlanId, vCredits);
                setVCode('');
                await loadAdmin();
                notify('تم إصدار القسيمة الترويجية بنجاح.');
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 11 }}
            >
              <div>
                <label className="nx-label">كود القسيمة</label>
                <input
                  className="nx-input mono"
                  dir="ltr"
                  required
                  value={vCode}
                  onChange={(e) => setVCode(e.target.value)}
                  placeholder="MENA2026"
                />
              </div>
              <div className="grid-2">
                <div>
                  <label className="nx-label">ترقية للباقة</label>
                  <select className="nx-select" value={vPlanId} onChange={(e) => setVPlanId(Number(e.target.value))}>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name_ar}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="nx-label">نقاط هدية إضافية</label>
                  <input
                    type="number"
                    className="nx-input mono"
                    value={vCredits}
                    onChange={(e) => setVCredits(Number(e.target.value))}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">
                إنشاء القسيمة
              </button>
            </form>
          </div>

          <div className="nx-card">
            <div style={{ fontWeight: 700, marginBottom: 12 }}>القسائم الفعالة</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {vouchers.map((v, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <strong className="mono" style={{ color: 'var(--brand)' }}>
                    {v.code}
                  </strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    +{v.bonus_credits.toLocaleString()} cr ({v.used_count}/{v.max_uses})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Admin Credit Grant Modal */}
      {creditTargetUser && (
        <div className="nx-modal-backdrop" onClick={() => setCreditTargetUser(null)}>
          <div className="nx-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>
              تعديل رصيد نقاط: {creditTargetUser.full_name}
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await nexusEngine.adminAdjustUserCredits(creditTargetUser.id, creditDelta, 'شحن إداري مباشر');
                setCreditTargetUser(null);
                await loadAdmin();
                await onGlobalRefresh();
                notify('تم تحديث رصيد المشترك بنجاح.');
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <div>
                <label className="nx-label">عدد النقاط المراد إضافتها (أو سالب للخصم)</label>
                <input
                  type="number"
                  className="nx-input mono"
                  value={creditDelta}
                  onChange={(e) => setCreditDelta(Number(e.target.value))}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => setCreditTargetUser(null)} className="btn">
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  تنفيذ التعديل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

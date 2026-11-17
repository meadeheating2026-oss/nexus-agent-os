import React, { useEffect, useState } from 'react';
import { Check, Coins, KeyRound, Shield, Ticket, Users } from 'lucide-react';
import { enterpriseApi } from '../api';
import type { InvoiceRecord, SubscriptionPlan } from '../types';

interface Props {
  plans: SubscriptionPlan[];
  onConfigChanged: () => Promise<void>;
}

export const SuperAdminPanel: React.FC<Props> = ({ plans, onConfigChanged }) => {
  const [adminTab, setAdminTab] = useState<'finance' | 'users' | 'invoices' | 'engine'>('finance');
  const [overview, setOverview] = useState<Record<string, number>>({});
  const [usersList, setUsersList] = useState<Array<Record<string, unknown>>>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [vouchers, setVouchers] = useState<Array<Record<string, unknown>>>([]);
  const [cfg, setCfg] = useState<Record<string, unknown>>({});

  // Config inputs
  const [platformName, setPlatformName] = useState('Nexus AgentOS Enterprise');
  const [provider, setProvider] = useState('openrouter');
  const [orKey, setOrKey] = useState('');
  const [gmKey, setGmKey] = useState('');
  const [oaKey, setOaKey] = useState('');
  const [markupX, setMarkupX] = useState(4.0);
  const [stripeSk, setStripeSk] = useState('');
  const [stripeWh, setStripeWh] = useState('');
  const [manualInst, setManualInst] = useState('');
  const [pingStatus, setPingStatus] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);

  // Voucher creator
  const [vCode, setVCode] = useState('');
  const [vPlanId, setVPlanId] = useState<string>('');
  const [vCredits, setVCredits] = useState(10000);

  async function loadAdminData() {
    const [ov, us, invs, vcs, c] = await Promise.all([
      enterpriseApi.adminOverview(),
      enterpriseApi.adminUsers(),
      enterpriseApi.adminInvoices(),
      enterpriseApi.adminVouchers(),
      enterpriseApi.adminGetConfig(),
    ]);
    setOverview(ov);
    setUsersList(us);
    setInvoices(invs);
    setVouchers(vcs);
    setCfg(c);
    setPlatformName(String(c.platform_name || 'Nexus AgentOS Enterprise'));
    setProvider(String(c.active_llm_provider || 'openrouter'));
    setMarkupX(Number(c.markup_multiplier || 4.0));
    setManualInst(String(c.manual_payment_instructions || ''));
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  async function handleSaveEngine(e: React.FormEvent) {
    e.preventDefault();
    await enterpriseApi.adminUpdateConfig({
      platform_name: platformName,
      active_llm_provider: provider,
      openrouter_api_key: orKey,
      gemini_api_key: gmKey,
      openai_api_key: oaKey,
      markup_multiplier: Number(markupX),
      stripe_secret_key: stripeSk,
      stripe_webhook_secret: stripeWh,
      manual_payment_instructions: manualInst,
    });
    setOrKey('');
    setGmKey('');
    setOaKey('');
    setStripeSk('');
    setStripeWh('');
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
    await loadAdminData();
    await onConfigChanged();
  }

  async function handleTestConnection() {
    setPingStatus('جاري اختبار الاتصال الفعلي بالموديل...');
    const activeInputKey = provider === 'gemini' ? gmKey : provider === 'openai' ? oaKey : orKey;
    try {
      const res = await enterpriseApi.adminTestLlm(provider, activeInputKey);
      setPingStatus(`✓ اتصال حي ناجح! الموديل: ${res.model} | زمن الاستجابة: ${res.latency_ms}ms | الرد: ${res.sample_reply}`);
    } catch (err: unknown) {
      setPingStatus(`✕ فشل الاتصال: ${err instanceof Error ? err.message : 'خطأ'}`);
    }
  }

  async function handleCreateVoucher(e: React.FormEvent) {
    e.preventDefault();
    await enterpriseApi.adminCreateVoucher({
      code: vCode,
      plan_id: vPlanId ? Number(vPlanId) : null,
      bonus_credits: Number(vCredits),
      max_uses: 25,
    });
    setVCode('');
    await loadAdminData();
  }

  return (
    <section aria-labelledby="super-admin-heading">
      <header className="page-header">
        <div>
          <h1 id="super-admin-heading">لوحة الإدارة العليا لمالك المنصة (Super Admin Console)</h1>
          <p>
            تحكم مركزي كامل في المشتركين، الفواتير، أسعار الباقات، أكواد التفعيل، هوامش ربح التوكنز، ومفاتيح الذكاء الاصطناعي وبوابات الدفع.
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className={`btn ${adminTab === 'finance' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAdminTab('finance')}>
            <Coins size={15} /> الأرباح والأكواد
          </button>
          <button type="button" className={`btn ${adminTab === 'users' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAdminTab('users')}>
            <Users size={15} /> المشتركون ({usersList.length})
          </button>
          <button type="button" className={`btn ${adminTab === 'invoices' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAdminTab('invoices')}>
            <Shield size={15} /> الفواتير ({overview.pending_invoices_count || 0} معلق)
          </button>
          <button type="button" className={`btn ${adminTab === 'engine' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAdminTab('engine')}>
            <KeyRound size={15} /> مفاتيح الـ LLM وStripe
          </button>
        </div>
      </header>

      <div className="kpi-strip">
        <div className="kpi-tile">
          <div className="kpi-label">صافي ربح المنصة المحقق</div>
          <div className="kpi-value profit">${(overview.net_platform_profit_usd || 0).toFixed(2)}</div>
          <div className="kpi-sub">بعد خصم تكلفة الـ API الفعلية بالجملة</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-label">العائد الشهري المتكرر (MRR)</div>
          <div className="kpi-value">${(overview.mrr_usd || 0).toFixed(2)}</div>
          <div className="kpi-sub">من الاشتراكات النشطة حالياً</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-label">الفواتير المحصلة فعلياً</div>
          <div className="kpi-value">${(overview.paid_invoices_usd || 0).toFixed(2)}</div>
          <div className="kpi-sub">{overview.pending_invoices_count || 0} فواتير بانتظار الاعتماد</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-label">تكلفة الـ API بالجملة</div>
          <div className="kpi-value">${(overview.wholesale_api_cost_usd || 0).toFixed(4)}</div>
          <div className="kpi-sub">هامش ربح التوكنز: ${(overview.token_markup_profit_usd || 0).toFixed(4)}</div>
        </div>
      </div>

      {adminTab === 'finance' && (
        <div className="split-2">
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">
                <Ticket size={17} color="var(--amber)" />
                توليد أكواد شحن وتفعيل الاشتراكات (Vouchers)
              </div>
            </div>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <form onSubmit={handleCreateVoucher} className="form-grid-3">
                <input
                  type="text"
                  className="input mono"
                  placeholder="كود مثل VIP2027"
                  value={vCode}
                  onChange={(e) => setVCode(e.target.value)}
                />
                <select className="select" value={vPlanId} onChange={(e) => setVPlanId(e.target.value)}>
                  <option value="">شحن نقاط فقط بدون تغيير باقة</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name_ar}
                    </option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="number"
                    className="input mono"
                    value={vCredits}
                    onChange={(e) => setVCredits(Number(e.target.value))}
                  />
                  <button type="submit" className="btn btn-primary">توليد</button>
                </div>
              </form>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>الكود</th>
                    <th>الباقة المرتبطة</th>
                    <th>نقاط إضافية</th>
                    <th>الاستخدام</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map((v) => (
                    <tr key={String(v.id)}>
                      <td className="mono" style={{ color: 'var(--amber)', fontWeight: 700 }}>{String(v.code)}</td>
                      <td>{String(v.plan_name || 'شحن رصيد فقط')}</td>
                      <td className="mono">+{String(v.bonus_credits)}</td>
                      <td className="mono">{String(v.used_count)} / {String(v.max_uses)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">تعديل أسعار وحدود باقات الاشتراك مباشرة</div>
            </div>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {plans.map((p) => (
                <div key={p.id} style={{ padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{p.name_ar}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      السعر الحالي: ${p.monthly_price_usd} | الرصيد: {p.included_credits} | حد الوكلاء: {p.max_agents === -1 ? 'لا نهائي' : p.max_agents}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={async () => {
                      const newPrice = window.prompt('السعر الشهري الجديد بالدولار:', String(p.monthly_price_usd));
                      if (newPrice !== null) {
                        await enterpriseApi.adminUpdatePlan(p.id, { monthly_price_usd: Number(newPrice) });
                        await onConfigChanged();
                      }
                    }}
                  >
                    تعديل السعر
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {adminTab === 'users' && (
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">قاعدة بيانات المشتركين والتحكم في الحسابات</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>المستخدم / الشركة</th>
                  <th>البريد</th>
                  <th>الباقة الحالية</th>
                  <th>رصيد النقاط</th>
                  <th>الحالة</th>
                  <th>إجراءات الإدارة</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={String(u.id)}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{String(u.full_name)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{String(u.company_name || '')}</div>
                    </td>
                    <td className="mono">{String(u.email)}</td>
                    <td>{String(u.plan_name || '—')}</td>
                    <td className="mono" style={{ color: 'var(--emerald)', fontWeight: 600 }}>{String(u.credits_balance)}</td>
                    <td>
                      <span className={`tag ${u.is_active ? 'tag-emerald' : 'tag-danger'}`}>
                        {u.is_active ? 'نشط' : 'موقوف'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                          onClick={async () => {
                            const amt = window.prompt('أدخل عدد النقاط لإضافتها (أو بالسالب للخصم):', '5000');
                            if (amt) {
                              await enterpriseApi.adminAdjustCredits(Number(u.id), Number(amt), 'شحن إداري مباشر');
                              await loadAdminData();
                            }
                          }}
                        >
                          + شحن رصيد
                        </button>
                        {u.role !== 'super_admin' && (
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                            onClick={async () => {
                              await enterpriseApi.adminToggleUser(Number(u.id));
                              await loadAdminData();
                            }}
                          >
                            {u.is_active ? 'إيقاف' : 'تفعيل'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adminTab === 'invoices' && (
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">مراجعة واعتماد فواتير الاشتراكات وطلبات التحويل</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>رقم الفاتورة</th>
                  <th>العميل</th>
                  <th>الباقة</th>
                  <th>المبلغ</th>
                  <th>مرجع الدفع</th>
                  <th>الحالة</th>
                  <th>قرار الاعتماد</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="mono">{inv.invoice_number}</td>
                    <td>{inv.user_email}</td>
                    <td>{inv.plan_name}</td>
                    <td className="mono">${inv.amount_usd}</td>
                    <td className="mono">{inv.payment_reference || inv.payment_method}</td>
                    <td>
                      <span className={`tag ${inv.status === 'paid' ? 'tag-emerald' : inv.status === 'rejected' ? 'tag-danger' : 'tag-amber'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td>
                      {inv.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                            onClick={async () => {
                              await enterpriseApi.adminApproveInvoice(inv.id);
                              await loadAdminData();
                            }}
                          >
                            اعتماد وتفعيل الباقة
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                            onClick={async () => {
                              await enterpriseApi.adminRejectInvoice(inv.id);
                              await loadAdminData();
                            }}
                          >
                            رفض
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adminTab === 'engine' && (
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">إعدادات محرك الذكاء الاصطناعي المركزي وبوابات الدفع</div>
            {savedNotice && (
              <span className="tag tag-emerald">
                <Check size={14} /> تم حفظ الإعدادات بنجاح
              </span>
            )}
          </div>
          <form onSubmit={handleSaveEngine} className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-grid-3">
              <div className="field-group">
                <label className="field-label">اسم المنصة (White-Label)</label>
                <input type="text" className="input" value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
              </div>
              <div className="field-group">
                <label className="field-label">المزود المركزي النشط</label>
                <select className="select" value={provider} onChange={(e) => setProvider(e.target.value)}>
                  <option value="openrouter">OpenRouter (كل الموديلات بمفتاح واحد)</option>
                  <option value="gemini">Google Gemini API مباشر</option>
                  <option value="openai">OpenAI API مباشر</option>
                </select>
              </div>
              <div className="field-group">
                <label className="field-label">مضاعف ربح التوكنز (Markup x)</label>
                <input type="number" step="0.5" min="1" className="input mono" value={markupX} onChange={(e) => setMarkupX(Number(e.target.value))} />
              </div>
            </div>

            <div className="form-grid-3">
              <div className="field-group">
                <label className="field-label">
                  <span>OpenRouter API Key</span>
                  {Boolean(cfg.has_openrouter_key) && <span style={{ color: 'var(--emerald)' }}>محفوظ</span>}
                </label>
                <input type="password" className="input mono" placeholder="sk-or-v1-..." value={orKey} onChange={(e) => setOrKey(e.target.value)} />
              </div>
              <div className="field-group">
                <label className="field-label">
                  <span>Google Gemini API Key</span>
                  {Boolean(cfg.has_gemini_key) && <span style={{ color: 'var(--emerald)' }}>محفوظ</span>}
                </label>
                <input type="password" className="input mono" placeholder="AIzaSy..." value={gmKey} onChange={(e) => setGmKey(e.target.value)} />
              </div>
              <div className="field-group">
                <label className="field-label">
                  <span>OpenAI API Key</span>
                  {Boolean(cfg.has_openai_key) && <span style={{ color: 'var(--emerald)' }}>محفوظ</span>}
                </label>
                <input type="password" className="input mono" placeholder="sk-proj-..." value={oaKey} onChange={(e) => setOaKey(e.target.value)} />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="field-group">
                <label className="field-label">
                  <span>Stripe Secret Key (للدفع بالبطاقات أوتوماتيكياً)</span>
                  {Boolean(cfg.has_stripe_secret) && <span style={{ color: 'var(--emerald)' }}>محفوظ</span>}
                </label>
                <input type="password" className="input mono" placeholder="sk_live_..." value={stripeSk} onChange={(e) => setStripeSk(e.target.value)} />
              </div>
              <div className="field-group">
                <label className="field-label">Stripe Webhook Secret</label>
                <input type="password" className="input mono" placeholder="whsec_..." value={stripeWh} onChange={(e) => setStripeWh(e.target.value)} />
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">تعليمات التحويل المباشر للعملاء (InstaPay / حساب بنكي / فودافون كاش)</label>
              <input type="text" className="input" value={manualInst} onChange={(e) => setManualInst(e.target.value)} />
            </div>

            {pingStatus && (
              <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-canvas)', fontSize: '0.84rem' }}>
                {pingStatus}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-primary">حفظ إعدادات المنصة</button>
              <button type="button" className="btn btn-secondary" onClick={handleTestConnection}>
                اختبار الاتصال الفعلي بالـ LLM الآن
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};

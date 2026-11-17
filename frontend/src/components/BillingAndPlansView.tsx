import React, { useEffect, useState } from 'react';
import { CreditCard, Receipt, Ticket } from 'lucide-react';
import { enterpriseApi } from '../api';
import type {
  InvoiceRecord,
  PublicPlatformInfo,
  SubscriptionPlan,
  UserProfile,
  WalletTxRecord,
} from '../types';

interface Props {
  user: UserProfile;
  publicInfo: PublicPlatformInfo | null;
  onRefreshUser: () => Promise<void>;
}

export const BillingAndPlansView: React.FC<Props> = ({ user, publicInfo, onRefreshUser }) => {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [txs, setTxs] = useState<WalletTxRecord[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [payMethod, setPayMethod] = useState<'manual_transfer' | 'stripe'>('manual_transfer');
  const [payRef, setPayRef] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [statusBanner, setStatusBanner] = useState('');
  const [errBanner, setErrBanner] = useState('');

  async function loadWallet() {
    try {
      const w = await enterpriseApi.getWallet();
      setInvoices(w.invoices);
      setTxs(w.transactions);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadWallet();
  }, [user.credits_balance]);

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlan) return;
    setErrBanner('');
    setStatusBanner('');
    try {
      const res = await enterpriseApi.checkoutPlan(selectedPlan.id, payMethod, payRef);
      if (res.status === 'redirect_stripe' && res.checkout_url) {
        window.location.href = res.checkout_url;
        return;
      }
      setStatusBanner(res.message || `تم إصدار الفاتورة ${res.invoice_number} بنجاح.`);
      setSelectedPlan(null);
      setPayRef('');
      await onRefreshUser();
      await loadWallet();
    } catch (err: unknown) {
      setErrBanner(err instanceof Error ? err.message : 'تعذر إتمام الطلب');
    }
  }

  async function handleRedeemVoucher(e: React.FormEvent) {
    e.preventDefault();
    setErrBanner('');
    setStatusBanner('');
    try {
      await enterpriseApi.redeemVoucher(voucherCode);
      setStatusBanner(`تم تفعيل الكود ${voucherCode.toUpperCase()} وتحديث اشتراكك ورصيدك فوراً!`);
      setVoucherCode('');
      await onRefreshUser();
      await loadWallet();
    } catch (err: unknown) {
      setErrBanner(err instanceof Error ? err.message : 'كود غير صالح');
    }
  }

  return (
    <section aria-labelledby="billing-heading">
      <header className="page-header">
        <div>
          <h1 id="billing-heading">إدارة الاشتراك، المحفظة، والفواتير</h1>
          <p>
            الباقة الحالية: <strong>{user.subscription?.plan_name || 'بدون باقة'}</strong> | الرصيد المتاح:{' '}
            <strong className="mono" style={{ color: 'var(--emerald)' }}>
              {user.credits_balance.toLocaleString()}
            </strong>{' '}
            نقطة.
          </p>
        </div>
      </header>

      {statusBanner && (
        <div style={{ padding: '12px 16px', marginBottom: '18px', borderRadius: 'var(--radius-md)', background: 'var(--emerald-soft)', color: 'var(--emerald)' }}>
          {statusBanner}
        </div>
      )}
      {errBanner && (
        <div style={{ padding: '12px 16px', marginBottom: '18px', borderRadius: 'var(--radius-md)', background: 'var(--danger-soft)', color: 'var(--danger)' }}>
          {errBanner}
        </div>
      )}

      {/* Voucher Instant Activation */}
      <div className="panel" style={{ marginBottom: '22px' }}>
        <div className="panel-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Ticket size={20} color="var(--amber)" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>تفعيل فوري عبر قسيمة اشتراك أو كود شحن (Voucher)</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                أدخل كود التفعيل المسلّم لك لترقية الباقة وإضافة النقاط في نفس اللحظة.
              </div>
            </div>
          </div>
          <form onSubmit={handleRedeemVoucher} style={{ display: 'flex', gap: '8px' }}>
            <input
              id="voucher-code-input"
              type="text"
              className="input mono"
              placeholder="مثال: PRO2026"
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value)}
              required
            />
            <button id="btn-redeem-voucher" type="submit" className="btn btn-amber">
              تفعيل الكود
            </button>
          </form>
        </div>
      </div>

      {/* Plans Upgrade Grid */}
      <div className="pricing-grid" style={{ marginBottom: '24px' }}>
        {(publicInfo?.plans || []).map((plan) => {
          const isCurrent = user.subscription?.plan_code === plan.code;
          return (
            <div key={plan.id} className={`plan-card ${isCurrent ? 'featured' : ''}`}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '0.98rem', fontWeight: 700 }}>{plan.name_ar}</h2>
                  {isCurrent && <span className="tag tag-emerald">باقتك الحالية</span>}
                </div>
                <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--emerald)', margin: '8px 0' }}>
                  ${plan.monthly_price_usd}/mo
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  رصيد: <strong className="mono">{plan.included_credits.toLocaleString()}</strong> نقطة | حد الوكلاء:{' '}
                  <strong>{plan.max_agents === -1 ? 'لا نهائي' : plan.max_agents}</strong>
                </div>
              </div>
              <button
                type="button"
                className={`btn ${isCurrent ? 'btn-secondary' : 'btn-primary'}`}
                onClick={() => setSelectedPlan(plan)}
              >
                <CreditCard size={15} />
                {isCurrent ? 'تجديد / شحن إضافي' : 'ترقية إلى هذه الباقة'}
              </button>
            </div>
          );
        })}
      </div>

      {selectedPlan && (
        <div className="panel" style={{ marginBottom: '24px' }}>
          <div className="panel-header">
            <div className="panel-title">إتمام طلب الاشتراك في: {selectedPlan.name_ar} (${selectedPlan.monthly_price_usd})</div>
          </div>
          <form onSubmit={handleCheckout} className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-grid-2">
              <div className="field-group">
                <label className="field-label">وسيلة الدفع</label>
                <select className="select" value={payMethod} onChange={(e) => setPayMethod(e.target.value as 'manual_transfer' | 'stripe')}>
                  <option value="manual_transfer">تحويل مباشر (InstaPay / فودافون كاش / تحويل بنكي)</option>
                  <option value="stripe">بطاقة ائتمان دولية عبر Stripe Checkout</option>
                </select>
              </div>
              {payMethod === 'manual_transfer' && (
                <div className="field-group">
                  <label className="field-label">رقم مرجع التحويل أو الإيصال *</label>
                  <input
                    type="text"
                    className="input mono"
                    placeholder="INSTAPAY-XXXXXX"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>
            {payMethod === 'manual_transfer' && publicInfo?.manual_payment_instructions && (
              <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                تعليمات التحويل: {publicInfo.manual_payment_instructions}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-primary">تأكيد وإصدار الفاتورة</button>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedPlan(null)}>إلغاء</button>
            </div>
          </form>
        </div>
      )}

      {/* Invoices & Ledger */}
      <div className="split-2">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">
              <Receipt size={17} color="var(--sky)" />
              سجل الفواتير
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>رقم الفاتورة</th>
                  <th>الباقة</th>
                  <th>القيمة</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="mono">{inv.invoice_number}</td>
                    <td>{inv.plan_name || '—'}</td>
                    <td className="mono">${inv.amount_usd}</td>
                    <td>
                      <span
                        className={`tag ${
                          inv.status === 'paid'
                            ? 'tag-emerald'
                            : inv.status === 'rejected'
                            ? 'tag-danger'
                            : 'tag-amber'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">سجل حركات المحفظة واستهلاك التوكنز</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>البيان</th>
                  <th>التغير</th>
                  <th>الرصيد بعد الحركة</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontSize: '0.8rem' }}>{t.reference_note}</td>
                    <td>
                      <span
                        className="mono"
                        style={{ color: t.credits_delta >= 0 ? 'var(--emerald)' : 'var(--amber)', fontWeight: 600 }}
                      >
                        {t.credits_delta >= 0 ? `+${t.credits_delta}` : t.credits_delta}
                      </span>
                    </td>
                    <td className="mono">{t.balance_after}</td>
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

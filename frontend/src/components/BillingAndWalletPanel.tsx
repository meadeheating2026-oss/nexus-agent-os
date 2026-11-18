import React, { useState } from 'react';
import {
  CheckCircle2,
  Coins,
  CreditCard,
  Download,
  Ticket,
  X,
} from 'lucide-react';
import { nexusEngine } from '../engine/nexusEngine';
import type { InvoiceRecord, SubscriptionPlan, UserProfile, WalletTx } from '../types';

interface Props {
  user: UserProfile;
  plans: SubscriptionPlan[];
  paymentInstructions: string;
  txs: WalletTx[];
  invoices: InvoiceRecord[];
  onRefresh: () => Promise<void>;
  notify: (msg: string, isError?: boolean) => void;
}

export const BillingAndWalletPanel: React.FC<Props> = ({
  user,
  plans,
  paymentInstructions,
  txs,
  invoices,
  onRefresh,
  notify,
}) => {
  const [voucherCode, setVoucherCode] = useState('');
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentRef, setPaymentRef] = useState('');

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!voucherCode.trim()) return;
    try {
      const msg = await nexusEngine.redeemVoucher(voucherCode);
      setVoucherCode('');
      await onRefresh();
      notify(msg);
    } catch (err) {
      notify((err as Error).message, true);
    }
  }

  async function handleInvoiceSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!checkoutPlan || !paymentRef.trim()) return;
    try {
      const inv = await nexusEngine.requestManualInvoice(checkoutPlan.id, paymentRef);
      setCheckoutPlan(null);
      setPaymentRef('');
      await onRefresh();
      notify(`تم إصدار الفاتورة ${inv.invoice_number} وإرسالها للاعتماد الفوري.`);
    } catch (err) {
      notify((err as Error).message, true);
    }
  }

  function exportLedgerCsv() {
    const header = 'ID,Type,DeltaCredits,BalanceAfter,Note,CreatedAt\n';
    const rows = txs
      .map((t) => `${t.id},${t.tx_type},${t.credits_delta},${t.balance_after},"${t.reference_note}",${t.created_at}`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = 'nexus-wallet-ledger.csv';
    a.click();
    URL.revokeObjectURL(u);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="nx-page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="nx-page-title">الباقات، محفظة النقاط، والفواتير الضريبية</h1>
          <p className="nx-page-subtitle">
            رصيدك الحالي: <strong className="mono">{user.credits_balance.toLocaleString()} cr</strong> • الباقة الفعالة:{' '}
            <strong>{user.subscription?.plan_name}</strong>
          </p>
        </div>
        <button type="button" onClick={exportLedgerCsv} className="btn">
          <Download size={14} />
          <span>تصدير كشف الحساب (CSV)</span>
        </button>
      </div>

      {/* Voucher Bar */}
      <div className="nx-card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
            <Ticket size={15} style={{ verticalAlign: 'middle', marginInlineEnd: 6, color: 'var(--brand)' }} />
            تفعيل قسيمة ترقية أو شحن رصيد فوري
          </div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            أكواد ترويجية جاهزة للتجربة: <span className="mono">PRO2026</span> | <span className="mono">VIPSWARM</span> |{' '}
            <span className="mono">ENTERPRISE99</span>
          </div>
        </div>
        <form onSubmit={handleRedeem} style={{ display: 'flex', gap: 8 }}>
          <input
            className="nx-input mono"
            dir="ltr"
            style={{ width: 190 }}
            value={voucherCode}
            onChange={(e) => setVoucherCode(e.target.value)}
            placeholder="VIPSWARM"
          />
          <button type="submit" className="btn btn-primary">
            تفعيل الكود
          </button>
        </form>
      </div>

      {/* Plans Grid */}
      <div className="grid-4">
        {plans.map((pl) => {
          const isCurrent = user.subscription?.plan_id === pl.id;
          return (
            <div
              key={pl.id}
              className="nx-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 14,
                borderColor: isCurrent ? 'var(--brand)' : undefined,
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong style={{ fontSize: '0.92rem' }}>{pl.name_ar}</strong>
                  {isCurrent && <span className="nx-badge nx-badge-brand">باقتك الحالية</span>}
                </div>
                <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 8 }} dir="ltr">
                  ${pl.monthly_price_usd}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/mo</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: '0.77rem', color: 'var(--text-secondary)' }}>
                  <div>
                    <CheckCircle2 size={13} style={{ verticalAlign: 'middle', color: 'var(--brand)', marginInlineEnd: 5 }} />
                    {pl.included_credits.toLocaleString()} نقطة شهرياً
                  </div>
                  <div>
                    <CheckCircle2 size={13} style={{ verticalAlign: 'middle', color: 'var(--brand)', marginInlineEnd: 5 }} />
                    حد الوكلاء: {pl.max_agents < 0 ? 'غير محدود' : pl.max_agents}
                  </div>
                  <div>
                    <CheckCircle2 size={13} style={{ verticalAlign: 'middle', color: 'var(--brand)', marginInlineEnd: 5 }} />
                    السرب والمسارات: {pl.allow_swarm ? 'متاح' : 'غير متاح'}
                  </div>
                </div>
              </div>

              {pl.monthly_price_usd > 0 && (
                <button
                  type="button"
                  onClick={() => setCheckoutPlan(pl)}
                  className={`btn ${isCurrent ? '' : 'btn-primary'}`}
                >
                  <CreditCard size={14} />
                  <span>{isCurrent ? 'تجديد / شحن إضافي' : 'ترقية إلى هذه الباقة'}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Invoices & Ledger */}
      <div className="grid-2">
        <div className="nx-card">
          <div style={{ fontWeight: 700, marginBottom: 12 }}>فواتير الاشتراك وطلبات الترقية ({invoices.length})</div>
          {invoices.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>لا توجد فواتير مصدرة بعد.</div>
          ) : (
            <div className="nx-table-wrap">
              <table className="nx-table">
                <thead>
                  <tr>
                    <th>رقم الفاتورة</th>
                    <th>القيمة</th>
                    <th>المرجع</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="mono">{inv.invoice_number}</td>
                      <td className="mono">${inv.amount_usd}</td>
                      <td className="mono">{inv.payment_reference}</td>
                      <td>
                        <span
                          className={`nx-badge ${
                            inv.status === 'paid'
                              ? 'nx-badge-brand'
                              : inv.status === 'pending'
                                ? 'nx-badge-amber'
                                : 'nx-badge-danger'
                          }`}
                        >
                          {inv.status === 'paid' ? 'مدفوعة' : inv.status === 'pending' ? 'قيد المراجعة' : 'مرفوضة'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="nx-card">
          <div style={{ fontWeight: 700, marginBottom: 12 }}>
            <Coins size={15} style={{ verticalAlign: 'middle', marginInlineEnd: 6, color: 'var(--brand)' }} />
            دفتر حركات المحفظة ({txs.length})
          </div>
          <div className="nx-table-wrap">
            <table className="nx-table">
              <thead>
                <tr>
                  <th>البيان</th>
                  <th>الحركة</th>
                  <th>الرصيد بعد</th>
                </tr>
              </thead>
              <tbody>
                {txs.slice(0, 10).map((tx) => (
                  <tr key={tx.id}>
                    <td>{tx.reference_note}</td>
                    <td
                      className="mono"
                      style={{ color: tx.credits_delta >= 0 ? 'var(--brand)' : 'var(--amber)', fontWeight: 600 }}
                      dir="ltr"
                    >
                      {tx.credits_delta >= 0 ? `+${tx.credits_delta}` : tx.credits_delta}
                    </td>
                    <td className="mono">{tx.balance_after.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Custom Checkout Modal (Replaces ugly browser prompt!) */}
      {checkoutPlan && (
        <div className="nx-modal-backdrop" onClick={() => setCheckoutPlan(null)}>
          <div className="nx-modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className="nx-card-header">
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>ترقية الاشتراك — {checkoutPlan.name_ar}</div>
              <button type="button" onClick={() => setCheckoutPlan(null)} className="btn btn-ghost btn-sm">
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                padding: 12,
                borderRadius: 9,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                marginBottom: 14,
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                قيمة الاشتراك: ${checkoutPlan.monthly_price_usd}/شهرياً (+{checkoutPlan.included_credits.toLocaleString()} نقطة)
              </div>
              <div>{paymentInstructions}</div>
            </div>

            <form onSubmit={handleInvoiceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="nx-label">رقم مرجع التحويل البنكي / InstaPay</label>
                <input
                  className="nx-input mono"
                  dir="ltr"
                  required
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="INSTAPAY-2026-99481"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => setCheckoutPlan(null)} className="btn">
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary">
                  إرسال طلب التفعيل الفوري
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Check, Cpu, Lock, ShieldCheck, UserPlus } from 'lucide-react';
import { enterpriseApi, setStoredToken } from '../api';
import type { PublicPlatformInfo, UserProfile } from '../types';

interface Props {
  publicInfo: PublicPlatformInfo | null;
  onAuthenticated: (user: UserProfile) => void;
}

export const AuthGate: React.FC<Props> = ({ publicInfo, onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      if (mode === 'login') {
        const res = await enterpriseApi.login({ email, password });
        setStoredToken(res.access_token);
        onAuthenticated(res.user);
      } else {
        const res = await enterpriseApi.register({
          email,
          password,
          full_name: fullName,
          company_name: companyName,
        });
        setStoredToken(res.access_token);
        onAuthenticated(res.user);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر إتمام العملية');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <header className="auth-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="brand-mark">
            <Cpu size={21} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
              {publicInfo?.platform_name || 'Nexus AgentOS Enterprise'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              منصة SaaS متعددة المستأجرين لبناء وتشغيل وتكامل الوكلاء الأذكياء
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            id="top-switch-login"
            type="button"
            className={`btn ${mode === 'login' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setMode('login')}
          >
            تسجيل الدخول
          </button>
          <button
            id="top-switch-register"
            type="button"
            className={`btn ${mode === 'register' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setMode('register')}
          >
            إنشاء حساب مشترك
          </button>
        </div>
      </header>

      <div className="auth-hero-grid">
        {/* Right side: Value Prop */}
        <div style={{ paddingTop: '12px' }}>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 700, lineHeight: 1.3, marginBottom: '16px' }}>
            نظام تشغيل سحابي لبناء أساطيل الوكلاء المستقلين وتأجيرهم باشتراكات شهرية
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            مساحة عمل معزولة لكل مشترك، تنفيذ فعلي للأدوات (بحث حي، فحص مواقع، REST APIs، بايثون)، تفويض وتكامل تلقائي بين الوكلاء، ومحاسبة دقيقة بالتوكن ونظام النقاط.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem' }}>
              <ShieldCheck size={18} color="var(--emerald)" />
              <span>عزل كامل للبيانات والصلاحيات (Super Admin مقابل حسابات الشركات المشتركة)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem' }}>
              <ShieldCheck size={18} color="var(--emerald)" />
              <span>ربط فعلي بحلقة ReAct Tool-Calling مع Gemini وOpenRouter وOpenAI</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.92rem' }}>
              <ShieldCheck size={18} color="var(--emerald)" />
              <span>مفاتيح API برمجية (sk_nexus_...) وروابط Webhooks خاصة لكل عميل</span>
            </div>
          </div>
        </div>

        {/* Left side: Login / Register Form */}
        <div className="auth-card">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <button
              id="tab-auth-login"
              type="button"
              style={{ flex: 1 }}
              className={`btn ${mode === 'login' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setMode('login');
                setErrorMsg('');
              }}
            >
              <Lock size={15} />
              دخول الحساب
            </button>
            <button
              id="tab-auth-register"
              type="button"
              style={{ flex: 1 }}
              className={`btn ${mode === 'register' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                setMode('register');
                setErrorMsg('');
              }}
            >
              <UserPlus size={15} />
              تسجيل حساب جديد
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {mode === 'register' && (
              <>
                <div className="field-group">
                  <label className="field-label" htmlFor="reg-fullname">الاسم الكامل *</label>
                  <input
                    id="reg-fullname"
                    type="text"
                    className="input"
                    placeholder="مثال: محمد عبد الرحمن"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="field-group">
                  <label className="field-label" htmlFor="reg-company">اسم الشركة أو المؤسسة</label>
                  <input
                    id="reg-company"
                    type="text"
                    className="input"
                    placeholder="مثال: شركة آفاق الرقمية"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="field-group">
              <label className="field-label" htmlFor="auth-email">البريد الإلكتروني *</label>
              <input
                id="auth-email"
                type="email"
                className="input mono"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="auth-password">كلمة المرور *</label>
              <input
                id="auth-password"
                type="password"
                className="input mono"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {errorMsg && (
              <div
                style={{
                  padding: '10px 12px',
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
              id="btn-auth-submit"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px', marginTop: '4px' }}
              disabled={loading}
            >
              {loading
                ? 'جاري التحقق وتوثيق الجلسة...'
                : mode === 'login'
                ? 'تسجيل الدخول إلى المنصة'
                : 'إنشاء الحساب وتفعيل الباقة التجريبية فوراً'}
            </button>

            {mode === 'login' && (
              <div
                style={{
                  marginTop: '8px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>بيانات دخول مالك المنصة الافتراضية (Super Admin):</span>
                <button
                  id="btn-fill-superadmin"
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: '0.76rem', color: 'var(--emerald)' }}
                  onClick={() => {
                    setEmail('admin@nexus-os.io');
                    setPassword('Admin@2026!');
                  }}
                >
                  تعبئة دخول المالك
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Subscription Pricing Plans */}
      <section aria-labelledby="pricing-section-title">
        <div style={{ marginBottom: '20px' }}>
          <h2 id="pricing-section-title" style={{ fontSize: '1.3rem', fontWeight: 700 }}>
            باقات الاشتراك المتاحة للشركات والأفراد
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            ابدأ مجاناً بالباقة التجريبية فور التسجيل، وقم بالترقية في أي لحظة عبر Stripe أو التحويل المباشر أو أكواد التفعيل.
          </p>
        </div>

        <div className="pricing-grid">
          {(publicInfo?.plans || []).map((plan) => (
            <article
              key={plan.id}
              className={`plan-card ${plan.code === 'business_swarm' ? 'featured' : ''}`}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{plan.name_ar}</h3>
                  {plan.code === 'business_swarm' && <span className="tag tag-emerald">الأكثر طلباً</span>}
                </div>
                <div className="mono" style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--emerald)', marginBottom: '8px' }}>
                  ${plan.monthly_price_usd}
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 400 }}>/شهر</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                  {plan.description_ar}
                </p>

                <ul className="plan-feature-list">
                  <li>
                    <Check size={14} color="var(--emerald)" style={{ marginLeft: 6, verticalAlign: 'middle' }} />
                    رصيد شهري: <strong className="mono">{plan.included_credits.toLocaleString()}</strong> نقطة
                  </li>
                  <li>
                    <Check size={14} color="var(--emerald)" style={{ marginLeft: 6, verticalAlign: 'middle' }} />
                    عدد الوكلاء:{' '}
                    <strong>{plan.max_agents === -1 ? 'لا نهائي (Unlimited)' : `حتى ${plan.max_agents} وكيل`}</strong>
                  </li>
                  <li>
                    <Check
                      size={14}
                      color={plan.allow_swarm ? 'var(--emerald)' : 'var(--text-muted)'}
                      style={{ marginLeft: 6, verticalAlign: 'middle' }}
                    />
                    تكامل عدة وكلاء (Swarm): <strong>{plan.allow_swarm ? 'مفعل' : 'غير مشمول'}</strong>
                  </li>
                  <li>
                    <Check
                      size={14}
                      color={plan.allow_custom_tools ? 'var(--emerald)' : 'var(--text-muted)'}
                      style={{ marginLeft: 6, verticalAlign: 'middle' }}
                    />
                    أدوات REST API خاصة: <strong>{plan.allow_custom_tools ? 'مفعل' : 'غير مشمول'}</strong>
                  </li>
                  <li>
                    <Check
                      size={14}
                      color={plan.allow_api_access ? 'var(--emerald)' : 'var(--text-muted)'}
                      style={{ marginLeft: 6, verticalAlign: 'middle' }}
                    />
                    مفاتيح API برمجية خارجية: <strong>{plan.allow_api_access ? 'مفعل' : 'غير مشمول'}</strong>
                  </li>
                </ul>
              </div>

              <button
                id={`select-plan-btn-${plan.code}`}
                type="button"
                className={`btn ${plan.code === 'business_swarm' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setMode('register')}
              >
                ابدأ بهذه الباقة
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

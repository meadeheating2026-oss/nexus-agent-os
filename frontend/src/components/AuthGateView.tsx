import React, { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Bot,
  CheckCircle2,
  Cpu,
  GitBranch,
  Layers,
  Lock,
  MessageSquare,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Zap,
} from 'lucide-react';
import { nexusEngine } from '../engine/nexusEngine';
import type { SubscriptionPlan, ThemeMode, UserProfile } from '../types';

interface Props {
  platformName: string;
  plans: SubscriptionPlan[];
  theme: ThemeMode;
  onToggleTheme: () => void;
  onAuthenticated: (user: UserProfile) => void;
}

export const AuthGateView: React.FC<Props> = ({
  platformName,
  plans,
  theme,
  onToggleTheme,
  onAuthenticated,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('admin@nexus-os.io');
  const [password, setPassword] = useState('Admin@2026!');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user =
        mode === 'login'
          ? await nexusEngine.login(email, password)
          : await nexusEngine.register(fullName, companyName, email, password);
      onAuthenticated(user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function quickDemoLogin(demoEmail: string, demoPass: string) {
    setError('');
    setBusy(true);
    try {
      const user = await nexusEngine.login(demoEmail, demoPass);
      onAuthenticated(user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const capabilities = [
    {
      icon: <MessageSquare size={18} />,
      title: 'محادثة متعددة الأدوار + لوحة مخرجات Canvas',
      desc: 'جلسات حوار مستمرة مع إرفاق ملفات واستخراج تقارير قابلة للتصدير بصيغ MD و JSON و PDF.',
    },
    {
      icon: <GitBranch size={18} />,
      title: 'مصمم مسارات وسرب مرئي (Visual DAG)',
      desc: 'بناء خطوط إنتاج تربط قاعدة المعرفة وعدة وكلاء متخصصين مع تتبع بصري حي لكل عقدة.',
    },
    {
      icon: <BookOpen size={18} />,
      title: 'قاعدة معرفة مؤسسية RAG + ذاكرة دائمة',
      desc: 'ارفع سياسات وعقود شركتك ليعتمد عليها الوكلاء تلقائياً مع استشهادات دقيقة بالمصادر.',
    },
    {
      icon: <Bot size={18} />,
      title: '+24 وكيلاً متخصصاً في 8 قطاعات أعمال',
      desc: 'مالية، عقود قانونية، هندسة وأمن سيبراني، نمو وتسويق، مبيعات B2B، موارد بشرية، وبيانات.',
    },
    {
      icon: <Zap size={18} />,
      title: 'أتمتة مجدولة وقنوات ربط خارجية',
      desc: 'مهام Cron دورية وموصلات جاهزة مع Telegram و WhatsApp و Slack و REST Webhooks.',
    },
    {
      icon: <ShieldCheck size={18} />,
      title: 'بنية SaaS تجارية متعددة المستأجرين',
      desc: 'عزل كامل للبيانات، 4 باقات اشتراك، فواتير وقسائم ترقية، ولوحة ربحية تنفيذية للمالك.',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-canvas)' }}>
      {/* Top Header */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-sidebar)',
          padding: '14px 28px',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div className="brand-logo">
              <Cpu size={19} />
            </div>
            <div>
              <div className="brand-name">{platformName}</div>
              <div className="brand-edition">Enterprise AI Agent Operating System v3.0</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onToggleTheme}
              className="btn btn-sm"
              title="تبديل المظهر الليلي / النهاري"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              <span>{theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => quickDemoLogin('founder@mena-tech.io', 'Demo@2026!')}
              className="btn btn-sm"
            >
              <span>تجربة كعميل مشترك</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => quickDemoLogin('admin@nexus-os.io', 'Admin@2026!')}
              className="btn btn-sm btn-primary"
            >
              <Sparkles size={14} />
              <span>دخول فوري كمالك المنصة (Super Admin)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Split Section */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '36px 24px 64px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 32,
            alignItems: 'start',
          }}
        >
          {/* Right Column: Executive Showcase */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <span className="nx-badge nx-badge-brand" style={{ marginBottom: 12 }}>
                <Layers size={13} />
                الإصدار المؤسسي المتكامل v3.0 — 10 أنظمة تشغيل موحدة
              </span>
              <h1
                style={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  lineHeight: 1.28,
                  margin: '0 0 12px 0',
                  letterSpacing: '-0.02em',
                }}
              >
                نظام التشغيل المؤسسي الشامل لبناء وإدارة وتشغيل فرق الذكاء الاصطناعي
              </h1>
              <p style={{ margin: 0, fontSize: '0.96rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                منصة موحدة تجمع المحادثات متعددة الأدوار، مصمم المسارات المرئي، قواعد المعرفة المؤسسية (RAG)، الأتمتة
                وقنوات التواصل، مع نظام اشتراكات وفوترة متكامل جاهز للتشغيل الفوري.
              </p>
            </div>

            <div className="grid-2" style={{ gap: 12 }}>
              {capabilities.map((cap, idx) => (
                <div key={idx} className="nx-card" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 7,
                        background: 'var(--brand-soft)',
                        color: 'var(--brand)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {cap.icon}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>{cap.title}</div>
                  </div>
                  <div style={{ fontSize: '0.77rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>{cap.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Left Column: Clean Auth Card */}
          <div className="nx-card" style={{ padding: '26px 26px', maxWidth: 460, width: '100%', justifySelf: 'end' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                  {mode === 'login' ? 'تسجيل الدخول إلى مساحة العمل' : 'إنشاء مساحة عمل مشترك جديد'}
                </div>
                <div style={{ fontSize: '0.77rem', color: 'var(--text-muted)' }}>
                  عزل كامل للبيانات والمحفظة والوكلاء لكل مستأجر
                </div>
              </div>
              <Lock size={18} style={{ color: 'var(--brand)' }} />
            </div>

            <div className="seg-tabs" style={{ width: '100%', marginBottom: 18 }}>
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`seg-tab ${mode === 'login' ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                دخول الحساب
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`seg-tab ${mode === 'register' ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                حساب مشترك جديد
              </button>
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'var(--danger-soft)',
                  color: 'var(--danger)',
                  fontSize: '0.8rem',
                  marginBottom: 14,
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {mode === 'register' && (
                <>
                  <div>
                    <label className="nx-label" htmlFor="auth_fullname">
                      الاسم الكامل
                    </label>
                    <input
                      id="auth_fullname"
                      className="nx-input"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="مثال: خالد العتيبي"
                    />
                  </div>
                  <div>
                    <label className="nx-label" htmlFor="auth_company">
                      اسم الشركة / الجهة
                    </label>
                    <input
                      id="auth_company"
                      className="nx-input"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="شركة الحلول الرقمية"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="nx-label" htmlFor="auth_email">
                  البريد الإلكتروني المهني
                </label>
                <input
                  id="auth_email"
                  type="email"
                  dir="ltr"
                  className="nx-input mono"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@nexus-os.io"
                />
              </div>

              <div>
                <label className="nx-label" htmlFor="auth_password">
                  كلمة المرور
                </label>
                <input
                  id="auth_password"
                  type="password"
                  dir="ltr"
                  className="nx-input mono"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <button type="submit" disabled={busy} className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 4 }}>
                <span>{busy ? 'جارٍ التحقق وتجهيز المساحة...' : mode === 'login' ? 'فتح نظام التشغيل' : 'إنشاء الحساب + 500 نقطة مجانية'}</span>
                <ArrowLeft size={16} />
              </button>
            </form>

            <div
              style={{
                marginTop: 18,
                paddingTop: 14,
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ fontWeight: 600 }}>حسابات جاهزة للتجربة بنقرة واحدة:</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setEmail('admin@nexus-os.io');
                    setPassword('Admin@2026!');
                  }}
                  className="btn btn-sm"
                  style={{ flex: 1 }}
                >
                  المالك: admin@nexus-os.io
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setEmail('founder@mena-tech.io');
                    setPassword('Demo@2026!');
                  }}
                  className="btn btn-sm"
                  style={{ flex: 1 }}
                >
                  مشترك: founder@mena-tech.io
                </button>
              </div>
              <div className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.71rem' }}>
                قسائم الترقية الفورية المتاحة: PRO2026 | VIPSWARM | ENTERPRISE99
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Tiers Overview */}
        <section style={{ marginTop: 48 }}>
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 4px 0' }}>
              باقات الاشتراك المؤسسية المعتمدة
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              هيكلة تسعير مرنة تبدأ من التجربة المجانية وحتى المؤسسات غير المحدودة
            </p>
          </div>

          <div className="grid-4">
            {plans.map((pl) => (
              <div key={pl.id} className="nx-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{pl.name_ar}</span>
                    {pl.code === 'business_swarm' && <span className="nx-badge nx-badge-brand">الأكثر طلباً</span>}
                  </div>
                  <div className="mono" style={{ fontSize: '1.65rem', fontWeight: 700, marginBottom: 8 }} dir="ltr">
                    ${pl.monthly_price_usd}
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>/mo</span>
                  </div>
                  <p style={{ fontSize: '0.77rem', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                    {pl.description_ar}
                  </p>
                </div>

                <div
                  style={{
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    fontSize: '0.76rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={14} style={{ color: 'var(--brand)' }} />
                    <span>رصيد شهري: <strong>{pl.included_credits.toLocaleString()}</strong> نقطة</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={14} style={{ color: 'var(--brand)' }} />
                    <span>سعة الوكلاء: <strong>{pl.max_agents < 0 ? 'غير محدود' : `${pl.max_agents} وكيلاً`}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={14} style={{ color: pl.allow_swarm ? 'var(--brand)' : 'var(--text-muted)' }} />
                    <span>السرب والمسارات المرئية: {pl.allow_swarm ? 'مفعّل' : 'ترقية'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 size={14} style={{ color: pl.allow_api_access ? 'var(--brand)' : 'var(--text-muted)' }} />
                    <span>بوابة API وقنوات الربط: {pl.allow_api_access ? 'مفعّل' : 'ترقية'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

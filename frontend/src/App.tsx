import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  Coins,
  Cpu,
  CreditCard,
  GitMerge,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Plus,
  RefreshCw,
  Shield,
  Wrench,
} from 'lucide-react';
import { enterpriseApi, getStoredToken, setStoredToken } from './api';
import { AuthGate } from './components/AuthGate';
import { BillingAndPlansView } from './components/BillingAndPlansView';
import { EnterpriseAgentStudio } from './components/EnterpriseAgentStudio';
import { EnterpriseMissionRoom } from './components/EnterpriseMissionRoom';
import { SuperAdminPanel } from './components/SuperAdminPanel';
import { ToolsAndApiPortal } from './components/ToolsAndApiPortal';
import type {
  AgentRecord,
  DeveloperKeyRecord,
  MissionRecord,
  PublicPlatformInfo,
  ToolRecord,
  UserProfile,
} from './types';

type TabId = 'dashboard' | 'agents' | 'missions' | 'tools' | 'billing' | 'admin';

export const App: React.FC = () => {
  const [booting, setBooting] = useState(true);
  const [publicInfo, setPublicInfo] = useState<PublicPlatformInfo | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  // Workspace state
  const [llmReady, setLlmReady] = useState(false);
  const [stats, setStats] = useState({
    private_agents_count: 0,
    marketplace_agents_count: 0,
    custom_domains_count: 0,
    missions_count: 0,
    total_tokens_processed: 0,
  });
  const [domains, setDomains] = useState<string[]>([]);
  const [myAgents, setMyAgents] = useState<AgentRecord[]>([]);
  const [marketplaceAgents, setMarketplaceAgents] = useState<AgentRecord[]>([]);
  const [tools, setTools] = useState<ToolRecord[]>([]);
  const [missions, setMissions] = useState<MissionRecord[]>([]);
  const [devKeys, setDevKeys] = useState<DeveloperKeyRecord[]>([]);

  // Pre-filled mission params when clicking "Run" from an agent card
  const [presetMode, setPresetMode] = useState<'standalone' | 'swarm_sequential' | 'swarm_orchestrated'>('standalone');
  const [presetAgentIds, setPresetAgentIds] = useState<number[]>([]);

  const loadPublic = useCallback(async () => {
    try {
      const info = await enterpriseApi.getPublicInfo();
      setPublicInfo(info);
    } catch {
      // Backend might be initializing
    }
  }, []);

  const loadWorkspace = useCallback(async () => {
    try {
      const [dash, agentLists, toolList, missionList] = await Promise.all([
        enterpriseApi.getDashboard(),
        enterpriseApi.listAgents(),
        enterpriseApi.listTools(),
        enterpriseApi.listMissions(),
      ]);
      setUser(dash.user);
      setLlmReady(dash.llm_ready);
      setStats(dash.stats);
      setDomains(dash.domains);
      setMyAgents(agentLists.my_agents);
      setMarketplaceAgents(agentLists.marketplace_agents);
      setTools(toolList);
      setMissions(missionList);

      if (dash.user.role === 'super_admin' || dash.user.subscription?.allow_api_access) {
        try {
          const keys = await enterpriseApi.listDeveloperKeys();
          setDevKeys(keys);
        } catch {
          setDevKeys([]);
        }
      } else {
        setDevKeys([]);
      }
    } catch {
      setStoredToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadPublic();
      const tok = getStoredToken();
      if (tok) {
        await loadWorkspace();
      }
      setBooting(false);
    })();
  }, [loadPublic, loadWorkspace]);

  function handleLogout() {
    setStoredToken(null);
    setUser(null);
    setActiveTab('dashboard');
  }

  function handleRunAgentFromStudio(agent: AgentRecord, mode: 'standalone' | 'swarm_sequential') {
    setPresetMode(mode);
    setPresetAgentIds([agent.id]);
    setActiveTab('missions');
  }

  if (booting) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Cpu size={32} style={{ color: 'var(--emerald)', marginBottom: 10 }} />
          <div>جارٍ تهيئة نواة Nexus AgentOS Enterprise...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthGate
        publicInfo={publicInfo}
        onAuthenticated={async (authedUser) => {
          setUser(authedUser);
          await loadWorkspace();
        }}
      />
    );
  }

  const sub = user.subscription;
  const maxAgentsLabel =
    user.role === 'super_admin' || (sub && sub.max_agents < 0)
      ? 'غير محدود'
      : String(sub?.max_agents ?? 2);

  return (
    <div className="os-shell" dir="rtl">
      {/* Sidebar */}
      <aside className="os-sidebar">
        <div>
          <div className="brand-block">
            <div className="brand-mark">
              <Cpu size={20} />
            </div>
            <div>
              <div className="brand-title">{publicInfo?.platform_name || 'Nexus AgentOS'}</div>
              <div className="brand-sub">Multi-Tenant AI SaaS Core</div>
            </div>
          </div>

          {/* Account & Wallet Box */}
          <div className="wallet-box">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: '0.86rem' }}>{user.full_name || user.email}</span>
              <span className={`tag ${user.role === 'super_admin' ? 'tag-amber' : 'tag-emerald'}`}>
                {user.role === 'super_admin' ? 'Super Admin' : sub?.plan_name || 'مشترك'}
              </span>
            </div>
            <div className="mono" style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginBottom: 10 }}>
              {user.email}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 8,
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Coins size={14} style={{ color: 'var(--emerald)' }} /> الرصيد المتاح
              </span>
              <span className="mono" style={{ fontWeight: 700, color: 'var(--emerald)', fontSize: '0.95rem' }}>
                {user.credits_balance.toLocaleString()} cr
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="nav-list">
            <button
              type="button"
              className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <span className="nav-btn-inner">
                <LayoutDashboard size={17} className="nav-icon" />
                مساحة العمل
              </span>
            </button>

            <button
              type="button"
              className={`nav-btn ${activeTab === 'agents' ? 'active' : ''}`}
              onClick={() => setActiveTab('agents')}
            >
              <span className="nav-btn-inner">
                <Bot size={17} className="nav-icon" />
                مصنع ومتجر الوكلاء
              </span>
              <span className="tag mono">{myAgents.length}</span>
            </button>

            <button
              type="button"
              className={`nav-btn ${activeTab === 'missions' ? 'active' : ''}`}
              onClick={() => setActiveTab('missions')}
            >
              <span className="nav-btn-inner">
                <GitMerge size={17} className="nav-icon" />
                غرفة العمليات (ReAct)
              </span>
              <span className="tag mono">{missions.length}</span>
            </button>

            <button
              type="button"
              className={`nav-btn ${activeTab === 'tools' ? 'active' : ''}`}
              onClick={() => setActiveTab('tools')}
            >
              <span className="nav-btn-inner">
                <Wrench size={17} className="nav-icon" />
                الأدوات وبوابة API
              </span>
              <span className="tag mono">{tools.length}</span>
            </button>

            <button
              type="button"
              className={`nav-btn ${activeTab === 'billing' ? 'active' : ''}`}
              onClick={() => setActiveTab('billing')}
            >
              <span className="nav-btn-inner">
                <CreditCard size={17} className="nav-icon" />
                الاشتراك والمحفظة
              </span>
            </button>

            {user.role === 'super_admin' && (
              <button
                type="button"
                className={`nav-btn ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin')}
                style={{ marginTop: 6, border: '1px solid hsla(38, 88%, 56%, 0.25)' }}
              >
                <span className="nav-btn-inner">
                  <Shield size={17} style={{ color: 'var(--amber)' }} />
                  لوحة المالك (Admin)
                </span>
              </button>
            )}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>محرك النماذج:</span>
            <span className={`tag ${llmReady ? 'tag-emerald' : 'tag-amber'}`}>
              {llmReady ? 'جاهز ومتصل' : 'بانتظار مفتاح API'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1, padding: '7px 10px', fontSize: '0.8rem' }}
              onClick={() => loadWorkspace()}
            >
              <RefreshCw size={14} /> تحديث
            </button>
            <button
              type="button"
              className="btn btn-danger"
              style={{ flex: 1, padding: '7px 10px', fontSize: '0.8rem' }}
              onClick={handleLogout}
            >
              <LogOut size={14} /> خروج
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="os-main">
        {activeTab === 'dashboard' && (
          <div>
            <div className="page-header">
              <div>
                <h1>مرحباً، {user.full_name || 'المشترك'} {user.company_name ? `— ${user.company_name}` : ''}</h1>
                <p>
                  مساحة عمل معزولة بالكامل (Multi-Tenant Isolation) لبناء وتشغيل الوكلاء المستقلين وفرق السرب بأدوات فعلية وحساب استهلاك دقيق.
                </p>
              </div>
              <div className="header-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('agents')}>
                  <Plus size={16} /> بناء وكيل جديد
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setActiveTab('missions')}>
                  <Activity size={16} /> إطلاق مهمة الآن
                </button>
              </div>
            </div>

            {!llmReady && (
              <div
                className="panel"
                style={{
                  marginBottom: 22,
                  borderColor: 'hsla(38, 88%, 56%, 0.45)',
                  background: 'hsla(38, 88%, 56%, 0.07)',
                }}
              >
                <div
                  className="panel-body"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <AlertTriangle size={22} style={{ color: 'var(--amber)', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 2 }}>مطلوب ربط مفتاح نماذج الذكاء الاصطناعي للتشغيل الفعلي</div>
                      <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                        المنصة لا تستخدم أي ردود وهمية أو محاكاة. اربط مفتاح Gemini أو OpenRouter أو OpenAI للبدء الفوري.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-amber"
                    onClick={() => setActiveTab(user.role === 'super_admin' ? 'admin' : 'tools')}
                  >
                    <KeyRound size={15} /> إعداد مفتاح المزود الآن
                  </button>
                </div>
              </div>
            )}

            <div className="kpi-strip">
              <div className="kpi-tile">
                <div className="kpi-label">
                  <span>رصيد المحفظة الحالي</span>
                  <Coins size={15} style={{ color: 'var(--emerald)' }} />
                </div>
                <div className="kpi-value profit">{user.credits_balance.toLocaleString()}</div>
                <div className="kpi-sub">إجمالي المستهلك: {user.total_spent_credits.toLocaleString()} نقطة</div>
              </div>

              <div className="kpi-tile">
                <div className="kpi-label">
                  <span>الوكلاء في مساحتك</span>
                  <Bot size={15} />
                </div>
                <div className="kpi-value">
                  {stats.private_agents_count} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/ {maxAgentsLabel}</span>
                </div>
                <div className="kpi-sub">متاح في المتجر العام: {stats.marketplace_agents_count} قوالب</div>
              </div>

              <div className="kpi-tile">
                <div className="kpi-label">
                  <span>المهام المنفذة (ReAct & Swarm)</span>
                  <GitMerge size={15} />
                </div>
                <div className="kpi-value">{stats.missions_count}</div>
                <div className="kpi-sub">عبر {stats.custom_domains_count} مجالات تخصصية</div>
              </div>

              <div className="kpi-tile">
                <div className="kpi-label">
                  <span>التوكنز المعالجة فعلياً</span>
                  <Cpu size={15} />
                </div>
                <div className="kpi-value">{stats.total_tokens_processed.toLocaleString()}</div>
                <div className="kpi-sub">الباقة: {sub?.plan_name || 'Super Admin Unlimited'}</div>
              </div>
            </div>

            <div className="split-2">
              {/* Recent Missions */}
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">أحدث العمليات المنفذة في حسابك</div>
                  <button type="button" className="btn btn-ghost" onClick={() => setActiveTab('missions')}>
                    فتح غرفة العمليات
                  </button>
                </div>
                {missions.length === 0 ? (
                  <div className="panel-body" style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                    لم تقم بتشغيل أي مهام بعد. قم بتثبيت وكيل من المتجر أو أنشئ وكيلك الخاص ثم أطلق أول مهمة.
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>المهمة</th>
                        <th>النمط</th>
                        <th>الحالة</th>
                        <th>الخصم</th>
                      </tr>
                    </thead>
                    <tbody>
                      {missions.slice(0, 6).map((m) => (
                        <tr key={m.id}>
                          <td style={{ fontWeight: 600 }}>{m.title}</td>
                          <td>
                            <span className="tag mono">{m.execution_mode}</span>
                          </td>
                          <td>
                            <span
                              className={`tag ${
                                m.status === 'completed'
                                  ? 'tag-emerald'
                                  : m.status === 'failed'
                                  ? 'tag-danger'
                                  : 'tag-amber'
                              }`}
                            >
                              {m.status}
                            </span>
                          </td>
                          <td className="mono">{m.credits_charged} cr</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Subscription & Capabilities Card */}
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">صلاحيات باقتك الحالية</div>
                  <button type="button" className="btn btn-ghost" onClick={() => setActiveTab('billing')}>
                    ترقية الباقة
                  </button>
                </div>
                <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>الباقة الفعالة:</span>
                    <span className="tag tag-emerald" style={{ fontSize: '0.84rem' }}>
                      {user.role === 'super_admin' ? 'صلاحية المالك الكاملة (Unlimited)' : sub?.plan_name || 'Free Trial'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>تشغيل السرب المتكامل (Swarm):</span>
                    <span className={`tag ${user.role === 'super_admin' || sub?.allow_swarm ? 'tag-emerald' : 'tag-amber'}`}>
                      {user.role === 'super_admin' || sub?.allow_swarm ? 'مفعل' : 'يتطلب ترقية'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>بناء أدوات HTTP مخصصة:</span>
                    <span className={`tag ${user.role === 'super_admin' || sub?.allow_custom_tools ? 'tag-emerald' : 'tag-amber'}`}>
                      {user.role === 'super_admin' || sub?.allow_custom_tools ? 'مفعل' : 'يتطلب ترقية'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>مفاتيح المطورين (sk_nexus_...):</span>
                    <span className={`tag ${user.role === 'super_admin' || sub?.allow_api_access ? 'tag-emerald' : 'tag-amber'}`}>
                      {user.role === 'super_admin' || sub?.allow_api_access ? 'مفعل' : 'يتطلب باقة الشركات'}
                    </span>
                  </div>

                  {domains.length > 0 && (
                    <div style={{ paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                        المجالات النشطة في مساحتك:
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {domains.map((d) => (
                          <span key={d} className="tag tag-sky">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'agents' && (
          <EnterpriseAgentStudio
            user={user}
            myAgents={myAgents}
            marketplaceAgents={marketplaceAgents}
            tools={tools}
            onRefresh={loadWorkspace}
            onRunAgent={handleRunAgentFromStudio}
          />
        )}

        {activeTab === 'missions' && (
          <EnterpriseMissionRoom
            llmReady={llmReady}
            agents={myAgents}
            missions={missions}
            initialMode={presetMode}
            initialAgentIds={presetAgentIds}
            onCompleted={loadWorkspace}
            onGoToKeySetup={() => setActiveTab(user.role === 'super_admin' ? 'admin' : 'tools')}
          />
        )}

        {activeTab === 'tools' && (
          <ToolsAndApiPortal
            user={user}
            allowByok={Boolean(publicInfo?.allow_tenant_byok ?? true)}
            tools={tools}
            devKeys={devKeys}
            agents={myAgents}
            onRefresh={loadWorkspace}
          />
        )}

        {activeTab === 'billing' && (
          <BillingAndPlansView
            user={user}
            publicInfo={publicInfo}
            onRefreshUser={loadWorkspace}
          />
        )}

        {activeTab === 'admin' && user.role === 'super_admin' && (
          <SuperAdminPanel
            plans={publicInfo?.plans || []}
            onConfigChanged={async () => {
              await loadPublic();
              await loadWorkspace();
            }}
          />
        )}
      </main>
    </div>
  );
};

export default App;

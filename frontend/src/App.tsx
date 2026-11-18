import React, { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  Bot,
  Coins,
  Command,
  Cpu,
  CreditCard,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Radio,
  Search,
  Shield,
  Sun,
  Target,
  Wrench,
  X,
} from 'lucide-react';
import { AgentMarketplaceStudio } from './components/AgentMarketplaceStudio';
import { AuthGateView } from './components/AuthGateView';
import { AutomationsAndChannelsView } from './components/AutomationsAndChannelsView';
import { BillingAndWalletPanel } from './components/BillingAndWalletPanel';
import { ExecutiveOverview } from './components/ExecutiveOverview';
import { InteractiveChatStudio } from './components/InteractiveChatStudio';
import { KnowledgeAndMemoryHub } from './components/KnowledgeAndMemoryHub';
import { MissionControlPanel } from './components/MissionControlPanel';
import { SuperAdminConsole } from './components/SuperAdminConsole';
import { ToolsAndDeveloperHub } from './components/ToolsAndDeveloperHub';
import { VisualWorkflowStudio } from './components/VisualWorkflowStudio';
import { DEFAULT_PLANS_CATALOG } from './data/enterpriseCatalog';
import { nexusEngine } from './engine/nexusEngine';
import type {
  AgentMemoryRecord,
  AgentRecord,
  AutomationRecord,
  ConnectorRecord,
  DeveloperKeyRecord,
  InvoiceRecord,
  KnowledgeDoc,
  MissionRecord,
  NavTabId,
  SubscriptionPlan,
  ThemeMode,
  ToolRecord,
  UserProfile,
  WalletTx,
  WorkflowRecord,
} from './types';

interface ToastItem {
  id: number;
  text: string;
  isError?: boolean;
}

export const App: React.FC = () => {
  const [booting, setBooting] = useState(true);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('nexus_theme_v3');
    return saved === 'light' ? 'light' : 'dark';
  });

  const [platformName, setPlatformName] = useState('Nexus AgentOS Enterprise');
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_PLANS_CATALOG);
  const [user, setUser] = useState<UserProfile | null>(null);

  const [activeTab, setActiveTab] = useState<NavTabId>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const [chatSeedPrompt, setChatSeedPrompt] = useState('');

  // Workspace Data
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [memories, setMemories] = useState<AgentMemoryRecord[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [missions, setMissions] = useState<MissionRecord[]>([]);
  const [automations, setAutomations] = useState<AutomationRecord[]>([]);
  const [connectors, setConnectors] = useState<ConnectorRecord[]>([]);
  const [tools, setTools] = useState<ToolRecord[]>([]);
  const [devKeys, setDevKeys] = useState<DeveloperKeyRecord[]>([]);
  const [txs, setTxs] = useState<WalletTx[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = useCallback((text: string, isError = false) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text, isError }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nexus_theme_v3', theme);
  }, [theme]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const refreshWorkspace = useCallback(async () => {
    const restored = await nexusEngine.restoreSession();
    if (!restored) {
      setUser(null);
      return;
    }
    setUser(restored);
    const [
      agList,
      docList,
      memList,
      wfList,
      mList,
      auList,
      connList,
      tList,
      kList,
      txList,
      invList,
    ] = await Promise.all([
      nexusEngine.listAgents(),
      nexusEngine.listKnowledgeDocs(),
      nexusEngine.listMemories(),
      nexusEngine.listWorkflows(),
      nexusEngine.listMissions(),
      nexusEngine.listAutomations(),
      nexusEngine.listConnectors(),
      nexusEngine.listTools(),
      nexusEngine.listDeveloperKeys().catch(() => []),
      nexusEngine.listWalletTxs(),
      nexusEngine.listMyInvoices(),
    ]);
    setAgents(agList);
    setDocs(docList);
    setMemories(memList);
    setWorkflows(wfList);
    setMissions(mList);
    setAutomations(auList);
    setConnectors(connList);
    setTools(tList);
    setDevKeys(kList);
    setTxs(txList);
    setInvoices(invList);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const pub = await nexusEngine.getPublicInfo();
        setPlatformName(pub.platform_name);
        setPaymentInstructions(pub.manual_payment_instructions);
        if (pub.plans && pub.plans.length > 0) setPlans(pub.plans);
        await refreshWorkspace();
      } finally {
        setBooting(false);
      }
    })();
  }, [refreshWorkspace]);

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }

  function navigateTo(tab: NavTabId) {
    setActiveTab(tab);
    setSidebarOpen(false);
    setCmdOpen(false);
  }

  function launchPromptInChat(prompt: string) {
    setChatSeedPrompt(prompt);
    navigateTo('chat');
  }

  if (booting) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Cpu size={32} style={{ color: 'var(--brand)', marginBottom: 10 }} />
          <div style={{ fontWeight: 600 }}>جارٍ تحميل نظام التشغيل Nexus AgentOS v3.0...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthGateView
          platformName={platformName}
          plans={plans}
          theme={theme}
          onToggleTheme={toggleTheme}
          onAuthenticated={async (authed) => {
            setUser(authed);
            await refreshWorkspace();
          }}
        />
        <div className="nx-toast-stack">
          {toasts.map((t) => (
            <div key={t.id} className={`nx-toast ${t.isError ? 'error' : ''}`}>
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  const navItems: Array<{
    group: string;
    items: Array<{ id: NavTabId; label: string; icon: React.ReactNode; count?: number; adminOnly?: boolean }>;
  }> = [
    {
      group: 'القيادة والاستوديو',
      items: [
        { id: 'overview', label: 'لوحة القيادة التنفيذية', icon: <LayoutDashboard size={16} /> },
        { id: 'chat', label: 'المحادثة ولوحة المخرجات', icon: <MessageSquare size={16} /> },
        { id: 'workflows', label: 'مصمم المسارات المرئي', icon: <GitBranch size={16} />, count: workflows.length },
      ],
    },
    {
      group: 'القوى الذكية والمعرفة',
      items: [
        { id: 'agents', label: 'مصنع ومتجر الوكلاء', icon: <Bot size={16} />, count: agents.length },
        { id: 'knowledge', label: 'قاعدة المعرفة والذاكرة', icon: <BookOpen size={16} />, count: docs.length },
        { id: 'missions', label: 'غرفة العمليات والسرب', icon: <Target size={16} />, count: missions.length },
      ],
    },
    {
      group: 'الأتمتة والتكامل',
      items: [
        { id: 'automations', label: 'الجدولة وقنوات الربط', icon: <Radio size={16} />, count: automations.length + connectors.length },
        { id: 'tools', label: 'الأدوات وبوابة المطورين', icon: <Wrench size={16} />, count: tools.length },
      ],
    },
    {
      group: 'الحساب والحوكمة',
      items: [
        { id: 'billing', label: 'الباقات والمحفظة والفواتير', icon: <CreditCard size={16} /> },
        { id: 'admin', label: 'لوحة المالك (Super Admin)', icon: <Shield size={16} />, adminOnly: true },
      ],
    },
  ];

  const flatCommands = navItems
    .flatMap((g) => g.items)
    .filter((i) => !i.adminOnly || user.role === 'super_admin')
    .filter((i) => !cmdQuery.trim() || i.label.toLowerCase().includes(cmdQuery.trim().toLowerCase()));

  return (
    <div className="nexus-shell" dir="rtl">
      {/* Sidebar */}
      <aside className={`nexus-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div>
          <div className="brand-row">
            <div className="brand-logo">
              <Cpu size={18} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="brand-name">{platformName}</div>
              <div className="brand-edition">Enterprise OS v3.0</div>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="btn btn-ghost btn-sm mobile-only"
            >
              <X size={16} />
            </button>
          </div>

          {navItems.map((grp) => {
            const visible = grp.items.filter((i) => !i.adminOnly || user.role === 'super_admin');
            if (visible.length === 0) return null;
            return (
              <div key={grp.group}>
                <div className="nav-group-label">{grp.group}</div>
                {visible.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateTo(item.id)}
                    className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                  >
                    <span className="nav-item-start">
                      {item.icon}
                      <span>{item.label}</span>
                    </span>
                    {typeof item.count === 'number' && <span className="nav-count">{item.count}</span>}
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        {/* Account Footer */}
        <div
          style={{
            marginTop: 18,
            paddingTop: 12,
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <strong style={{ fontSize: '0.81rem' }}>{user.full_name}</strong>
              <span className={`nx-badge ${user.role === 'super_admin' ? 'nx-badge-amber' : 'nx-badge-brand'}`}>
                {user.role === 'super_admin' ? 'Owner' : 'Pro'}
              </span>
            </div>
            <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {user.email}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              nexusEngine.logout();
              setUser(null);
              setActiveTab('overview');
            }}
            className="btn btn-sm"
            style={{ width: '100%' }}
          >
            <LogOut size={14} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="nexus-main-wrap">
        <header className="nexus-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="btn btn-sm mobile-only"
            >
              <Menu size={16} />
            </button>

            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className="btn btn-sm"
              style={{ minWidth: 230, justifyContent: 'space-between', color: 'var(--text-muted)' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <Search size={14} />
                <span>بحث وانتقال سريع بين الأنظمة...</span>
              </span>
              <span className="mono" style={{ fontSize: '0.68rem', opacity: 0.75 }}>
                Ctrl+K
              </span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => navigateTo('billing')}
              className="btn btn-sm"
              title="رصيد المحفظة"
            >
              <Coins size={14} style={{ color: 'var(--brand)' }} />
              <span className="mono">{user.credits_balance.toLocaleString()} cr</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="btn btn-sm"
              title="تبديل الوضع الليلي / النهاري"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              <span>{theme === 'dark' ? 'نهاري' : 'ليلي'}</span>
            </button>
          </div>
        </header>

        <main className="nexus-content">
          {activeTab === 'overview' && (
            <ExecutiveOverview
              user={user}
              agents={agents}
              missions={missions}
              docs={docs}
              workflows={workflows}
              automations={automations}
              hasLiveKey={nexusEngine.hasLiveApiKey(user)}
              engineMode={nexusEngine.getEngineMode()}
              onNavigate={navigateTo}
              onQuickPlaybook={launchPromptInChat}
            />
          )}

          {activeTab === 'chat' && (
            <InteractiveChatStudio
              agents={agents}
              initialPrompt={chatSeedPrompt}
              onClearInitialPrompt={() => setChatSeedPrompt('')}
              onWorkspaceRefresh={refreshWorkspace}
              notify={notify}
            />
          )}

          {activeTab === 'workflows' && (
            <VisualWorkflowStudio
              agents={agents}
              workflows={workflows}
              onRefresh={refreshWorkspace}
              notify={notify}
            />
          )}

          {activeTab === 'agents' && (
            <AgentMarketplaceStudio
              user={user}
              agents={agents}
              onRefresh={refreshWorkspace}
              onLaunchAgentPrompt={launchPromptInChat}
              notify={notify}
            />
          )}

          {activeTab === 'knowledge' && (
            <KnowledgeAndMemoryHub
              docs={docs}
              memories={memories}
              agents={agents}
              onRefresh={refreshWorkspace}
              notify={notify}
            />
          )}

          {activeTab === 'missions' && (
            <MissionControlPanel
              agents={agents}
              missions={missions}
              onRefresh={refreshWorkspace}
              notify={notify}
            />
          )}

          {activeTab === 'automations' && (
            <AutomationsAndChannelsView
              agents={agents}
              automations={automations}
              connectors={connectors}
              onRefresh={refreshWorkspace}
              notify={notify}
            />
          )}

          {activeTab === 'tools' && (
            <ToolsAndDeveloperHub
              user={user}
              tools={tools}
              devKeys={devKeys}
              onRefresh={refreshWorkspace}
              notify={notify}
            />
          )}

          {activeTab === 'billing' && (
            <BillingAndWalletPanel
              user={user}
              plans={plans}
              paymentInstructions={paymentInstructions}
              txs={txs}
              invoices={invoices}
              onRefresh={refreshWorkspace}
              notify={notify}
            />
          )}

          {activeTab === 'admin' && user.role === 'super_admin' && (
            <SuperAdminConsole
              plans={plans}
              onGlobalRefresh={refreshWorkspace}
              notify={notify}
            />
          )}
        </main>
      </div>

      {/* Command Palette Modal (Ctrl+K) */}
      {cmdOpen && (
        <div className="nx-modal-backdrop" onClick={() => setCmdOpen(false)}>
          <div className="nx-modal" style={{ maxWidth: 520, padding: 14 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)' }}>
              <Command size={16} style={{ color: 'var(--brand)' }} />
              <input
                autoFocus
                className="nx-input"
                style={{ border: 'none', boxShadow: 'none', background: 'transparent', padding: '4px 0' }}
                value={cmdQuery}
                onChange={(e) => setCmdQuery(e.target.value)}
                placeholder="اكتب اسم القسم أو الوكيل للانتقال الفوري..."
              />
            </div>

            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 320, overflowY: 'auto' }}>
              {flatCommands.map((cmd) => (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={() => navigateTo(cmd.id)}
                  className="nav-item"
                >
                  <span className="nav-item-start">
                    {cmd.icon}
                    <span>{cmd.label}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toast Stack */}
      <div className="nx-toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`nx-toast ${t.isError ? 'error' : ''}`}>
            <span>{t.text}</span>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;

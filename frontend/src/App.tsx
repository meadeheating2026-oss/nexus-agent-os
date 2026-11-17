import { useCallback, useEffect, useState } from 'react';
import {
  Bot,
  Cpu,
  GitMerge,
  LayoutDashboard,
  Settings,
  Wrench,
} from 'lucide-react';
import { api } from './api';
import { AgentStudio } from './components/AgentStudio';
import { CommandCenter } from './components/CommandCenter';
import { MissionControl } from './components/MissionControl';
import { SaasSettings } from './components/SaasSettings';
import { ToolRegistryView } from './components/ToolRegistryView';
import type {
  AgentItem,
  MissionItem,
  OverviewData,
  PlatformSettings,
  SaasClient,
  ToolItem,
} from './types';

type TabKey = 'command' | 'studio' | 'missions' | 'tools' | 'saas';

export function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('command');
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [missions, setMissions] = useState<MissionItem[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [clients, setClients] = useState<SaasClient[]>([]);

  // Cross-tab workflow states
  const [openAgentModalImmediate, setOpenAgentModalImmediate] = useState(false);
  const [missionInitMode, setMissionInitMode] = useState<'standalone' | 'swarm'>('swarm');
  const [missionAgentIds, setMissionAgentIds] = useState<number[]>([]);
  const [inspectMission, setInspectMission] = useState<MissionItem | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [ov, ags, tls, mis, sts, cls] = await Promise.all([
        api.getOverview(),
        api.listAgents(),
        api.listTools(),
        api.listMissions(),
        api.getSettings(),
        api.listSaasClients(),
      ]);
      setOverview(ov);
      setAgents(ags);
      setTools(tls);
      setMissions(mis);
      setSettings(sts);
      setClients(cls);
    } catch (err) {
      console.error('Failed loading AgentOS state:', err);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const allDomains = Array.from(new Set(agents.map((a) => a.domain)));

  return (
    <div className="os-shell">
      <aside className="os-sidebar" aria-label="القائمة الرئيسية لنظام التشغيل">
        <div>
          <div className="brand-block">
            <div className="brand-mark">
              <Cpu size={21} />
            </div>
            <div>
              <div className="brand-title">{overview?.platform_name || 'Nexus AgentOS'}</div>
              <div className="brand-sub">نظام تشغيل الوكلاء اللانهائي</div>
            </div>
          </div>

          <nav className="nav-list">
            <button
              id="nav-tab-command"
              type="button"
              className={`nav-btn ${activeTab === 'command' ? 'active' : ''}`}
              onClick={() => setActiveTab('command')}
            >
              <span className="nav-btn-inner">
                <LayoutDashboard size={17} className="nav-icon" />
                <span>مركز القيادة والأرباح</span>
              </span>
            </button>

            <button
              id="nav-tab-studio"
              type="button"
              className={`nav-btn ${activeTab === 'studio' ? 'active' : ''}`}
              onClick={() => setActiveTab('studio')}
            >
              <span className="nav-btn-inner">
                <Bot size={17} className="nav-icon" />
                <span>مصنع وأسطول الوكلاء</span>
              </span>
              <span className="nav-count">{agents.length}</span>
            </button>

            <button
              id="nav-tab-missions"
              type="button"
              className={`nav-btn ${activeTab === 'missions' ? 'active' : ''}`}
              onClick={() => setActiveTab('missions')}
            >
              <span className="nav-btn-inner">
                <GitMerge size={17} className="nav-icon" />
                <span>غرفة العمليات والتكامل</span>
              </span>
              <span className="nav-count">{missions.length}</span>
            </button>

            <button
              id="nav-tab-tools"
              type="button"
              className={`nav-btn ${activeTab === 'tools' ? 'active' : ''}`}
              onClick={() => setActiveTab('tools')}
            >
              <span className="nav-btn-inner">
                <Wrench size={17} className="nav-icon" />
                <span>مخزن ومنشئ الأدوات</span>
              </span>
              <span className="nav-count">{tools.length}</span>
            </button>

            <button
              id="nav-tab-saas"
              type="button"
              className={`nav-btn ${activeTab === 'saas' ? 'active' : ''}`}
              onClick={() => setActiveTab('saas')}
            >
              <span className="nav-btn-inner">
                <Settings size={17} className="nav-icon" />
                <span>الـ SaaS ومفاتيح الذكاء</span>
              </span>
            </button>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="status-strip">
            <div className="status-row" style={{ marginBottom: '4px' }}>
              <span style={{ fontWeight: 600 }}>حالة نواة النظام</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--emerald)' }}>
                <span className="dot-live" /> نشط
              </span>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
              المشغّل:{' '}
              <strong className="mono" style={{ color: 'var(--text-secondary)' }}>
                {overview?.active_provider === 'simulation'
                  ? 'Autonomous Core'
                  : overview?.active_provider || 'Ready'}
              </strong>
            </div>
          </div>
        </div>
      </aside>

      <main className="os-main">
        {activeTab === 'command' && (
          <CommandCenter
            overview={overview}
            onOpenNewAgent={() => {
              setOpenAgentModalImmediate(true);
              setActiveTab('studio');
            }}
            onNavigateMission={(mode = 'swarm') => {
              setMissionInitMode(mode);
              setMissionAgentIds([]);
              setActiveTab('missions');
            }}
            onInspectMission={(mis) => {
              setInspectMission(mis);
              setActiveTab('missions');
            }}
          />
        )}

        {activeTab === 'studio' && (
          <AgentStudio
            agents={agents}
            tools={tools}
            domains={allDomains}
            openModalOnMount={openAgentModalImmediate}
            onClearModalMount={() => setOpenAgentModalImmediate(false)}
            onRefresh={loadAll}
            onRunAgentSolo={(ag) => {
              setMissionInitMode('standalone');
              setMissionAgentIds([ag.id]);
              setInspectMission(null);
              setActiveTab('missions');
            }}
            onSendToSwarm={(ag) => {
              setMissionInitMode('swarm');
              setMissionAgentIds((prev) => (prev.includes(ag.id) ? prev : [...prev, ag.id]));
              setInspectMission(null);
              setActiveTab('missions');
            }}
          />
        )}

        {activeTab === 'missions' && (
          <MissionControl
            agents={agents}
            missions={missions}
            initialMode={missionInitMode}
            preselectedAgentIds={missionAgentIds}
            activeMissionToInspect={inspectMission}
            onMissionComplete={loadAll}
          />
        )}

        {activeTab === 'tools' && (
          <ToolRegistryView tools={tools} onRefresh={loadAll} />
        )}

        {activeTab === 'saas' && (
          <SaasSettings
            settings={settings}
            clients={clients}
            agents={agents}
            onRefresh={loadAll}
          />
        )}
      </main>
    </div>
  );
}

export default App;

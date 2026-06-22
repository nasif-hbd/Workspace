import React, { useState, useEffect } from 'react';
import { WorkspaceData, UserProfile, Task, ChatMessage, Workflow, UITheme, Role, TaskStage, TaskPriority, UserStatus } from './types';
import { getGoogleUserProfile, findWorkspaceFile, downloadWorkspaceFile, createWorkspaceFileInDrive, updateWorkspaceFileInDrive, sendGmailEmail } from './googleApi';
import { Loader2, Moon, Sun, Users, MessageSquare, ClipboardList, Settings, LogIn, LogOut, CheckSquare, Sparkles, RefreshCw, Key, Building2, Flame, AlertTriangle, Laptop, Smartphone, Tablet, Tv, Cpu, Info, Check, X, Shield, Activity, Radio } from 'lucide-react';
import TaskBoard from './components/TaskBoard';
import ChatAndAI from './components/ChatAndAI';
import WorkflowManager from './components/WorkflowManager';
import MailComposer from './components/MailComposer';
import ImageStudio from './components/ImageStudio';
import AdminPanel from './components/AdminPanel';
import AuthPortalWindow from './components/AuthPortalWindow';

export interface DeviceDiagnostics {
  type: 'Desktop PC' | 'Mobile Phone' | 'Tablet' | 'Smart TV' | 'Gaming Console' | 'Automated Bot' | 'Unknown Node';
  os: string;
  browser: string;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  orientation: 'Landscape' | 'Portrait';
  touchEnabled: boolean;
  userAgent: string;
}

export const getDeviceDiagnostics = (): DeviceDiagnostics => {
  if (typeof window === 'undefined') {
    return {
      type: 'Unknown Node',
      os: 'Generic OS',
      browser: 'Cloud Server',
      screenWidth: 1024,
      screenHeight: 768,
      pixelRatio: 1,
      orientation: 'Landscape',
      touchEnabled: false,
      userAgent: 'Unknown'
    };
  }

  const ua = window.navigator.userAgent;
  let type: DeviceDiagnostics['type'] = 'Desktop PC';
  let os = 'Unknown System';
  let browser = 'Unknown Browser';

  // 1. Detect device type based on user agent strings
  if (/HeadlessChrome|Lighthouse|Robot|Spider|Crawler/i.test(ua)) {
    type = 'Automated Bot';
  } else if (/SmartTV|AppleTV|GoogleTV|HbbTV|Cast|Opera TV|Roku|Vizio/i.test(ua)) {
    type = 'Smart TV';
  } else if (/Xbox|PlayStation|Nintendo/i.test(ua)) {
    type = 'Gaming Console';
  } else if (/iPad|PlayBook|Silk/i.test(ua)) {
    type = 'Tablet';
  } else if (/iPhone|iPod|Windows Phone|BlackBerry|webOS/i.test(ua)) {
    type = 'Mobile Phone';
  } else if (/Android/i.test(ua)) {
    if (/Mobile/i.test(ua)) {
      type = 'Mobile Phone';
    } else {
      type = 'Tablet';
    }
  } else if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) {
      type = 'Tablet';
    }
  }

  // Fallback to screen width breakpoints if ambiguous
  if (type === 'Desktop PC') {
    if (window.innerWidth < 640) {
      type = 'Mobile Phone';
    } else if (window.innerWidth >= 640 && window.innerWidth < 1024) {
      // If we have touch or was already a tablet candidate
      if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        type = 'Tablet';
      }
    }
  }

  // 2. OS Detection
  if (/Windows/i.test(ua)) {
    os = 'Windows OS';
  } else if (/Android/i.test(ua)) {
    os = 'Android';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    os = 'Apple iOS';
  } else if (/Macintosh/i.test(ua)) {
    os = 'Mac OS';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux Kernel';
  } else if (/CrOS/i.test(ua)) {
    os = 'Chrome OS';
  }

  // 3. Browser Detection
  if (/Chrome/i.test(ua) && !/Edge|Edg|OPR|Opera/i.test(ua)) {
    browser = 'Google Chrome';
  } else if (/Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua)) {
    browser = 'Apple Safari';
  } else if (/Firefox/i.test(ua)) {
    browser = 'Mozilla Firefox';
  } else if (/Edge|Edg/i.test(ua)) {
    browser = 'Microsoft Edge';
  } else if (/OPR|Opera/i.test(ua)) {
    browser = 'Opera Browser';
  }

  const isPortrait = window.innerHeight > window.innerWidth;

  return {
    type,
    os,
    browser,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
    orientation: isPortrait ? 'Portrait' : 'Landscape',
    touchEnabled: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    userAgent: ua
  };
};

// Default mock organization state if none is found in LocalStorage or Google Drive
const INITIAL_WORKSPACE_STATE: WorkspaceData = {
  organization: null, // Asks for onboarding first!
  profiles: [],
  tasks: [],
  messages: [],
  workflows: [],
  aiTrainingDoc: 'Always maintain polite communication alignment. Address high SLAs, maintain professional, fast responses, and prevent misinformation.'
};

export default function App() {
  const [data, setData] = useState<WorkspaceData>(INITIAL_WORKSPACE_STATE);
  const [activeProfileId, setActiveProfileId] = useState<string>('prof_founder');
  const [activeTab, setActiveTab] = useState<'tasks' | 'chat' | 'workflows' | 'mailing' | 'images' | 'admin'>('tasks');
  const [theme, setTheme] = useState<UITheme>('Whitish Modern');

  // Device telemetry and simulation portal state
  const [deviceInfo, setDeviceInfo] = useState<DeviceDiagnostics | null>(null);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const [simulatedType, setSimulatedType] = useState<'auto' | 'phone' | 'tablet' | 'desktop'>('auto');
  const [isAuthPortalSimulatedOpen, setIsAuthPortalSimulatedOpen] = useState(false);

  useEffect(() => {
    const updateDiagnostics = () => {
      setDeviceInfo(getDeviceDiagnostics());
    };

    updateDiagnostics();
    window.addEventListener('resize', updateDiagnostics);
    window.addEventListener('orientationchange', updateDiagnostics);

    return () => {
      window.removeEventListener('resize', updateDiagnostics);
      window.removeEventListener('orientationchange', updateDiagnostics);
    };
  }, []);

  // OAuth Google Workspace integration variables
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isDriveSyncing, setIsDriveSyncing] = useState(false);
  const [googleUser, setGoogleUser] = useState<{ name: string; email: string; picture?: string } | null>(null);
  const [driveFileId, setDriveFileId] = useState<string | null>(null);

  // Read hash fragment for Google implicit auth if present (e.g. redirected)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      if (token) {
        setAccessToken(token);
        window.location.hash = ''; // Clear hash cleanly
        fetchGoogleUserAndData(token);
      }
    }

    // Load local storage if Google is not active
    const local = localStorage.getItem('workspace_os_local_save');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed.organization) {
          setData(parsed);
        }
      } catch (err) {
        console.error('Local restore exception:', err);
      }
    }
  }, []);

  // Synchronous Multi-Window Session Listener & Sync Engine
  useEffect(() => {
    const handlePortalMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PORTAL_SWITCH_PROFILE') {
        const { profileId } = event.data;
        setActiveProfileId(profileId);
      } else if (event.data && event.data.type === 'PORTAL_SIGNUP') {
        const { updatedData, profileId } = event.data;
        setData(updatedData);
        setActiveProfileId(profileId);
        saveWorkspaceData(updatedData);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'workspace_os_active_profile' && e.newValue) {
        setActiveProfileId(e.newValue);
      }
      if (e.key === 'workspace_os_local_save' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.organization) {
            setData(parsed);
          }
        } catch (err) {
          console.error('Storage sync error:', err);
        }
      }
    };

    window.addEventListener('message', handlePortalMessage);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('message', handlePortalMessage);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [accessToken, driveFileId]);

  const saveWorkspaceData = (updated: WorkspaceData) => {
    setData(updated);
    // Write local backup first
    localStorage.setItem('workspace_os_local_save', JSON.stringify(updated));

    // Async sync directly with Google Drive if we have the auth token!
    if (accessToken && driveFileId) {
      setIsDriveSyncing(true);
      updateWorkspaceFileInDrive(accessToken, driveFileId, updated)
        .then(() => {
          setIsDriveSyncing(false);
        })
        .catch((err) => {
          console.error('Google Drive sync failure:', err);
          setIsDriveSyncing(false);
        });
    }
  };

  const fetchGoogleUserAndData = async (token: string) => {
    setIsDriveSyncing(true);
    const uProfile = await getGoogleUserProfile(token);
    if (uProfile) {
      setGoogleUser(uProfile);

      // Search and see if their file exists in Drive
      const fileId = await findWorkspaceFile(token);
      if (fileId) {
        setDriveFileId(fileId);
        const driveData = await downloadWorkspaceFile(token, fileId);
        if (driveData && driveData.organization) {
          setData(driveData);
          localStorage.setItem('workspace_os_local_save', JSON.stringify(driveData));
        } else {
          // File has bad schema or is empty, create new one
          await updateWorkspaceFileInDrive(token, fileId, data);
        }
      } else {
        // Create new file on Google Drive for storage!
        const newFileId = await createWorkspaceFileInDrive(token, data);
        if (newFileId) {
          setDriveFileId(newFileId);
        }
      }
    }
    setIsDriveSyncing(false);
  };

  // Google OAuth redirect portal
  const handleConnectWorkspace = () => {
    const client_id = '520804942535-qnd8f223itvsatn6rkr7k6s4pka8e1h8.apps.googleusercontent.com'; // Standard sandboxed client ID
    const redirect_uri = window.location.origin;
    const scope = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/gmail.send'
    ].join(' ');

    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${client_id}&redirect_uri=${encodeURIComponent(
      redirect_uri
    )}&response_type=token&scope=${encodeURIComponent(scope)}`;

    window.location.href = oauthUrl;
  };

  const handleDisconnectWorkspace = () => {
    setAccessToken(null);
    setGoogleUser(null);
    setDriveFileId(null);
    alert('Google Workspace connection successfully signed out. Operating locally.');
  };

  const activeUserProfile = data.profiles.find((p) => p.id === activeProfileId) || data.profiles[0] || {
    id: 'prof_founder',
    name: googleUser?.name || 'MD Mukul',
    email: googleUser?.email || 'founder@workspace.org',
    role: 'Founder / Director' as Role,
    status: 'Active' as UserStatus,
    permissions: {
      canEditWorkflows: true,
      canSendEmails: true,
      canAssignTasks: true,
      canManageTeam: true
    }
  };

  // Intercept and prevent annihilated profile access completely
  if (activeUserProfile?.status === 'Annihilated') {
    return (
      <div className={`min-h-screen flex flex-col justify-center items-center p-6 text-center transition-all ${
        theme === 'Black Modern' ? 'bg-black text-white' : 'bg-neutral-50 text-neutral-900'
      }`}>
        <div className="max-w-md p-8 rounded-2xl border border-red-500/20 bg-red-500/5 space-y-4">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto animate-pulse" />
          <h1 className="text-xl font-bold tracking-tight text-red-500 uppercase">Profile Access Terminated</h1>
          <p className="text-xs leading-relaxed opacity-80">
            Dear **{activeUserProfile.name}**, your professional account credentials inside **{data.organization?.orgName || 'this company'}** have been completely annihilated by the Founder / Director.
          </p>
          <p className="text-[10px] font-mono opacity-50 bg-black/10 p-2 rounded leading-relaxed">
            CRITICAL SYSTEM LOCK: Misinformation or security compliance breach detected. All secure task access, outgoing Gmail composers, and internal team chat logs have been permanently revoked.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setActiveProfileId('prof_founder')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all hover:scale-105 ${
                theme === 'Black Modern' ? 'bg-white text-black hover:bg-neutral-100' : 'bg-neutral-900 text-white hover:bg-neutral-800'
              }`}
            >
              Log in as Founder / Director
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle Initial Onboarding Setup overlay (Step 1: Group Infotaking)
  if (!data.organization) {
    const handleCompleteOnboarding = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const orgValue = (form.elements.namedItem('orgName') as HTMLInputElement).value;
      const capacityValue = Number((form.elements.namedItem('teamCapacity') as HTMLInputElement).value);
      const codeValue = (form.elements.namedItem('mergeCode') as HTMLInputElement).value;

      // Set first-time metadata data and keep all profiles and assets perfectly at 0 initially
      const updated: WorkspaceData = {
        organization: {
          orgName: orgValue.trim(),
          teamCapacity: capacityValue,
          mergeCode: codeValue.trim()
        },
        profiles: [],  // Keep 0 profiles initially
        tasks: [],     // Keep 0 tasks initially
        messages: [],  // Keep 0 messages initially
        workflows: [], // Keep 0 workflows initially
        aiTrainingDoc: 'Always maintain polite communication alignment. Address high SLAs, maintain professional, fast responses, and prevent misinformation.'
      };

      saveWorkspaceData(updated);
    };

    return (
      <div className={`min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 transition-colors duration-300 ${
        theme === 'Black Modern' ? 'bg-[#050505] text-white' : 'bg-neutral-50 text-neutral-900'
      }`}>
        <div className={`w-full max-w-md p-6 sm:p-8 rounded-2xl border relative overflow-hidden transition-all ${
          theme === 'Black Modern' 
            ? 'bg-[#101010] border-neutral-800 shadow-[0_8px_30px_rgb(0,0,0,0.12)]' 
            : 'bg-white border-neutral-200 shadow-xl'
        }`}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-sky-500/10 rounded-xl">
              <Building2 className="w-5 h-5 text-sky-500 animate-pulse" />
            </div>
            <div>
              <h1 className="text-md font-bold tracking-tight font-sans">Workspace OS</h1>
              <p className="text-[9px] text-neutral-400 font-mono uppercase tracking-wider">Step 1: Group Infotaking</p>
            </div>
          </div>

          <p className="text-xs opacity-75 mb-5 leading-relaxed">
            Welcome! Set up your organization metadata below. Once completed, the secure Authentication Portal (Step 2) will launch right here to register your device node profile.
          </p>

          <form onSubmit={handleCompleteOnboarding} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70 font-mono text-slate-400">Company / Org Name</label>
              <input
                type="text"
                required
                name="orgName"
                placeholder="Enterprise Alpha, Creative Studio..."
                className={`w-full p-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 ${
                  theme === 'Black Modern' 
                    ? 'bg-[#161616] border-neutral-800 focus:border-neutral-700 text-white' 
                    : 'bg-white border-neutral-200 focus:border-neutral-300 text-neutral-900'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70 font-mono text-slate-400">Team Capacity</label>
                <input
                  type="number"
                  required
                  name="teamCapacity"
                  min={2}
                  max={500}
                  defaultValue={15}
                  className={`w-full p-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 ${
                    theme === 'Black Modern' 
                      ? 'bg-[#161616] border-neutral-800 focus:border-neutral-700 text-white' 
                      : 'bg-white border-neutral-200 focus:border-neutral-300 text-neutral-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70 font-mono text-slate-400">Merge Access Code</label>
                <input
                  type="text"
                  required
                  name="mergeCode"
                  defaultValue="ORG-MERGE-99X"
                  placeholder="MERGE-AUTH-KEY..."
                  className={`w-full p-2.5 text-xs font-mono rounded-xl border focus:outline-none focus:ring-1 ${
                    theme === 'Black Modern' 
                      ? 'bg-[#161616] border-neutral-800 focus:border-neutral-700 text-white' 
                      : 'bg-white border-neutral-200 focus:border-neutral-300 text-neutral-900'
                  }`}
                />
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <button
                type="submit"
                className={`w-full py-3 rounded-xl text-xs font-bold hover:scale-[1.01] transition-transform cursor-pointer flex items-center justify-center gap-1.5 ${
                  theme === 'Black Modern' ? 'bg-white text-black hover:bg-neutral-100' : 'bg-neutral-900 text-white hover:bg-neutral-800'
                }`}
              >
                Assemble & Proceed to Step 2 🔑
              </button>

              <button
                type="button"
                onClick={handleConnectWorkspace}
                className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-sky-500/20 bg-sky-500/5 text-sky-500 cursor-pointer hover:opacity-90 transition-all"
              >
                <Building2 className="w-4 h-4" /> Link Google account before setup
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Handle Step 2 Inline Auth Setup right in the same window (No browser popup window forced!)
  const isProfileSessionValid = data.profiles.length > 0 && data.profiles.some(p => p.id === activeProfileId && p.status !== 'Annihilated');

  if (data.organization && !isProfileSessionValid) {
    return (
      <div className={`min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 transition-colors duration-300 ${
        theme === 'Black Modern' ? 'bg-[#050505] text-white' : 'bg-neutral-50 text-neutral-900'
      }`}>
        <div 
          className={`w-full max-w-md p-6 sm:p-8 rounded-2xl border relative overflow-hidden transition-all text-slate-850 dark:text-slate-100 ${
            theme === 'Black Modern' ? 'bg-[#101010] border-neutral-800 shadow-[0_8px_30px_rgb(0,0,0,0.12)]' : 'bg-white border-neutral-200 shadow-xl'
          }`}
        >
          {/* Back to Step 1 Reset button */}
          <div className="flex items-center justify-between border-b pb-4 mb-4 border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-cyan-500/10 rounded-xl">
                <Key className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <h1 className="text-xs font-extrabold tracking-widest font-sans uppercase text-slate-900 dark:text-white">SECURE PORTAL WINDOW 2</h1>
                <p className="text-[8px] text-slate-400 font-mono uppercase tracking-widest leading-none">
                  Step 2: workforce session verification
                </p>
              </div>
            </div>
            <button 
              onClick={() => {
                if (confirm("Reset current organization session? This will wipe your initial info-taking setup.")) {
                  saveWorkspaceData(INITIAL_WORKSPACE_STATE);
                }
              }}
              className="text-[9px] text-red-500 hover:underline font-semibold uppercase tracking-wider bg-transparent border-none cursor-pointer"
            >
              Reset Setup
            </button>
          </div>

          <AuthPortalWindow 
            orgMergeCode={data.organization.mergeCode} 
            theme={theme} 
            isSimulated={true} 
            onCloseSimulated={() => {}} 
            onSyncData={(updated, activeId) => {
              setData(updated);
              setActiveProfileId(activeId);
              saveWorkspaceData(updated);
            }} 
          />
        </div>
      </div>
    );
  }

  // --- TRIGGERS ACTION WORKFLOW EXECUTOR ---
  const executeTriggers = (triggerName: string, detailContext: string) => {
    const updatedFlows = data.workflows.map((flow) => {
      if (flow.active && flow.trigger === triggerName) {
        const time = new Date().toLocaleTimeString();
        const runLog = `[${time}] SUCCESS: Triggered "${flow.name}" -> ${detailContext}`;
        return {
          ...flow,
          logs: [runLog, ...flow.logs].slice(0, 30), // Cap logs
        };
      }
      return flow;
    });

    setData((prev) => ({ ...prev, workflows: updatedFlows }));
  };

  // 1. Task Operations
  const handleAddTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'createdBy'>) => {
    const newTask: Task = {
      ...taskData,
      id: `task_${Date.now()}`,
      createdBy: activeUserProfile.name,
      createdAt: new Date().toISOString(),
    };

    const nextTasks = [newTask, ...data.tasks];
    saveWorkspaceData({ ...data, tasks: nextTasks });

    // Handle automated trigger checks
    if (taskData.priority === 'High') {
      executeTriggers('Task elevated to High Priority', `Task "${taskData.title}" was created with High priority.`);
    }
  };

  const handleUpdateTaskStage = (taskId: string, stage: TaskStage) => {
    const nextTasks = data.tasks.map((task) => {
      if (task.id === taskId) {
        return {
          ...task,
          stage,
          completedAt: stage === 'Completed' ? new Date().toISOString() : task.completedAt,
        };
      }
      return task;
    });

    saveWorkspaceData({ ...data, tasks: nextTasks });
  };

  const handleUpdateTaskPriority = (taskId: string, priority: TaskPriority) => {
    const nextTasks = data.tasks.map((task) => {
      if (task.id === taskId) {
        if (priority === 'High' && task.priority !== 'High') {
          executeTriggers('Task elevated to High Priority', `Priority of "${task.title}" was escalated to High.`);
        }
        return { ...task, priority };
      }
      return task;
    });

    saveWorkspaceData({ ...data, tasks: nextTasks });
  };

  const handleDeleteTask = (taskId: string) => {
    const nextTasks = data.tasks.filter((t) => t.id !== taskId);
    saveWorkspaceData({ ...data, tasks: nextTasks });
  };

  // 2. Chat Operations
  const handleSendMessage = (text: string) => {
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      senderName: activeUserProfile.name,
      senderEmail: activeUserProfile.email,
      senderRole: activeUserProfile.role,
      text: text,
      createdAt: new Date().toISOString(),
    };

    // Simple anti-misinformation / compliance trigger monitoring
    const isSlander = text.toLowerCase().includes('misinformation') || text.toLowerCase().includes('leak');
    if (isSlander) {
      newMsg.flaggedByAI = true;
      executeTriggers(
        'Chat message flagged with misinformation / breach',
        `Message block by ${activeUserProfile.name} containing key terms flagged.`
      );
    }

    const nextMessages = [...data.messages, newMsg];
    saveWorkspaceData({ ...data, messages: nextMessages });
  };

  // 3. Workflow Management Operations
  const handleToggleWorkflow = (id: string) => {
    const updated = data.workflows.map((flow) => {
      if (flow.id === id) {
        return { ...flow, active: !flow.active };
      }
      return flow;
    });
    saveWorkspaceData({ ...data, workflows: updated });
  };

  const handleAddWorkflow = (name: string, trigger: string, action: string) => {
    const newFlow: Workflow = {
      id: `flow_${Date.now()}`,
      name,
      trigger,
      action,
      active: true,
      logs: [`[${new Date().toLocaleTimeString()}] Deployment executed.`],
    };
    saveWorkspaceData({ ...data, workflows: [...data.workflows, newFlow] });
  };

  const handleRunWorkflow = (id: string) => {
    const updated = data.workflows.map((flow) => {
      if (flow.id === id) {
        const time = new Date().toLocaleTimeString();
        return {
          ...flow,
          logs: [`[${time}] Manual test run executed successfully. All parameters validated.`, ...flow.logs],
        };
      }
      return flow;
    });
    saveWorkspaceData({ ...data, workflows: updated });
  };

  // 4. Admin operations
  const handleUpdatePermissions = (profileId: string, updatedPermissions: Partial<UserProfile['permissions']>) => {
    const updatedProfiles = data.profiles.map((p) => {
      if (p.id === profileId) {
        return {
          ...p,
          permissions: { ...p.permissions, ...updatedPermissions },
        };
      }
      return p;
    });
    saveWorkspaceData({ ...data, profiles: updatedProfiles });
  };

  const handleAnnihilateAccount = (profileId: string) => {
    const updatedProfiles = data.profiles.map((p) => {
      if (p.id === profileId) {
        return { ...p, status: 'Annihilated' as UserStatus };
      }
      return p;
    });
    saveWorkspaceData({ ...data, profiles: updatedProfiles });
  };

  const handleUpdateRole = (profileId: string, role: Role) => {
    const updatedProfiles = data.profiles.map((p) => {
      if (p.id === profileId) {
        return { ...p, role };
      }
      return p;
    });
    saveWorkspaceData({ ...data, profiles: updatedProfiles });
  };

  // Build task allocations counts for profiles directory dashboard
  const taskCountsByAssignee: Record<string, { total: number; completed: number }> = {};
  data.profiles.forEach((p) => {
    const pTasks = data.tasks.filter((t) => t.assigneeId === p.id);
    taskCountsByAssignee[p.id] = {
      total: pTasks.length,
      completed: pTasks.filter((t) => t.stage === 'Completed').length,
    };
  });

  const isSecondWindowPortal = typeof window !== 'undefined' && (window.location.hash.includes('portal=2') || window.location.search.includes('portal=2'));

  if (isSecondWindowPortal) {
    return (
      <AuthPortalWindow 
        orgMergeCode={data.organization?.mergeCode} 
        theme={theme} 
        onSyncData={(updated, activeId) => {
          setData(updated);
          setActiveProfileId(activeId);
          saveWorkspaceData(updated);
        }} 
      />
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      theme === 'Black Modern' ? 'bg-[#0f172a] text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      {/* Upper Navigation Header - Highly responsive, adaptive design to prevent clutter on mobile/tablets */}
      <header className={`py-2.5 px-4 sm:py-3.5 sm:px-6 border-b flex items-center justify-between transition-all ${
        theme === 'Black Modern' ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
      }`}>
        <div className="flex items-center gap-2 sm:gap-3 max-w-[50%]">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600/10 border border-blue-200/60 flex items-center justify-center text-blue-600 font-bold text-xs sm:text-sm tracking-tight flex-shrink-0">
            {data.organization?.orgName?.[0]?.toUpperCase() || 'W'}
          </div>
          <div className="min-w-0">
            <h1 className="text-xs font-bold tracking-tight text-slate-900 dark:text-white uppercase font-sans truncate" title={data.organization?.orgName}>
              {data.organization?.orgName || 'Workspace OS'}
            </h1>
            <p className="text-[8px] sm:text-[9px] font-mono text-slate-400 uppercase tracking-widest leading-none truncate" title={activeUserProfile.role}>
              {activeUserProfile.role}
            </p>
          </div>

          {isDriveSyncing && (
            <span className="flex items-center gap-1.5 text-[8px] sm:text-[9px] font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 px-1.5 py-0.5 sm:px-2.5 rounded-full ml-1 sm:ml-2 flex-shrink-0">
              <RefreshCw className="w-2 sm:w-2.5 h-2 sm:h-2.5 animate-spin text-blue-500" />
              <span className="hidden sm:inline">SYNCHRONIZED</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Active Profile Select Dropdown with responsive widths */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="text-[9px] font-mono text-slate-450 dark:text-slate-400 hidden lg:inline uppercase tracking-wider">Node User:</span>
            <select
              value={activeProfileId}
              onChange={(e) => setActiveProfileId(e.target.value)}
              className={`text-[11px] px-1.5 py-1 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl border focus:outline-none font-sans font-semibold max-w-[90px] sm:max-w-[150px] transition-all cursor-pointer ${
                theme === 'Black Modern' ? 'bg-[#1e293b] border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {data.profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Real-time Responsive Device Telemetry Indicator - Text is hidden on mobile */}
          {deviceInfo && (
            <button
              id="device-telemetry-badge"
              onClick={() => setIsDiagnosticOpen(true)}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl border text-[10px] font-mono font-bold uppercase transition-all tracking-wider cursor-pointer select-none active:scale-95 ${
                theme === 'Black Modern' 
                  ? 'bg-slate-800/80 border-slate-700 text-cyan-400 hover:bg-slate-705' 
                  : 'bg-cyan-50/70 border-cyan-150 text-cyan-700 hover:bg-cyan-100/50'
              }`}
              title="Interactive Platform Diagnostics"
            >
              {deviceInfo.type === 'Desktop PC' && <Laptop className="w-3.5 h-3.5 text-cyan-500" />}
              {deviceInfo.type === 'Mobile Phone' && <Smartphone className="w-3.5 h-3.5 text-cyan-500" />}
              {deviceInfo.type === 'Tablet' && <Tablet className="w-3.5 h-3.5 text-cyan-500" />}
              {deviceInfo.type === 'Smart TV' && <Tv className="w-3.5 h-3.5 text-cyan-500" />}
              {deviceInfo.type === 'Automated Bot' && <Cpu className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />}
              {deviceInfo.type === 'Gaming Console' && <Cpu className="w-3.5 h-3.5 text-cyan-500" />}
              {deviceInfo.type === 'Unknown Node' && <Info className="w-3.5 h-3.5 text-cyan-500" />}
              <span className="hidden md:inline">{deviceInfo.type}</span>
              <span className="hidden lg:inline opacity-70 font-normal">({deviceInfo.screenWidth}px)</span>
            </button>
          )}

          {/* Auth Portal Access desk trigger for swap/add profile action */}
          <button
            onClick={() => {
              setIsAuthPortalSimulatedOpen(true);
            }}
            className={`text-[10px] sm:text-xs px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl font-bold tracking-wide transition-all duration-200 border cursor-pointer active:scale-95 flex items-center gap-1 sm:gap-1.5 ${
              theme === 'Black Modern' 
                ? 'bg-slate-800/80 border-slate-700 text-cyan-400 hover:bg-slate-700' 
                : 'bg-cyan-50 border-cyan-150 text-cyan-700 hover:bg-cyan-100/50'
            }`}
            title="Launch Inline Profile Authentication Desk"
          >
            <Key className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-500" />
            <span className="hidden sm:inline">Swap Nodes</span>
          </button>

          {/* Theme toggler */}
          <button
            onClick={() => setTheme((prev) => (prev === 'Whitish Modern' ? 'Black Modern' : 'Whitish Modern'))}
            className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all cursor-pointer ${
              theme === 'Black Modern' ? 'hover:bg-neutral-800 text-amber-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
            title="Toggle Visual Aesthetics"
          >
            {theme === 'Black Modern' ? <Sun className="w-3.5 sm:w-4 h-3.5 sm:h-4" /> : <Moon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}
          </button>

          {/* Google Sign In action button */}
          {accessToken ? (
            <div className="flex items-center gap-1 sm:gap-2">
              {googleUser?.picture ? (
                <img
                  src={googleUser.picture}
                  alt={googleUser.name}
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-sky-500/20"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-200" />
              )}
              <button
                onClick={handleDisconnectWorkspace}
                className="p-1 sm:p-2 rounded-lg sm:rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 cursor-pointer text-[10px] sm:text-xs"
                title="Disconnect Google Drive"
              >
                <LogOut className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectWorkspace}
              className="text-[10px] sm:text-xs px-2 py-1 sm:px-2.5 sm:py-1.5 bg-blue-50 hover:bg-blue-100/80 border border-blue-100 text-blue-600 font-semibold flex items-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl cursor-pointer transition-all"
              title="Connect Cloud Storage"
            >
              <LogIn className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Connect Drive</span>
            </button>
          )}
        </div>
      </header>

      {/* Primary Workspace Area */}
      <div className={`flex-1 flex flex-col md:flex-row mx-auto w-full transition-all duration-300 ${
        simulatedType === 'phone' 
          ? 'max-w-[430px] border-x border-slate-300 dark:border-slate-800 shadow-2xl bg-black/10' 
          : simulatedType === 'tablet' 
            ? 'max-w-[820px] border-x border-slate-300 dark:border-slate-800 shadow-2xl bg-black/10' 
            : 'w-full'
      }`}>
        {/* Sidebar Navigation */}
        <nav className={`w-full md:w-56 p-3.5 md:p-5 border-b md:border-b-0 md:border-r md:h-[calc(100vh-66px)] flex flex-row md:flex-col justify-start gap-1.5 flex-shrink-0 overflow-x-auto md:overflow-x-visible scrollbar-none transition-colors duration-300 ${
          theme === 'Black Modern' ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
        }`}>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-shrink-0 md:w-full min-w-[140px] md:min-w-0 text-left px-3 py-2 md:px-3.5 md:py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-all ${
              activeTab === 'tasks'
                ? theme === 'Black Modern' ? 'bg-[#1f2937] text-white font-bold' : 'bg-slate-50 text-blue-600 font-bold border-l-2 border-blue-600 pl-3'
                : theme === 'Black Modern' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-905'
            }`}
          >
            <span className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-blue-500" /> Priorities queue
            </span>
            <span className="text-[9px] bg-blue-50 text-blue-600 font-extrabold px-1.5 py-0.5 rounded-full border border-blue-105">
              {data.tasks.filter(t => t.stage !== 'Completed').length} active
            </span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-shrink-0 md:w-full min-w-[140px] md:min-w-0 text-left px-3 py-2 md:px-3.5 md:py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-all ${
              activeTab === 'chat'
                ? theme === 'Black Modern' ? 'bg-[#1f2937] text-white font-bold' : 'bg-purple-50 text-purple-600 font-bold border-l-2 border-purple-500 pl-3'
                : theme === 'Black Modern' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:bg-slate-100/50 hover:text-purple-600'
            }`}
          >
            <span className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-500" /> Team Chat & AI
            </span>
            <span className="text-[8px] bg-purple-50 text-purple-600 font-extrabold px-1 py-0.2 rounded border border-purple-150 uppercase tracking-widest leading-none">
              AI
            </span>
          </button>

          <button
            onClick={() => setActiveTab('workflows')}
            className={`flex-shrink-0 md:w-full min-w-[140px] md:min-w-0 text-left px-3 py-2 md:px-3.5 md:py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'workflows'
                ? theme === 'Black Modern' ? 'bg-[#1f2937] text-white font-bold' : 'bg-emerald-50 text-emerald-600 font-bold border-l-2 border-emerald-500 pl-3'
                : theme === 'Black Modern' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:bg-slate-100/50 hover:text-emerald-600'
            }`}
          >
            <Settings className="w-4 h-4 text-emerald-500" /> Automations
          </button>

          <button
            onClick={() => setActiveTab('mailing')}
            className={`flex-shrink-0 md:w-full min-w-[140px] md:min-w-0 text-left px-3 py-2 md:px-3.5 md:py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'mailing'
                ? theme === 'Black Modern' ? 'bg-[#1f2937] text-white font-bold' : 'bg-amber-50 text-amber-600 font-bold border-l-2 border-amber-500 pl-3'
                : theme === 'Black Modern' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:bg-slate-100/50 hover:text-amber-600'
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-500" /> Gmail Sender
          </button>

          <button
            onClick={() => setActiveTab('images')}
            className={`flex-shrink-0 md:w-full min-w-[140px] md:min-w-0 text-left px-3 py-2 md:px-3.5 md:py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'images'
                ? theme === 'Black Modern' ? 'bg-[#1f2937] text-white font-bold' : 'bg-cyan-50 text-cyan-600 font-bold border-l-2 border-cyan-500 pl-3'
                : theme === 'Black Modern' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:bg-slate-100/50 hover:text-cyan-600'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-500 animate-pulse" /> Image Studio
          </button>

          {activeUserProfile.role === 'Founder / Director' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex-shrink-0 md:w-full min-w-[140px] md:min-w-0 text-left px-3 py-2 md:px-3.5 md:py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                activeTab === 'admin'
                  ? theme === 'Black Modern' ? 'bg-white text-black' : 'bg-red-50 text-red-600 font-bold border-l-2 border-red-500 pl-3'
                  : theme === 'Black Modern' ? 'text-neutral-400 hover:text-white' : 'text-slate-500 hover:bg-slate-100/55 hover:text-red-650'
              }`}
            >
              <Users className="w-4 h-4 text-red-500" /> Admin Panel
            </button>
          )}
        </nav>

        {/* Selected Module Container */}
        <main className="flex-1 p-6 overflow-y-auto h-[calc(100vh-66px)]">
          {activeTab === 'tasks' && (
            <TaskBoard
              tasks={data.tasks}
              profiles={data.profiles}
              currentUser={activeUserProfile}
              onAddTask={handleAddTask}
              onUpdateTaskStage={handleUpdateTaskStage}
              onUpdateTaskPriority={handleUpdateTaskPriority}
              onDeleteTask={handleDeleteTask}
              theme={theme}
            />
          )}

          {activeTab === 'chat' && (
            <ChatAndAI
              messages={data.messages}
              profiles={data.profiles}
              currentUser={activeUserProfile}
              aiTrainingDoc={data.aiTrainingDoc}
              workspaceInfo={data}
              onSendMessage={handleSendMessage}
              onUpdateAiTraining={(doc) => saveWorkspaceData({ ...data, aiTrainingDoc: doc })}
              theme={theme}
            />
          )}

          {activeTab === 'workflows' && (
            <WorkflowManager
              workflows={data.workflows}
              onToggleWorkflow={handleToggleWorkflow}
              onAddWorkflow={handleAddWorkflow}
              onRunWorkflow={handleRunWorkflow}
              theme={theme}
            />
          )}

          {activeTab === 'mailing' && (
            <MailComposer
              accessToken={accessToken}
              theme={theme}
              profiles={data.profiles}
            />
          )}

          {activeTab === 'images' && (
            <ImageStudio
              theme={theme}
            />
          )}

          {activeTab === 'admin' && activeUserProfile.role === 'Founder / Director' && (
            <AdminPanel
              profiles={data.profiles}
              orgName={data.organization.orgName}
              teamCapacity={data.organization.teamCapacity}
              mergeCode={data.organization.mergeCode}
              onUpdatePermissions={handleUpdatePermissions}
              onAnnihilateAccount={handleAnnihilateAccount}
              onUpdateRole={handleUpdateRole}
              taskCountsByAssignee={taskCountsByAssignee}
              theme={theme}
            />
          )}
        </main>
      </div>

      {/* Platform Telemetry & Responsive Visual Simulator Modal popup */}
      {isDiagnosticOpen && deviceInfo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div 
            className={`w-full max-w-xl rounded-2xl border p-6 shadow-2xl relative overflow-hidden transition-all transform animate-[bounce_0.2s_ease-out] ${
              theme === 'Black Modern' ? 'bg-[#1e293b] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            {/* Header section with pulsating live radar */}
            <div className="flex items-center justify-between border-b pb-4 mb-4 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Activity className="w-5 h-5 text-cyan-500" />
                  <span className="absolute -top-1.5 -right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest font-sans">Hardware Diagnostics Portal</h3>
                  <p className="text-[9px] font-mono text-slate-400 uppercase tracking-widest leading-none">Live Environment Node Analysis</p>
                </div>
              </div>
              <button 
                onClick={() => setIsDiagnosticOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Simulated environment controllers */}
            <div className={`p-4 rounded-xl border mb-5 ${
              theme === 'Black Modern' ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-150'
            }`}>
              <h4 className="text-[10px] uppercase tracking-wider font-bold mb-2.5 text-slate-450 flex items-center gap-1.5 font-mono">
                <Radio className="w-3.5 h-3.5 text-cyan-500 animate-pulse" /> Active Layout Simulation Engine
              </h4>
              <p className="text-[10px] leading-snug text-slate-400 mb-3.5">
                Toggle presets below to simulate how the grid, sidebars, and workflow dashboards adapt instantly to different physical device form factors:
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => setSimulatedType('auto')}
                  className={`px-2 py-2 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider border cursor-pointer transition-all ${
                    simulatedType === 'auto'
                      ? 'bg-cyan-500 border-cyan-500 text-white shadow-xs'
                      : theme === 'Black Modern' 
                        ? 'border-slate-700 hover:bg-slate-705 text-slate-300' 
                        : 'border-slate-205 hover:bg-slate-100 text-slate-650'
                  }`}
                >
                  🌐 Native Auto
                </button>
                <button
                  onClick={() => setSimulatedType('phone')}
                  className={`px-2 py-2 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider border cursor-pointer transition-all ${
                    simulatedType === 'phone'
                      ? 'bg-cyan-500 border-cyan-500 text-white shadow-xs'
                      : theme === 'Black Modern' 
                        ? 'border-slate-700 hover:bg-slate-705 text-slate-300' 
                        : 'border-slate-205 hover:bg-slate-100 text-slate-650'
                  }`}
                >
                  📱 iPhone 16
                </button>
                <button
                  onClick={() => setSimulatedType('tablet')}
                  className={`px-2 py-2 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider border cursor-pointer transition-all ${
                    simulatedType === 'tablet'
                      ? 'bg-cyan-500 border-cyan-500 text-white shadow-xs'
                      : theme === 'Black Modern' 
                        ? 'border-slate-700 hover:bg-slate-705 text-slate-300' 
                        : 'border-slate-205 hover:bg-slate-100 text-slate-650'
                  }`}
                >
                  📟 iPad Air
                </button>
                <button
                  onClick={() => setSimulatedType('desktop')}
                  className={`px-2 py-2 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider border cursor-pointer transition-all ${
                    simulatedType === 'desktop'
                      ? 'bg-cyan-500 border-cyan-500 text-white shadow-xs'
                      : theme === 'Black Modern' 
                        ? 'border-slate-700 hover:bg-slate-705 text-slate-300' 
                        : 'border-slate-205 hover:bg-slate-100 text-slate-650'
                  }`}
                >
                  🖥️ Mac Studio
                </button>
              </div>
            </div>

            {/* Diagnostics Stats Grid */}
            <div className="grid grid-cols-2 gap-3.5 mb-5 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-mono block uppercase">Detected Classification</span>
                <div className="font-extrabold flex items-center gap-1.5 text-slate-800 dark:text-white">
                  {deviceInfo.type === 'Desktop PC' && <Laptop className="w-4 h-4 text-cyan-500" />}
                  {deviceInfo.type === 'Mobile Phone' && <Smartphone className="w-4 h-4 text-cyan-500" />}
                  {deviceInfo.type === 'Tablet' && <Tablet className="w-4 h-4 text-cyan-500" />}
                  {deviceInfo.type === 'Smart TV' && <Tv className="w-4 h-4 text-cyan-500" />}
                  {deviceInfo.type === 'Automated Bot' && <Cpu className="w-4 h-4 text-cyan-500 animate-pulse" />}
                  <span>{deviceInfo.type}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-mono block uppercase">Interactive Engine OS</span>
                <div className="font-bold text-slate-700 dark:text-slate-200">
                  {deviceInfo.os}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-mono block uppercase">Active Browser Software</span>
                <div className="font-bold text-slate-700 dark:text-slate-200">
                  {deviceInfo.browser}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-mono block uppercase">Current Viewport Metrics</span>
                <div className="font-bold font-mono text-slate-700 dark:text-slate-200">
                  {deviceInfo.screenWidth} × {deviceInfo.screenHeight} px ({deviceInfo.orientation})
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-mono block uppercase">Touch Controller Array</span>
                <div className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                  {deviceInfo.touchEnabled ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500 font-bold" /> Enabled (Touch Input Ready)
                    </>
                  ) : (
                    <>
                      <X className="w-3.5 h-3.5 text-slate-400" /> Keyboard & Mouse Pointer only
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-mono block uppercase">Retina Display Density</span>
                <div className="font-bold font-mono text-slate-700 dark:text-slate-200">
                  {deviceInfo.pixelRatio.toFixed(2)} dppx (High Definition factor)
                </div>
              </div>
            </div>

            {/* Collapsible details footer */}
            <div className="border-t pt-4 flex flex-col gap-2">
              <span className="text-[8px] font-mono text-slate-400 uppercase tracking-widest block">Environment User Agent</span>
              <p className="text-[9px] font-mono text-slate-400 leading-normal break-all p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80">
                {deviceInfo.userAgent}
              </p>
            </div>
            
            <div className="mt-5 flex justify-end">
              <button 
                onClick={() => setIsDiagnosticOpen(false)}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs tracking-wide cursor-pointer transition-all"
              >
                Close Diagnostic View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Simulated Second Window Portal */}
      {isAuthPortalSimulatedOpen && (
        <AuthPortalWindow
          isSimulated={true}
          onCloseSimulated={() => setIsAuthPortalSimulatedOpen(false)}
          orgMergeCode={data.organization?.mergeCode}
          theme={theme}
          onSyncData={(updated, activeId) => {
            setData(updated);
            setActiveProfileId(activeId);
            saveWorkspaceData(updated);
          }}
        />
      )}
    </div>
  );
}

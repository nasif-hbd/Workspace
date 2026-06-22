import React, { useState, useEffect } from 'react';
import { Key, UserPlus, LogIn, Shield, Info, Check, X, Building2, RefreshCw } from 'lucide-react';
import { UserProfile, Role, UserStatus, WorkspaceData } from '../types';

interface AuthPortalProps {
  isSimulated?: boolean;
  onCloseSimulated?: () => void;
  orgMergeCode?: string;
  theme: 'Whitish Modern' | 'Black Modern';
  onSyncData?: (updated: WorkspaceData, activeId: string) => void;
}

export default function AuthPortalWindow({
  isSimulated = false,
  onCloseSimulated,
  orgMergeCode,
  theme,
  onSyncData,
}: AuthPortalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  
  // Login Form Variables
  const [loginEmail, setLoginEmail] = useState('');
  const [loginMergeCode, setLoginMergeCode] = useState(orgMergeCode || '');

  // Signup Form Variables
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupRole, setSignupRole] = useState<Role>('Employee');
  const [signupMergeCode, setSignupMergeCode] = useState(orgMergeCode || '');

  // Status and logs
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' | null }>({ text: '', type: null });
  const [organizationInfo, setOrganizationInfo] = useState<{ orgName: string; mergeCode: string; capacity: number } | null>(null);

  const isDark = theme === 'Black Modern';

  // Load the current organization data from local storage to check permissions
  useEffect(() => {
    const loadCurrentOrg = () => {
      const local = localStorage.getItem('workspace_os_local_save');
      if (local) {
        try {
          const parsed: WorkspaceData = JSON.parse(local);
          if (parsed.organization) {
            setOrganizationInfo({
              orgName: parsed.organization.orgName,
              mergeCode: parsed.organization.mergeCode,
              capacity: parsed.organization.teamCapacity
            });
            if (!loginMergeCode) setLoginMergeCode(parsed.organization.mergeCode);
            if (!signupMergeCode) setSignupMergeCode(parsed.organization.mergeCode);
          }
        } catch (err) {
          console.error('Portal parsing exception:', err);
        }
      }
    };

    loadCurrentOrg();
    // Set up periodic sync for responsive updates
    const interval = setInterval(loadCurrentOrg, 2000);
    return () => clearInterval(interval);
  }, []);

  const triggerAlert = (text: string, type: 'success' | 'error' | 'info') => {
    setStatusMsg({ text, type });
    setTimeout(() => {
      setStatusMsg({ text: '', type: null });
    }, 5000);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginMergeCode.trim()) {
      triggerAlert('Please cross-verify all required credential fields.', 'error');
      return;
    }

    const local = localStorage.getItem('workspace_os_local_save');
    if (!local) {
      triggerAlert('No organization dataset exists! Build your brand on the main console first.', 'error');
      return;
    }

    try {
      const parsed: WorkspaceData = JSON.parse(local);
      if (!parsed.organization || parsed.organization.mergeCode !== loginMergeCode.trim()) {
        triggerAlert('Organization Merge Code does not match registered company.', 'error');
        return;
      }

      const matchedProfile = parsed.profiles.find(
        (p) => p.email.toLowerCase() === loginEmail.trim().toLowerCase()
      );

      if (!matchedProfile) {
        triggerAlert('Credentials mismatch. No node detected with this registered email.', 'error');
        return;
      }

      if (matchedProfile.status === 'Annihilated') {
        triggerAlert('CRITICAL LOCK: This profile has been permanently annihilated by compliance triggers.', 'error');
        return;
      }

      // Sync verified sessions
      localStorage.setItem('workspace_os_active_profile', matchedProfile.id);
      localStorage.setItem('workspace_os_active_profile_switched', Date.now().toString());

      if (window.opener) {
        try {
          window.opener.postMessage({ type: 'PORTAL_SWITCH_PROFILE', profileId: matchedProfile.id }, '*');
        } catch (err) {
          console.error('PostMessage blocked by sandbox constraints:', err);
        }
      }

      if (onSyncData) {
        onSyncData(parsed, matchedProfile.id);
      }

      triggerAlert(`Welcome back, ${matchedProfile.name}! Node session verified.`, 'success');
      
      if (!isSimulated) {
        setTimeout(() => {
          window.close();
        }, 1200);
      } else {
        if (onCloseSimulated) {
          setTimeout(() => {
            onCloseSimulated();
          }, 1200);
        }
      }

    } catch (err) {
      triggerAlert('Active key mapping parsing exception.', 'error');
    }
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName.trim() || !signupEmail.trim() || !signupMergeCode.trim()) {
      triggerAlert('Please enter valid data for all required signup credentials.', 'error');
      return;
    }

    const local = localStorage.getItem('workspace_os_local_save');
    if (!local) {
      triggerAlert('No organization template exists! Onboard on the main page console first.', 'error');
      return;
    }

    try {
      const parsed: WorkspaceData = JSON.parse(local);
      if (!parsed.organization || parsed.organization.mergeCode !== signupMergeCode.trim()) {
        triggerAlert('Enterprise Merge Access Code does not match.', 'error');
        return;
      }

      const emailExists = parsed.profiles.some(
        (p) => p.email.toLowerCase() === signupEmail.trim().toLowerCase()
      );

      if (emailExists) {
        triggerAlert('This email is already registered inside this organization cluster.', 'error');
        return;
      }

      const activeMemberCount = parsed.profiles.filter((p) => p.status === 'Active').length;
      if (activeMemberCount >= parsed.organization.teamCapacity) {
        triggerAlert(`Capacity reached! Organization limits are capped at ${parsed.organization.teamCapacity} active nodes.`, 'error');
        return;
      }

      const newProfile: UserProfile = {
        id: `prof_${Date.now()}`,
        name: signupName.trim(),
        email: signupEmail.trim().toLowerCase(),
        role: signupRole,
        status: 'Active',
        permissions: {
          canEditWorkflows: signupRole === 'Manager' || signupRole === 'Founder / Director',
          canSendEmails: true,
          canAssignTasks: signupRole === 'Manager' || signupRole === 'Founder / Director',
          canManageTeam: signupRole === 'Founder / Director',
        }
      };

      const updatedWorkspace: WorkspaceData = {
        ...parsed,
        profiles: [...parsed.profiles, newProfile],
      };

      // Save changes locally in localStorage immediately. App.tsx listens to storage changes.
      localStorage.setItem('workspace_os_local_save', JSON.stringify(updatedWorkspace));
      localStorage.setItem('workspace_os_active_profile', newProfile.id);
      localStorage.setItem('workspace_os_active_profile_switched', Date.now().toString());

      if (window.opener) {
        try {
          window.opener.postMessage({ 
            type: 'PORTAL_SIGNUP', 
            updatedData: updatedWorkspace, 
            profileId: newProfile.id 
          }, '*');
        } catch (err) {
          console.error('PostMessage transmission blocked by standard browser context:', err);
        }
      }

      if (onSyncData) {
        onSyncData(updatedWorkspace, newProfile.id);
      }

      triggerAlert(`Success! Device Node registered. Logged in as ${newProfile.name}.`, 'success');

      setSignupName('');
      setSignupEmail('');

      if (!isSimulated) {
        setTimeout(() => {
          window.close();
        }, 1200);
      } else {
        if (onCloseSimulated) {
          setTimeout(() => {
            onCloseSimulated();
          }, 1200);
        }
      }

    } catch (err) {
      triggerAlert('Register profile parse sync exception.', 'error');
    }
  };

  const portalContent = (
    <div className="space-y-6">
      {/* Alert banner */}
      {statusMsg.text && (
        <div className={`p-3 rounded-xl border text-[11px] font-sans flex items-start gap-2 animate-pulse ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : statusMsg.type === 'error'
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
        }`}>
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Connection Indicator Bar */}
      <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-mono select-none ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-205'
      }`}>
        <div className="flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 text-cyan-500 animate-spin" />
          <span className="text-[10px] uppercase font-bold tracking-wider">Drive Link Safe: Sync Mode Active</span>
        </div>
        <span className="text-[8px] bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-full uppercase font-bold">
          {organizationInfo ? organizationInfo.orgName : 'Offline Workspace'}
        </span>
      </div>

      {/* Tabs */}
      <div className={`grid grid-cols-2 p-1 rounded-xl border ${
        isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-100/75 border-slate-200'
      }`}>
        <button
          onClick={() => setActiveTab('login')}
          className={`py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'login'
              ? isDark ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-705' : 'bg-white text-blue-600 shadow-xs border border-slate-200'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <LogIn className="w-3.5 h-3.5" /> Sign In Cluster
        </button>
        <button
          onClick={() => setActiveTab('signup')}
          className={`py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'signup'
              ? isDark ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-705' : 'bg-white text-blue-600 shadow-xs border border-slate-200'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" /> Sign Up Node
        </button>
      </div>

      {/* Login Screen Form */}
      {activeTab === 'login' ? (
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider font-mono opacity-80 text-slate-400">Node Email Address</label>
            <input
              type="email"
              required
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="name@company.org"
              className={`w-full p-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 ${
                isDark 
                  ? 'bg-slate-900 border-slate-800 focus:border-slate-700 text-white' 
                  : 'bg-white border-slate-200 focus:border-blue-300 focus:ring-blue-100'
              }`}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider font-mono opacity-80 text-slate-400">Organization Merge Code</label>
            <input
              type="text"
              required
              value={loginMergeCode}
              onChange={(e) => setLoginMergeCode(e.target.value)}
              placeholder="ORG-MERGE-99X"
              className={`w-full p-2.5 text-xs font-mono rounded-xl border focus:outline-none focus:ring-1 ${
                isDark 
                  ? 'bg-slate-900 border-slate-800 focus:border-slate-700 text-white' 
                  : 'bg-white border-slate-200 focus:border-blue-300 focus:ring-blue-100'
              }`}
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 mt-4 text-xs font-bold tracking-widest uppercase transition-all rounded-xl cursor-pointer bg-cyan-600 hover:bg-cyan-700 text-white active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4" /> Secure Verify Node
          </button>
        </form>
      ) : (
        <form onSubmit={handleSignupSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider font-mono opacity-80 text-slate-400">Your Full Name</label>
            <input
              type="text"
              required
              value={signupName}
              onChange={(e) => setSignupName(e.target.value)}
              placeholder="e.g. Alice Higgins"
              className={`w-full p-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 ${
                isDark 
                  ? 'bg-slate-900 border-slate-800 focus:border-slate-700 text-white' 
                  : 'bg-white border-slate-200 focus:border-blue-300 focus:ring-blue-100'
              }`}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider font-mono opacity-80 text-slate-400">Workforce Email Address</label>
            <input
              type="email"
              required
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
              placeholder="alice@company.org"
              className={`w-full p-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 ${
                isDark 
                  ? 'bg-slate-900 border-slate-800 focus:border-slate-700 text-white' 
                  : 'bg-white border-slate-200 focus:border-blue-300 focus:ring-blue-100'
              }`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider font-mono opacity-80 text-slate-400">Cluster Role Node</label>
              <select
                value={signupRole}
                onChange={(e) => setSignupRole(e.target.value as Role)}
                className={`w-full p-2.5 text-xs rounded-xl border focus:outline-none ${
                  isDark 
                    ? 'bg-slate-900 border-slate-800 text-white' 
                    : 'bg-white border-slate-200 text-slate-700 focus:border-blue-300'
                }`}
              >
                <option value="Employee">Employee Node</option>
                <option value="Manager">Manager Node</option>
                <option value="Founder / Director">Founder Node</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider font-mono opacity-80 text-slate-400">Merge Access Code</label>
              <input
                type="text"
                required
                value={signupMergeCode}
                onChange={(e) => setSignupMergeCode(e.target.value)}
                placeholder="ORG-MERGE-99X"
                className={`w-full p-2.5 text-xs font-mono rounded-xl border focus:outline-none focus:ring-1 ${
                  isDark 
                    ? 'bg-slate-900 border-slate-800 focus:border-slate-700 text-white' 
                    : 'bg-white border-slate-200 focus:border-blue-300 focus:ring-blue-100'
                }`}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 mt-4 text-xs font-bold tracking-widest uppercase transition-all rounded-xl cursor-pointer bg-cyan-600 hover:bg-cyan-700 text-white active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> Register & Link Node
          </button>
        </form>
      )}

      {/* Helpful Hint */}
      <div className={`p-3 rounded-xl border text-[9px] leading-relaxed font-sans text-slate-500 dark:text-slate-400 flex items-start gap-1.5 ${
        isDark ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-50 border-slate-100'
      }`}>
        <Info className="w-3.5 h-3.5 text-cyan-500 mt-0.5 flex-shrink-0" />
        <div>
          <span className="font-bold">REAL-TIME DATA DRIVE STORAGE PERSISTENCE:</span> All profile records, login session keys, active task structures, and compliance logs are instantly written and securely updated inside the central Google Drive save slot <code className="font-mono bg-black/10 px-1 py-0.5 rounded text-[8px]">workspace_os_data.json</code> of the owner's Google Workspace storage account.
        </div>
      </div>
    </div>
  );

  // If we are showing this as the main view of a real separate page, render with appropriate wrapper
  if (!isSimulated) {
    return (
      <div className={`min-h-screen flex flex-col justify-center items-center p-6 ${
        isDark ? 'bg-[#0f172a]' : 'bg-slate-50'
      }`}>
        <div 
          className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl relative overflow-hidden transition-all text-slate-850 dark:text-slate-100 ${
            isDark ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          {/* Main Title Header */}
          <div className="flex items-center gap-2.5 border-b pb-4 mb-4 border-slate-100 dark:border-slate-800">
            <div className="p-2 bg-sky-500/10 rounded-xl">
              <Building2 className="w-5 h-5 text-sky-500" />
            </div>
            <div>
              <h1 className="text-xs font-extrabold tracking-widest font-sans uppercase">SECURE AUTHENTICATION WINDOW 2</h1>
              <p className="text-[8px] text-neutral-400 font-mono uppercase tracking-widest leading-none">Workspace Cluster Authentication Desk</p>
            </div>
          </div>

          {portalContent}
        </div>
      </div>
    );
  }

  // Otherwise, render as a draggable simulated popup window with titlebar
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div 
        className={`w-full max-w-md rounded-2xl border shadow-2xl relative overflow-hidden transition-all text-slate-850 dark:text-slate-100 ${
          isDark ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* Mock OS Window Titlebar */}
        <div className="bg-slate-900 text-slate-300 px-4 py-2.5 flex items-center justify-between select-none border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block cursor-pointer active:opacity-75" onClick={onCloseSimulated} title="Close Window"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block cursor-pointer" title="Minimize Window"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block cursor-pointer" title="Expand Window"></span>
            </div>
            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 ml-2">SECURE PORTAL WINDOW 2: AUTHENTICATION DESK</span>
          </div>
          <button 
            onClick={onCloseSimulated}
            className="p-0.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-6">
          {portalContent}
        </div>
      </div>
    </div>
  );
}

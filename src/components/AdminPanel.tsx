import React, { useState } from 'react';
import { UserProfile, Role, UserStatus } from '../types';
import { Users, Shield, ShieldAlert, Check, X, AlertTriangle, Key, TrendingUp, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface AdminPanelProps {
  profiles: UserProfile[];
  orgName: string;
  teamCapacity: number;
  mergeCode: string;
  onUpdatePermissions: (profileId: string, updatedPermissions: Partial<UserProfile['permissions']>) => void;
  onAnnihilateAccount: (profileId: string) => void;
  onUpdateRole: (profileId: string, role: Role) => void;
  taskCountsByAssignee: Record<string, { total: number; completed: number }>;
  theme: 'Whitish Modern' | 'Black Modern';
}

export default function AdminPanel({
  profiles,
  orgName,
  teamCapacity,
  mergeCode,
  onUpdatePermissions,
  onAnnihilateAccount,
  onUpdateRole,
  taskCountsByAssignee,
  theme,
}: AdminPanelProps) {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const isDark = theme === 'Black Modern';

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);

  // Compile performance tracking data for Recharts Bar Chart
  const chartData = profiles
    .filter((p) => p.status !== 'Annihilated')
    .map((p) => {
      const stats = taskCountsByAssignee[p.id] || { total: 0, completed: 0 };
      const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
      return {
        name: p.name,
        'Tasks Assigned': stats.total,
        'Tasks Completed': stats.completed,
        'Completion Rate (%)': rate,
        role: p.role,
      };
    });

  const handleTogglePerm = (profileId: string, key: keyof UserProfile['permissions'], currentVal: boolean) => {
    onUpdatePermissions(profileId, { [key]: !currentVal });
  };

  const handleAnnihilate = (profile: UserProfile) => {
    const verified = window.confirm(
      `🔴 WARNING: This is a permanent and non-reversible operation.\n\nAre you sure you want to COMPLETELY ANNIHILATE AND TERMINATE the workspace account for ${profile.name} (${profile.role})? \n\nAll access keys, outgoing Gmail options, and active dashboard access will be immediately zeroed. This is deployed for misinformation of core organization details.`
    );
    if (verified) {
      onAnnihilateAccount(profile.id);
      if (selectedProfileId === profile.id) {
        setSelectedProfileId(null);
      }
    }
  };

  const handleRoleChange = (profileId: string, value: string) => {
    onUpdateRole(profileId, value as Role);
  };

  return (
    <div className="space-y-6">
      {/* Upper Registry / Basic Settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          className={`p-5 rounded-2xl border ${
            isDark ? 'bg-[#1e293b] border-slate-800 shadow-xl' : 'bg-white border-slate-200/85 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
            <Users className="w-5 h-5" />
            <h4 className="text-[10px] font-bold uppercase tracking-widest font-mono">Active Roll Call</h4>
          </div>
          <div className="text-2xl font-extrabold mt-1 text-slate-800 dark:text-white">
            {profiles.filter((p) => p.status === 'Active').length} <span className="text-xs font-normal text-slate-400">/ {teamCapacity} Members</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono mt-1 uppercase tracking-wider">Status: Deployed Active</p>
        </div>

        <div 
          className={`p-5 rounded-2xl border ${
            isDark ? 'bg-[#1e293b] border-slate-800 shadow-xl' : 'bg-white border-slate-200/85 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2 text-red-500 mb-2">
            <ShieldAlert className="w-5 h-5" />
            <h4 className="text-[10px] font-bold uppercase tracking-widest font-mono">Annihilated Profiles</h4>
          </div>
          <div className="text-2xl font-extrabold mt-1 text-red-500">
            {profiles.filter((p) => p.status === 'Annihilated').length} <span className="text-xs font-normal text-slate-400">Accounts Voided</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono mt-1 uppercase tracking-wider">Misinformation Filter: On</p>
        </div>

        <div 
          className={`p-5 rounded-2xl border ${
            isDark ? 'bg-[#1e293b] border-slate-800 shadow-xl' : 'bg-white border-slate-200/85 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2 text-purple-650 dark:text-purple-400 mb-2">
            <Key className="w-5 h-5" />
            <h4 className="text-[10px] font-bold uppercase tracking-widest font-mono">Onboarding Code</h4>
          </div>
          <div className="text-sm font-mono font-bold mt-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg inline-block select-all text-purple-600 border border-purple-100">
            {mergeCode}
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">Provide this core token to invite organization nodes.</p>
        </div>
      </div>

      {/* Main split dashboard list */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Profiles Registry List (Cols 5) */}
        <div 
          className={`lg:col-span-5 p-5 rounded-2xl border flex flex-col ${
            isDark ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200/85 shadow-xs'
          }`}
        >
          <h3 className="text-sm font-extrabold text-slate-850 dark:text-white uppercase tracking-widest text-[10px] font-mono mb-4">Workspace Directories</h3>
          <div className="space-y-2.5 flex-grow overflow-y-auto max-h-[400px]">
            {profiles.map((prof) => {
              const stats = taskCountsByAssignee[prof.id] || { total: 0, completed: 0 };
              const isAnnihilated = prof.status === 'Annihilated';

              return (
                <div
                  key={prof.id}
                  onClick={() => !isAnnihilated && setSelectedProfileId(prof.id)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition-all select-none ${
                    isAnnihilated
                      ? 'border-red-500/20 bg-red-500/5 opacity-55 animate-pulse'
                      : selectedProfileId === prof.id
                        ? isDark ? 'border-sky-500/30 bg-sky-500/10' : 'border-blue-200 bg-blue-50/40'
                        : isDark ? 'border-slate-800 bg-[#161616] hover:bg-[#1f1f1f] cursor-pointer' : 'border-slate-150/60 bg-slate-50/20 hover:bg-slate-100/40 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs ${
                      isAnnihilated 
                        ? 'bg-red-950/20 text-red-500 border-red-500/30' 
                        : isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-200 border-slate-300 text-slate-800'
                    }`}>
                      {prof.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold flex items-center gap-1.5 text-slate-800 dark:text-white">
                        {prof.name}
                        {prof.role === 'Founder / Director' && (
                          <span className="text-[8px] font-mono font-bold uppercase px-1.5 py-0.2 shadow-xs bg-red-50 text-red-650 border border-red-200 rounded">
                            HEAD
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono italic truncate">{prof.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-right flex-shrink-0">
                    <div>
                      <span className={`text-[9px] font-bold block ${
                        isAnnihilated ? 'text-red-500' : 'text-slate-400'
                      }`}>
                        {isAnnihilated ? 'ANNIHILATED' : prof.role}
                      </span>
                      {!isAnnihilated && (
                        <span className="text-[8px] font-mono opacity-50 block">Tasks: {stats.completed}/{stats.total}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Individual permission controls (Cols 7) */}
        <div className="lg:col-span-7 space-y-6">
          {selectedProfile && selectedProfile.status !== 'Annihilated' ? (
            <div 
              className={`p-6 rounded-2xl border space-y-6 ${
                isDark ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-202/90 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between border-b pb-4 border-slate-100 dark:border-slate-800/80">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-850 dark:text-white">{selectedProfile.name}</h3>
                  <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Gate Access & Authority Parameters</p>
                </div>

                {selectedProfile.role !== 'Founder / Director' && (
                  <button
                    onClick={() => handleAnnihilate(selectedProfile)}
                    className="px-3.5 py-1.5 rounded-lg bg-red-650 hover:bg-red-700 text-white text-[10px] font-bold cursor-pointer transition-all hover:scale-105 shadow-sm"
                  >
                    Annihilate Account
                  </button>
                )}
              </div>

              {/* Modify Role */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider text-[9px] font-mono">Designation Level Role</label>
                <select
                  value={selectedProfile.role}
                  onChange={(e) => handleRoleChange(selectedProfile.id, e.target.value)}
                  disabled={selectedProfile.role === 'Founder / Director'}
                  className={`p-2.5 text-xs rounded-xl border focus:outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50/55 border-slate-200 text-slate-700'
                  }`}
                >
                  <option value="Manager">Manager</option>
                  <option value="Employee">Employee</option>
                </select>
                {selectedProfile.role === 'Founder / Director' && (
                  <span className="text-[9px] text-amber-500 font-mono mt-1 block">Founder profile security permissions are immutable.</span>
                )}
              </div>

              {/* Toggles */}
              <div className="space-y-3.5">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 font-mono">
                  <Shield className="w-3.5 h-3.5 text-blue-500" /> Administrative Capability Gates
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50/50 border-slate-150'
                  }`}>
                    <div>
                      <span className="text-xs font-bold block text-slate-800 dark:text-white">Edit Automated Workflows</span>
                      <span className="text-[9px] text-slate-400 font-sans block mt-0.5">Toggle capability to build custom trigger/action nodes.</span>
                    </div>
                    <button
                      onClick={() => handleTogglePerm(selectedProfile.id, 'canEditWorkflows', selectedProfile.permissions.canEditWorkflows)}
                      disabled={selectedProfile.role === 'Founder / Director'}
                      className={`p-1 rounded-md cursor-pointer transition-colors ${
                        selectedProfile.permissions.canEditWorkflows ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-500'
                      }`}
                    >
                      {selectedProfile.permissions.canEditWorkflows ? <Check className="w-5 h-5 font-bold" /> : <X className="w-5 h-5" />}
                    </button>
                  </div>

                  <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50/50 border-slate-150'
                  }`}>
                    <div>
                      <span className="text-xs font-bold block text-slate-800 dark:text-white">Send Outgoing Client Emails</span>
                      <span className="text-[9px] text-slate-400 font-sans block mt-0.5">Allow access to compile/send emails via Gmail API client.</span>
                    </div>
                    <button
                      onClick={() => handleTogglePerm(selectedProfile.id, 'canSendEmails', selectedProfile.permissions.canSendEmails)}
                      disabled={selectedProfile.role === 'Founder / Director'}
                      className={`p-1 rounded-md cursor-pointer transition-colors ${
                        selectedProfile.permissions.canSendEmails ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-500'
                      }`}
                    >
                      {selectedProfile.permissions.canSendEmails ? <Check className="w-5 h-5 font-bold" /> : <X className="w-5 h-5" />}
                    </button>
                  </div>

                  <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50/50 border-slate-150'
                  }`}>
                    <div>
                      <span className="text-xs font-bold block text-slate-800 dark:text-white">Assign & Delegate Tasks</span>
                      <span className="text-[9px] text-slate-400 font-sans block mt-0.5">Allow assignment of tasks to other team profile nodes.</span>
                    </div>
                    <button
                      onClick={() => handleTogglePerm(selectedProfile.id, 'canAssignTasks', selectedProfile.permissions.canAssignTasks)}
                      disabled={selectedProfile.role === 'Founder / Director'}
                      className={`p-1 rounded-md cursor-pointer transition-colors ${
                        selectedProfile.permissions.canAssignTasks ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-500'
                      }`}
                    >
                      {selectedProfile.permissions.canAssignTasks ? <Check className="w-5 h-5 font-bold" /> : <X className="w-5 h-5" />}
                    </button>
                  </div>

                  <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50/50 border-slate-150'
                  }`}>
                    <div>
                      <span className="text-xs font-bold block text-slate-800 dark:text-white">Configure Organization</span>
                      <span className="text-[9px] text-slate-400 font-sans block mt-0.5">Permit changing merge codes and team capacity boundaries.</span>
                    </div>
                    <button
                      onClick={() => handleTogglePerm(selectedProfile.id, 'canManageTeam', selectedProfile.permissions.canManageTeam)}
                      disabled={selectedProfile.role === 'Founder / Director'}
                      className={`p-1 rounded-md cursor-pointer transition-colors ${
                        selectedProfile.permissions.canManageTeam ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-500'
                      }`}
                    >
                      {selectedProfile.permissions.canManageTeam ? <Check className="w-5 h-5 font-bold" /> : <X className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div 
              className={`p-6 rounded-2xl border min-h-[300px] flex flex-col justify-center items-center text-center text-slate-400 gap-2 ${
                isDark ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200/85 shadow-xs'
              }`}
            >
              <ShieldAlert className="w-10 h-10 text-slate-400 opacity-20 mb-1" />
              <h4 className="text-xs font-bold font-sans text-slate-800 dark:text-white">Workspace Policy Registry</h4>
              <p className="text-[10px] leading-relaxed max-w-[250px]">
                Select an active profile on the left to review metrics, toggle administration gates, or annihilate account logs in case of misinformation.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Performance tracking dashboards effectively (Recharts) */}
      <div 
        className={`p-6 rounded-2xl border ${
          isDark ? 'bg-[#1e293b] border-slate-805 shadow-xl' : 'bg-white border-slate-200/85 shadow-xs'
        }`}
      >
        <h4 className="text-[10px] font-bold uppercase tracking-widest mb-4 flex items-center gap-1.5 font-mono text-slate-400"><TrendingUp className="w-4 h-4 text-emerald-500 animate-bounce" />Team Velocity Performance Tracker</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <XAxis dataKey="name" stroke={isDark ? '#475569' : '#94a3b8'} fontSize={9} tickLine={false} />
              <YAxis stroke={isDark ? '#475569' : '#94a3b8'} fontSize={9} tickLine={false} />
              <Tooltip 
                cursor={{ fill: isDark ? '#334155' : '#f8fafc' }}
                contentStyle={{ 
                  backgroundColor: isDark ? '#1e293b' : '#ffffff', 
                  borderColor: isDark ? '#334155' : '#cbd5e1',
                  color: isDark ? '#ffffff' : '#1e293b',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 500
                }}
              />
              <Bar dataKey="Tasks Assigned" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Tasks Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Workflow } from '../types';
import { Settings, Play, ToggleLeft, ToggleRight, Database, AlertCircle, Sparkles, Plus, Clock, Terminal, ChevronRight } from 'lucide-react';

interface WorkflowManagerProps {
  workflows: Workflow[];
  onToggleWorkflow: (id: string) => void;
  onAddWorkflow: (name: string, trigger: string, action: string) => void;
  onRunWorkflow: (id: string) => void;
  theme: 'Whitish Modern' | 'Black Modern';
}

export default function WorkflowManager({
  workflows,
  onToggleWorkflow,
  onAddWorkflow,
  onRunWorkflow,
  theme,
}: WorkflowManagerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('Task elevated to High Priority');
  const [action, setAction] = useState('Send automated Gmail notification alert');

  const isDark = theme === 'Black Modern';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddWorkflow(name.trim(), trigger, action);
    setName('');
    setShowAddModal(false);
  };

  const triggersList = [
    'Task elevated to High Priority',
    'Chat message flagged with misinformation / breach',
    'New employee profile requested to merge into organization',
    'Workspace database save request dispatched to Google Drive',
    'Email dispatch triggered via secure outbox',
  ];

  const actionsList = [
    'Send automated Gmail notification alert',
    'Run immediate Central AI compliance audit',
    'Generate AI detail analysis inside team channel',
    'Write trace report and sync data file directly to Google Drive',
    'Annihilate profile automatically if mismatch discovered',
  ];

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
            <Settings className="w-5 h-5 text-indigo-500" />
            Automated Workflow Manager
          </h2>
          <p className="text-xs text-neutral-400 font-mono">Build triggers as and when operations change</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:scale-[1.02] transition-all cursor-pointer ${
            isDark 
              ? 'bg-white text-black hover:bg-neutral-100' 
              : 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-md'
          }`}
        >
          <Plus className="w-4 h-4" /> Config Workflow
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Central Workflows Registry (Cols 2) */}
        <div className="lg:col-span-2 space-y-4">
          {workflows.map((flow) => (
            <div
              key={flow.id}
              className={`p-5 rounded-2xl border transition-all ${
                isDark 
                  ? 'bg-[#1e293b] border-slate-800 shadow-xl' 
                  : 'bg-white border-slate-200/85 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    <Database className="w-4 h-4 text-emerald-500" />
                    {flow.name}
                  </h3>
                  <div className="mt-2 space-y-1 font-mono text-[10px]">
                    <div className="flex items-center gap-1.5 opacity-80">
                      <span className="font-bold text-amber-600">Trigger:</span>
                      <span className={isDark ? 'text-slate-300' : 'text-slate-650'}>{flow.trigger}</span>
                    </div>
                    <div className="flex items-center gap-1.5 opacity-80">
                      <span className="font-bold text-sky-600">Action:</span>
                      <span className={isDark ? 'text-slate-300' : 'text-slate-650'}>{flow.action}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Test Trigger */}
                  <button
                    onClick={() => onRunWorkflow(flow.id)}
                    className={`p-2 rounded-xl border text-xs transition-all hover:scale-105 cursor-pointer ${
                      isDark 
                        ? 'bg-[#1a1a1a] border-slate-800 text-sky-400 hover:bg-slate-800' 
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                    title="Manual Test Execute"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>

                  {/* Toggle Active status */}
                  <button
                    onClick={() => onToggleWorkflow(flow.id)}
                    className="p-1 rounded-xl transition-all cursor-pointer"
                  >
                    {flow.active ? (
                      <ToggleRight className="w-7 h-7 text-emerald-500 font-extralight" />
                    ) : (
                      <ToggleLeft className="w-7 h-7 text-slate-350" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT: Combined Audit Trail & Execution Terminal */}
        <div 
          className={`p-5 rounded-2xl border flex flex-col h-[400px] overflow-hidden ${
            isDark 
              ? 'bg-[#1e293b] border-slate-800 shadow-xl' 
              : 'bg-slate-50/40 border-slate-200 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-1.5 mb-3 border-b pb-2 border-slate-100 dark:border-slate-800/80">
            <Terminal className="w-4 h-4 text-emerald-500 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Active Execution Logs</h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 font-mono text-[9px] text-neutral-400">
            {workflows.flatMap(w => w.logs).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-2">
                <AlertCircle className="w-8 h-8 opacity-20 text-neutral-400" />
                <span>No automated jobs logged yet. Deploy triggers or tap "Test" above.</span>
              </div>
            ) : (
              workflows
                .flatMap(w => w.logs.map(log => ({ ...w, log })))
                .sort((a, b) => b.log.localeCompare(a.log)) // Show latest logs on top
                .map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`p-2.5 rounded-lg border flex items-start gap-1.5 leading-relaxed leading-tight ${
                      isDark ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-200'
                    }`}
                  >
                    <ChevronRight className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[8px] opacity-50 block mb-0.5">{item.log.split(']')[0] + ']'}</span>
                      <span className={isDark ? 'text-neutral-200' : 'text-neutral-700'}>{item.log.split(']')[1] || item.log}</span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Configuration modal */}
      {showAddModal && (
        <div id="modal_overlay" className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-md p-6 rounded-2xl border ${
            isDark ? 'bg-[#161616] border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
          }`}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />Initialize Workflow Integration</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 opacity-70">Operation Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., SLA Automated Alert Dispatcher"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full p-2.5 text-sm rounded-xl border focus:outline-none ${
                    isDark ? 'bg-[#202020] border-neutral-800 text-white focus:border-neutral-700' : 'bg-white border-neutral-200 text-neutral-900 focus:border-neutral-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 opacity-70">Trigger Policy</label>
                <select
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value)}
                  className={`w-full p-2.5 text-sm rounded-xl border focus:outline-none ${
                    isDark ? 'bg-[#202020] border-neutral-800 text-neutral-300' : 'bg-white border-neutral-200 text-neutral-700'
                  }`}
                >
                  {triggersList.map((trig, idx) => (
                    <option key={idx} value={trig}>{trig}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 opacity-70">Automated Action Execute</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className={`w-full p-2.5 text-sm rounded-xl border focus:outline-none ${
                    isDark ? 'bg-[#202020] border-neutral-800 text-neutral-300' : 'bg-white border-neutral-200 text-neutral-700'
                  }`}
                >
                  {actionsList.map((act, idx) => (
                    <option key={idx} value={act}>{act}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                    isDark ? 'bg-[#222] hover:bg-[#333] text-neutral-400' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                    isDark ? 'bg-white text-black hover:bg-neutral-100' : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                  }`}
                >
                  Create Trigger Workflow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

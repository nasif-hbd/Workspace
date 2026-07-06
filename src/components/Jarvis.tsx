import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Bot, X, Send, Mic, MicOff, Volume2, VolumeX, Mail, Bell, Sparkles,
  AlertTriangle, Loader2, Inbox as InboxIcon, RefreshCw, MessageSquare,
  ShieldAlert, CheckCircle2, Trash2, PlusCircle,
} from 'lucide-react';
import {
  UserProfile, WorkspaceData, Task, TaskPriority, TaskStage,
  JarvisMemoryEntry, JarvisAlert, JarvisAction, UITheme,
} from '../types';
import { listRecentEmails, InboxMessage } from '../googleApi';

interface JarvisProps {
  workspaceInfo: WorkspaceData;
  currentUser: UserProfile;
  accessToken: string | null;
  theme: UITheme;
  onAddTask: (taskData: Omit<Task, 'id' | 'createdAt' | 'createdBy'>) => void;
  onUpdateTaskStageByTitle: (taskTitle: string, stage: TaskStage) => boolean;
  onSaveMemory: (memory: JarvisMemoryEntry[]) => void;
  onSaveAlerts: (alerts: JarvisAlert[]) => void;
  onDraftEmail: (to: string, subject: string, body: string) => void;
}

type JarvisTab = 'chat' | 'inbox' | 'alerts';

interface EmailScanResult {
  summary: string;
  requiresAction: boolean;
  actionItems: { title: string; priority: TaskPriority }[];
}

const SpeechRecognitionCtor: any =
  typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

function describeAction(action: JarvisAction): string {
  switch (action.name) {
    case 'create_task':
      return action.status === 'applied'
        ? `Task created: "${action.args.title}"`
        : `Could not create task "${action.args.title}"`;
    case 'update_task_stage':
      return action.status === 'applied'
        ? `Moved "${action.args.taskTitle}" to ${action.args.stage}`
        : `Couldn't find a task matching "${action.args.taskTitle}"`;
    case 'draft_email':
      return `Drafted an email${action.args.to ? ` to ${action.args.to}` : ''} - review it in the Gmail Sender tab`;
    case 'flag_alert':
      return `Alert raised: ${action.args.title}`;
    default:
      return action.resultSummary;
  }
}

export default function Jarvis({
  workspaceInfo,
  currentUser,
  accessToken,
  theme,
  onAddTask,
  onUpdateTaskStageByTitle,
  onSaveMemory,
  onSaveAlerts,
  onDraftEmail,
}: JarvisProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<JarvisTab>('chat');
  const [chatInput, setChatInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const [inboxMessages, setInboxMessages] = useState<InboxMessage[]>([]);
  const [isInboxLoading, setIsInboxLoading] = useState(false);
  const [scanResults, setScanResults] = useState<Record<string, EmailScanResult>>({});
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [manualEmail, setManualEmail] = useState({ from: '', subject: '', body: '' });

  const [isBriefingLoading, setIsBriefingLoading] = useState(false);

  const memory = workspaceInfo.jarvisMemory || [];
  const alerts = workspaceInfo.jarvisAlerts || [];
  const activeAlerts = alerts.filter((a) => !a.dismissed);

  const isDark = theme === 'Black Modern';
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [memory, isOpen, activeTab]);

  useEffect(() => {
    if (isOpen && activeTab === 'inbox' && accessToken && inboxMessages.length === 0) {
      refreshInbox();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeTab, accessToken]);

  // Periodic proactive monitoring - JARVIS checks in on its own every 15 minutes while open
  useEffect(() => {
    const interval = setInterval(() => {
      runBriefing(true);
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceInfo.tasks, workspaceInfo.organization]);

  const speak = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    const clean = text.replace(/[*_`#]/g, '');
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.02;
    utterance.pitch = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    if (!SpeechRecognitionCtor) {
      alert('Voice recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) {
        setChatInput(transcript);
        setTimeout(() => sendMessage(transcript), 150);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const applyAction = (name: JarvisAction['name'], args: Record<string, any>): JarvisAction => {
    try {
      switch (name) {
        case 'create_task': {
          onAddTask({
            title: args.title,
            description: args.description || '',
            priority: (args.priority as TaskPriority) || 'Medium',
            stage: 'To-Do',
            assigneeId: args.assigneeId || 'Personal',
          });
          return { name, args, status: 'applied', resultSummary: `Created task "${args.title}"` };
        }
        case 'update_task_stage': {
          const ok = onUpdateTaskStageByTitle(args.taskTitle, args.stage as TaskStage);
          return {
            name,
            args,
            status: ok ? 'applied' : 'failed',
            resultSummary: ok ? `Moved "${args.taskTitle}" to ${args.stage}` : `No task matched "${args.taskTitle}"`,
          };
        }
        case 'draft_email': {
          onDraftEmail(args.to || '', args.subject || '', args.body || '');
          return { name, args, status: 'applied', resultSummary: `Drafted email "${args.subject}"` };
        }
        case 'flag_alert': {
          const newAlert: JarvisAlert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            severity: args.severity || 'Info',
            title: args.title,
            detail: args.detail || '',
            createdAt: new Date().toISOString(),
            dismissed: false,
          };
          onSaveAlerts([newAlert, ...alerts]);
          return { name, args, status: 'applied', resultSummary: `Raised alert "${args.title}"` };
        }
        default:
          return { name, args, status: 'failed', resultSummary: 'Unknown action' };
      }
    } catch (err) {
      console.error('JARVIS action execution error:', err);
      return { name, args, status: 'failed', resultSummary: 'Execution error' };
    }
  };

  const sendMessage = async (rawText?: string) => {
    const text = (rawText ?? chatInput).trim();
    if (!text || isThinking) return;

    const userEntry: JarvisMemoryEntry = {
      id: `jm_${Date.now()}_u`,
      role: 'user',
      text,
      createdAt: new Date().toISOString(),
    };
    const historyForApi = memory.map((m) => ({ role: m.role, text: m.text }));
    const nextMemory = [...memory, userEntry];
    onSaveMemory(nextMemory);
    setChatInput('');
    setIsThinking(true);

    try {
      const res = await fetch('/api/jarvis/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyForApi,
          workspaceInfo,
          trainingDoc: workspaceInfo.aiTrainingDoc,
          currentUser,
        }),
      });
      const data = await res.json();

      const executedActions: JarvisAction[] = (data.actions || []).map((a: any) => applyAction(a.name, a.args));
      const replyText = data.text || (executedActions.length ? 'Done.' : "I didn't quite catch an actionable request there.");

      const modelEntry: JarvisMemoryEntry = {
        id: `jm_${Date.now()}_m`,
        role: 'model',
        text: replyText,
        createdAt: new Date().toISOString(),
        actions: executedActions,
      };
      onSaveMemory([...nextMemory, modelEntry]);
      speak(replyText);
    } catch (err) {
      console.error('JARVIS chat error:', err);
      onSaveMemory([
        ...nextMemory,
        {
          id: `jm_${Date.now()}_err`,
          role: 'model',
          text: 'My apologies - I lost the connection to my reasoning core mid-thought. Please try again.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const refreshInbox = async () => {
    if (!accessToken) return;
    setIsInboxLoading(true);
    try {
      const messages = await listRecentEmails(accessToken, 8);
      setInboxMessages(messages);
    } finally {
      setIsInboxLoading(false);
    }
  };

  const scanEmail = async (key: string, from: string, subject: string, body: string) => {
    setScanningId(key);
    try {
      const res = await fetch('/api/jarvis/email-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, subject, body }),
      });
      const data = await res.json();
      setScanResults((prev) => ({ ...prev, [key]: data }));
    } catch (err) {
      console.error('Email scan error:', err);
    } finally {
      setScanningId(null);
    }
  };

  const runBriefing = async (silent: boolean = false) => {
    if (!silent) setIsBriefingLoading(true);
    try {
      const res = await fetch('/api/jarvis/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceInfo, trainingDoc: workspaceInfo.aiTrainingDoc }),
      });
      const data = await res.json();
      const incoming: JarvisAlert[] = (data.alerts || []).map((a: any) => ({
        id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        severity: a.severity || 'Info',
        title: a.title,
        detail: a.detail || '',
        createdAt: new Date().toISOString(),
        dismissed: false,
      }));
      if (incoming.length > 0) {
        const existingTitles = new Set(activeAlerts.map((a) => a.title.toLowerCase()));
        const fresh = incoming.filter((a) => !existingTitles.has(a.title.toLowerCase()));
        if (fresh.length > 0) {
          onSaveAlerts([...fresh, ...alerts]);
        }
      }
    } catch (err) {
      console.error('Briefing error:', err);
    } finally {
      if (!silent) setIsBriefingLoading(false);
    }
  };

  const dismissAlert = (id: string) => {
    onSaveAlerts(alerts.map((a) => (a.id === id ? { ...a, dismissed: true } : a)));
  };

  const severityColor = (severity: string) => {
    if (severity === 'Critical') return isDark ? 'text-red-400 border-red-500/30 bg-red-500/10' : 'text-red-600 border-red-200 bg-red-50';
    if (severity === 'Warning') return isDark ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' : 'text-amber-600 border-amber-200 bg-amber-50';
    return isDark ? 'text-sky-400 border-sky-500/30 bg-sky-500/10' : 'text-sky-600 border-sky-200 bg-sky-50';
  };

  return (
    <>
      {/* Floating trigger orb */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-5 right-5 z-[70] w-14 h-14 rounded-full flex items-center justify-center cursor-pointer shadow-2xl transition-transform hover:scale-105 active:scale-95"
        style={{
          background: 'radial-gradient(circle at 35% 30%, #38bdf8, #0ea5e9 45%, #0369a1 100%)',
          boxShadow: '0 0 0 1px rgba(56,189,248,0.4), 0 8px 24px rgba(14,165,233,0.45)',
        }}
        title="J.A.R.V.I.S."
      >
        <span className="absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-20 animate-ping" />
        <Bot className="w-6 h-6 text-white relative z-10" />
        {activeAlerts.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900 z-20">
            {activeAlerts.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={`fixed bottom-24 right-5 z-[70] w-[92vw] max-w-sm h-[70vh] max-h-[640px] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
            isDark ? 'bg-[#0b1220] border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          {/* Header */}
          <div className={`p-3.5 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-sky-500/5' : 'border-slate-100 bg-sky-50/60'}`}>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bot className="w-5 h-5 text-sky-500" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-slate-900" />
              </div>
              <div>
                <h3 className="text-xs font-bold tracking-wide">J.A.R.V.I.S.</h3>
                <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">Personal Agent Online</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setVoiceEnabled((v) => !v)}
                className={`p-1.5 rounded-lg cursor-pointer transition-colors ${voiceEnabled ? 'text-sky-500 bg-sky-500/10' : 'text-slate-400 hover:text-slate-600'}`}
                title={voiceEnabled ? 'Voice replies on' : 'Voice replies off'}
              >
                {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-500/10 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className={`flex border-b text-[10px] font-bold uppercase tracking-wider ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            {([
              { id: 'chat', label: 'Chat', icon: MessageSquare },
              { id: 'inbox', label: 'Inbox', icon: InboxIcon },
              { id: 'alerts', label: `Alerts${activeAlerts.length ? ` (${activeAlerts.length})` : ''}`, icon: Bell },
            ] as { id: JarvisTab; label: string; icon: any }[]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  activeTab === tab.id
                    ? isDark ? 'text-sky-400 border-b-2 border-sky-500 bg-slate-900/40' : 'text-sky-600 border-b-2 border-sky-500 bg-sky-50/40'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <tab.icon className="w-3 h-3" /> {tab.label}
              </button>
            ))}
          </div>

          {/* CHAT TAB */}
          {activeTab === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                {memory.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-2 px-4">
                    <Bot className="w-10 h-10 text-slate-300" />
                    <p className="text-xs font-bold">At your service, {currentUser.name.split(' ')[0]}.</p>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Ask me to create tasks, move things along the board, draft an email, or just talk through your day. Try the mic for hands-free.
                    </p>
                  </div>
                )}
                {memory.map((entry) => (
                  <div key={entry.id} className={`max-w-[92%] ${entry.role === 'user' ? 'ml-auto' : ''}`}>
                    <div
                      className={`p-3 rounded-2xl border text-xs leading-relaxed ${
                        entry.role === 'user'
                          ? isDark ? 'bg-sky-500/10 border-sky-500/20' : 'bg-sky-50 border-sky-100'
                          : isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-150'
                      }`}
                    >
                      <div className="markdown-body space-y-1">
                        <ReactMarkdown>{entry.text}</ReactMarkdown>
                      </div>
                      {entry.actions && entry.actions.length > 0 && (
                        <div className="mt-2 space-y-1 border-t pt-2 border-black/5 dark:border-white/5">
                          {entry.actions.map((action, idx) => (
                            <div
                              key={idx}
                              className={`flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded-lg ${
                                action.status === 'applied'
                                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                                  : 'text-red-500 bg-red-500/10'
                              }`}
                            >
                              <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                              {describeAction(action)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isThinking && (
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-500" /> thinking...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className={`p-2.5 border-t flex gap-1.5 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}
              >
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-2 rounded-xl cursor-pointer transition-colors flex-shrink-0 ${
                    isListening ? 'bg-red-500 text-white animate-pulse' : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'
                  }`}
                  title="Voice input"
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Command JARVIS..."
                  className={`flex-1 px-3 py-2 text-xs rounded-xl border focus:outline-none min-w-0 ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                />
                <button
                  type="submit"
                  disabled={isThinking}
                  className="p-2 rounded-xl bg-sky-500 text-white hover:bg-sky-600 cursor-pointer flex-shrink-0 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </>
          )}

          {/* INBOX TAB */}
          {activeTab === 'inbox' && (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
              {accessToken ? (
                <>
                  <button
                    onClick={refreshInbox}
                    disabled={isInboxLoading}
                    className={`w-full text-[10px] font-bold uppercase tracking-wider py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer ${
                      isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <RefreshCw className={`w-3 h-3 ${isInboxLoading ? 'animate-spin' : ''}`} /> Refresh Inbox
                  </button>
                  {inboxMessages.length === 0 && !isInboxLoading && (
                    <p className="text-[10px] text-slate-400 text-center py-6">No recent inbox messages found.</p>
                  )}
                  {inboxMessages.map((msg) => {
                    const scan = scanResults[msg.id];
                    return (
                      <div key={msg.id} className={`p-3 rounded-xl border text-xs ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-150'}`}>
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <span className="font-bold truncate">{msg.subject}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mb-2">{msg.from}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">{msg.snippet}</p>
                        {!scan ? (
                          <button
                            onClick={() => scanEmail(msg.id, msg.from, msg.subject, msg.body)}
                            disabled={scanningId === msg.id}
                            className="text-[10px] font-bold uppercase tracking-wider text-sky-500 flex items-center gap-1 cursor-pointer"
                          >
                            {scanningId === msg.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            Scan for tasks
                          </button>
                        ) : (
                          <div className="space-y-1.5 mt-2 border-t pt-2 border-black/5 dark:border-white/5">
                            <p className="text-[10px] italic text-slate-400">{scan.summary}</p>
                            {scan.actionItems.map((item, idx) => (
                              <button
                                key={idx}
                                onClick={() =>
                                  onAddTask({
                                    title: item.title,
                                    description: `From email: "${msg.subject}" (${msg.from})`,
                                    priority: item.priority,
                                    stage: 'To-Do',
                                    assigneeId: 'Personal',
                                  })
                                }
                                className={`w-full flex items-center justify-between gap-2 p-2 rounded-lg text-[10px] cursor-pointer ${
                                  isDark ? 'bg-slate-900 hover:bg-slate-700' : 'bg-white hover:bg-slate-100 border border-slate-150'
                                }`}
                              >
                                <span className="truncate text-left">{item.title}</span>
                                <span className="flex items-center gap-1 text-emerald-500 font-bold flex-shrink-0"><PlusCircle className="w-3 h-3" /> Add</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              ) : (
                <p className={`text-[10px] p-3 rounded-xl border leading-relaxed ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-150 text-slate-500'}`}>
                  Connect your Google account (top-right "Connect Drive") to let JARVIS monitor your live inbox. In the meantime, paste an email below to scan it manually.
                </p>
              )}

              <div className={`p-3 rounded-xl border space-y-2 ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-150'}`}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3" /> Manual Scan</p>
                <input
                  placeholder="From"
                  value={manualEmail.from}
                  onChange={(e) => setManualEmail((p) => ({ ...p, from: e.target.value }))}
                  className={`w-full p-2 text-[11px] rounded-lg border focus:outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                />
                <input
                  placeholder="Subject"
                  value={manualEmail.subject}
                  onChange={(e) => setManualEmail((p) => ({ ...p, subject: e.target.value }))}
                  className={`w-full p-2 text-[11px] rounded-lg border focus:outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                />
                <textarea
                  placeholder="Paste email body..."
                  rows={3}
                  value={manualEmail.body}
                  onChange={(e) => setManualEmail((p) => ({ ...p, body: e.target.value }))}
                  className={`w-full p-2 text-[11px] rounded-lg border focus:outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                />
                <button
                  onClick={() => {
                    if (!manualEmail.body.trim()) return;
                    const key = `manual_${Date.now()}`;
                    scanEmail(key, manualEmail.from, manualEmail.subject, manualEmail.body);
                    setInboxMessages((prev) => [
                      { id: key, from: manualEmail.from, subject: manualEmail.subject || '(No subject)', snippet: manualEmail.body.slice(0, 80), body: manualEmail.body, receivedAt: '' },
                      ...prev,
                    ]);
                    setManualEmail({ from: '', subject: '', body: '' });
                  }}
                  className="w-full py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-[10px] font-bold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3" /> Scan Pasted Email
                </button>
              </div>
            </div>
          )}

          {/* ALERTS TAB */}
          {activeTab === 'alerts' && (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
              <button
                onClick={() => runBriefing(false)}
                disabled={isBriefingLoading}
                className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-[10px] font-bold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isBriefingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                Run Diagnostic Briefing
              </button>

              {activeAlerts.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-[11px]">All systems nominal. No active alerts.</p>
                </div>
              ) : (
                activeAlerts.map((alert) => (
                  <div key={alert.id} className={`p-3 rounded-xl border ${severityColor(alert.severity)}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider">
                        <AlertTriangle className="w-3 h-3" /> {alert.severity}
                      </div>
                      <button onClick={() => dismissAlert(alert.id)} className="cursor-pointer opacity-60 hover:opacity-100" title="Dismiss">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs font-bold mt-1.5">{alert.title}</p>
                    <p className="text-[10px] mt-0.5 opacity-80 leading-relaxed">{alert.detail}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

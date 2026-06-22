import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, UserProfile, WorkspaceData } from '../types';
import { Send, Bot, Shield, HelpCircle, Flame, MessageSquare, Plus, AlignLeft, Sparkles, Terminal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatAndAIProps {
  messages: ChatMessage[];
  profiles: UserProfile[];
  currentUser: UserProfile;
  aiTrainingDoc: string;
  workspaceInfo: WorkspaceData;
  onSendMessage: (text: string) => void;
  onUpdateAiTraining: (doc: string) => void;
  theme: 'Whitish Modern' | 'Black Modern';
}

interface AIMessage {
  role: 'user' | 'model';
  text: string;
}

export default function ChatAndAI({
  messages,
  profiles,
  currentUser,
  aiTrainingDoc,
  workspaceInfo,
  onSendMessage,
  onUpdateAiTraining,
  theme,
}: ChatAndAIProps) {
  const [activeChannel, setActiveChannel] = useState<'#general' | '#ops-room' | '#fun-hub'>('#general');
  const [chatInput, setChatInput] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [aiHistory, setAiHistory] = useState<AIMessage[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<string | null>(null);
  const [trainingInput, setTrainingInput] = useState(aiTrainingDoc);
  const [showTrainingPanel, setShowTrainingPanel] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'Black Modern';

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannel]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim());
    setChatInput('');
  };

  // Call express server-side Gemini chat API
  const handleAiQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const userMsg: AIMessage = { role: 'user', text: aiInput.trim() };
    const queryStr = aiInput.trim();
    setAiHistory((prev) => [...prev, userMsg]);
    setAiInput('');
    setIsAiLoading(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: queryStr,
          history: aiHistory,
          workspaceInfo: workspaceInfo,
          trainingDoc: aiTrainingDoc,
        }),
      });

      if (!res.ok) {
        throw new Error('API server returned error');
      }

      const data = await res.json();
      setAiHistory((prev) => [...prev, { role: 'model', text: data.text }]);
    } catch (err) {
      console.error('AI chat querying error:', err);
      setAiHistory((prev) => [
        ...prev,
        {
          role: 'model',
          text: '*(Central AI Error: Could not connect to API query proxy. Ensure GEMINI_API_KEY is connected or server dev setup is compiling smoothly.)*',
        },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Ask AI to run diagnostic alignment audit of workspace chat logs
  const handleDiagnosticAudit = async () => {
    setIsAuditLoading(true);
    setAuditResult(null);
    try {
      const auditPrompt = `Perform a professional critical compliance audit of our active chat communication logs to verify alignment with CEO/Founder guidelines. Identify any potential misalignment, misinformation, or communication friction.
Recent active message history:
${JSON.stringify(messages.slice(-15))}

Provide a brief, beautifully structured executive analysis with bulleted risk scores and alignment flags.`;

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: auditPrompt,
          history: [],
          workspaceInfo: workspaceInfo,
          trainingDoc: aiTrainingDoc,
        }),
      });

      const data = await res.json();
      setAuditResult(data.text);
    } catch (err) {
      console.error(err);
      setAuditResult('Compliance audit failed. Please make sure that standard Gemini client APIs are initialized.');
    } finally {
      setIsAuditLoading(false);
    }
  };

  const handleSaveTraining = () => {
    onUpdateAiTraining(trainingInput);
    setShowTrainingPanel(false);
    alert('Founder Alignment Guidelines successfully locked into the Central AI Core!');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Founder / Director':
        return 'text-red-500 font-bold';
      case 'Manager':
        return 'text-amber-500 font-bold';
      default:
        return 'text-sky-500';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
      {/* LEFT: Team Channels and Chat Feed (Cols 7) */}
      <div 
        className={`lg:col-span-7 flex flex-col rounded-2xl border ${
          isDark ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200/85 shadow-xs'
        }`}
      >
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/10">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-850 dark:text-white">{activeChannel}</h3>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Internal channels</p>
            </div>
          </div>

          <div className="flex gap-1.5">
            {(['#general', '#ops-room', '#fun-hub'] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => setActiveChannel(ch)}
                className={`text-[10px] font-mono px-3 py-1 rounded-xl transition-all cursor-pointer ${
                  activeChannel === ch
                    ? isDark ? 'bg-white text-black font-bold' : 'bg-blue-600 text-white font-bold'
                    : isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>

        {/* Message Log */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[50vh] lg:max-h-[60vh] bg-slate-50/20 dark:bg-slate-900/5">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`p-3.5 rounded-2xl border max-w-[85%] transition-all ${
                msg.senderEmail === currentUser.email
                  ? 'ml-auto border-blue-105 bg-blue-50/40 text-right text-slate-900 dark:bg-blue-900/20 dark:text-white dark:border-blue-900/30'
                  : isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-150'
              }`}
            >
              <div className={`flex items-center gap-2 text-[9px] font-mono mb-1.5 uppercase tracking-wider ${
                msg.senderEmail === currentUser.email ? 'justify-end' : 'justify-start'
              }`}>
                <span className={getRoleColor(msg.senderRole)}>{msg.senderName}</span>
                <span className="opacity-40">•</span>
                <span className="opacity-60">{msg.senderRole}</span>
                <span className="opacity-40">•</span>
                <span className="opacity-60">{msg.createdAt.split('T')[1]?.substring(0, 5) || '12:00'}</span>
              </div>
              <p className={`text-xs whitespace-pre-wrap leading-relaxed ${
                isDark ? 'text-slate-200' : 'text-slate-700'
              } ${msg.senderEmail === currentUser.email ? 'text-right' : 'text-left'}`}>
                {msg.text}
              </p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input form */}
        <form onSubmit={handleSendChat} className="p-3 border-t border-slate-100 dark:border-slate-800/80 flex gap-2">
          <input
            type="text"
            placeholder={`Publish a comment to ${activeChannel}...`}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className={`flex-1 px-4 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 ${
              isDark 
                ? 'bg-slate-800 border-slate-700 text-white focus:border-slate-600' 
                : 'bg-white border-slate-200 text-slate-800 focus:border-slate-350 shadow-xs'
            }`}
          />
          <button
            type="submit"
            className={`p-2.5 rounded-xl transition-all hover:scale-105 cursor-pointer flex items-center justify-center ${
              isDark ? 'bg-white text-black hover:bg-slate-100' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* RIGHT: Central AI Monitor Core (Cols 5) */}
      <div 
        className={`lg:col-span-5 flex flex-col rounded-2xl border overflow-hidden ${
          isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        {/* Core Header */}
        <div className="p-4 bg-purple-500/5 border-b border-purple-100/50 dark:border-purple-900/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400 animate-pulse" />
            <div>
              <h3 className="text-sm font-bold flex items-center gap-1.5 text-purple-950 dark:text-white">
                Central AI Monitor 
                <span className="text-[9px] font-mono font-bold bg-sky-500/10 text-sky-500 border border-sky-500/20 px-1 py-0.2 rounded">
                  ONLINE
                </span>
              </h3>
              <p className="text-[10px] text-neutral-400 font-mono">Trained on Custom CEO Guidelines</p>
            </div>
          </div>

          <div className="flex gap-1">
            {currentUser.role === 'Founder / Director' && (
              <button
                onClick={() => setShowTrainingPanel((prev) => !prev)}
                className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 cursor-pointer hover:bg-neutral-800 hover:text-white transition-all ${
                  isDark ? 'border-neutral-800 text-neutral-400' : 'border-neutral-300 text-neutral-600 bg-neutral-100'
                }`}
                title="Train guidelines"
              >
                <Shield className="w-3 h-3 text-red-500" />
                <span className="text-[10px] font-sans font-medium">Train AI</span>
              </button>
            )}
            <button
              onClick={handleDiagnosticAudit}
              disabled={isAuditLoading}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 cursor-pointer transition-all ${
                isDark 
                  ? 'bg-neutral-900 border-neutral-800 text-emerald-400 hover:bg-neutral-800' 
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <Sparkles className="w-3 h-3 text-emerald-500" />
              <span className="text-[10px] font-sans font-medium">{isAuditLoading ? 'Auditing...' : 'Audit Chat'}</span>
            </button>
          </div>
        </div>

        {/* Training guidelines modifier drawer */}
        {showTrainingPanel && (
          <div className={`p-4 border-b border-neutral-200/60 dark:border-neutral-800/80 space-y-3 ${
            isDark ? 'bg-[#181818]' : 'bg-amber-50/50'
          }`}>
            <h4 className="text-xs font-bold text-red-500 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" /> Configure Corporate Core Rules
            </h4>
            <p className="text-[10px] text-neutral-400 leading-relaxed">
              Inject custom principles (e.g., core values, work ethics, alignment constraints). The Central AI will enforce this alignment strictly.
            </p>
            <textarea
              rows={3}
              value={trainingInput}
              onChange={(e) => setTrainingInput(e.target.value)}
              className={`w-full p-2 text-xs rounded-xl border focus:outline-none ${
                isDark ? 'bg-[#222] border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
              }`}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowTrainingPanel(false)}
                className="text-[10px] font-bold text-neutral-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTraining}
                className="text-[10px] font-bold text-sky-500 uppercase tracking-widest bg-sky-500/10 px-2.5 py-1 rounded-lg"
              >
                Deploy Guidelines
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Audit Result Panel or Chat History container */}
        <div className="flex-grow p-4 overflow-y-auto space-y-4 max-h-[45vh] lg:max-h-[50vh]">
          {auditResult && (
            <div className={`p-4 rounded-xl border ${
              isDark ? 'bg-[#1c241e] border-emerald-950 text-emerald-300' : 'bg-emerald-50/50 border-emerald-100 text-emerald-950'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold flex items-center gap-1 text-emerald-400"><Shield className="w-3.5 h-3.5" />AI Compliance Audit Report</span>
                <button 
                  onClick={() => setAuditResult(null)}
                  className="text-[10px] opacity-60 hover:opacity-100 cursor-pointer"
                >
                  Clear Report
                </button>
              </div>
              <div className="markdown-body text-xs leading-relaxed space-y-1 bg-transparent border-0 select-text">
                <ReactMarkdown>{auditResult}</ReactMarkdown>
              </div>
            </div>
          )}

          {aiHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-2">
              <Bot className="w-12 h-12 text-slate-300 mb-2" />
              <p className="text-xs font-bold">Ask me anything about team operations</p>
              <p className="text-[10px] text-neutral-400 max-w-[250px] leading-relaxed">
                As the organization's central monitor, I evaluate real-time tasks, check deadlines, and write automated structures. Keep me trained to align results!
              </p>
            </div>
          ) : (
            aiHistory.map((item, idx) => (
              <div 
                key={idx}
                className={`p-3.5 rounded-2xl border max-w-[90%] transition-all ${
                  item.role === 'user'
                    ? 'ml-auto bg-[#e0f2fe]/40 border-sky-300/10'
                    : isDark 
                      ? 'bg-neutral-900 border-neutral-800 text-neutral-100' 
                      : 'bg-slate-50 border-neutral-200 text-neutral-900'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[10px] font-mono opacity-50 mb-1">
                  {item.role === 'user' ? 'Founder / User Query' : 'Central AI Core'}
                </div>
                <div className="markdown-body text-xs space-y-1 select-text">
                  <ReactMarkdown>{item.text}</ReactMarkdown>
                </div>
              </div>
            ))
          )}
          {isAiLoading && (
            <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 p-2">
              <Bot className="w-4 h-4 text-sky-500 animate-spin" />
              <span>Analyzing tasks, auditing logs, drafting response...</span>
            </div>
          )}
        </div>

        {/* AI Input Form */}
        <form onSubmit={handleAiQuery} className="p-3 bg-sky-500/5 border-t border-neutral-200/60 dark:border-neutral-800/80 flex gap-2">
          <input
            type="text"
            placeholder="Command Central AI Monitor..."
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            className={`flex-1 px-4 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 ${
              isDark 
                ? 'bg-[#161616] border-neutral-800 text-white focus:border-neutral-700' 
                : 'bg-white border-neutral-200 text-neutral-900 focus:border-neutral-300'
            }`}
          />
          <button
            type="submit"
            disabled={isAiLoading}
            className={`p-2 rounded-xl transition-all hover:scale-105 cursor-pointer ${
              isDark ? 'bg-white text-black hover:bg-neutral-200' : 'bg-neutral-900 text-white hover:bg-neutral-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

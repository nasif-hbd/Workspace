import React, { useState, useEffect } from 'react';
import { Mail, Send, FileText, CheckCircle, AlertOctagon, RefreshCw, Layers, Users } from 'lucide-react';
import { sendGmailEmail, getGoogleContacts } from '../googleApi';

interface MailComposerProps {
  accessToken: string | null;
  theme: 'Whitish Modern' | 'Black Modern';
  profiles: { id: string; name: string; email: string; role: string }[];
}

interface SentRecord {
  to: string;
  subject: string;
  body: string;
  type: 'Gmail Core API' | 'SMTP Local Service';
  sentAt: string;
}

export default function MailComposer({
  accessToken,
  theme,
  profiles,
}: MailComposerProps) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentRecords, setSentRecords] = useState<SentRecord[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [googleContacts, setGoogleContacts] = useState<{ name: string; email: string }[]>([]);
  const [isSyncingContacts, setIsSyncingContacts] = useState(false);

  const isDark = theme === 'Black Modern';

  useEffect(() => {
    if (accessToken) {
      setIsSyncingContacts(true);
      getGoogleContacts(accessToken)
        .then((contactsList) => {
          setGoogleContacts(contactsList);
        })
        .finally(() => {
          setIsSyncingContacts(false);
        });
    } else {
      setGoogleContacts([]);
    }
  }, [accessToken]);

  const templates = [
    {
      title: '🔴 Critical SLA Alert',
      subject: 'URGENT: High-Priority Task Backlog Escalation',
      body: 'Dear Team,\n\nWe have noticed several high-priority SLA tasks sitting in To-Do stage today. Please evaluate the Capacity charts to delegate these items effectively.\n\nBest regards,\nOperations Desk'
    },
    {
      title: '📊 Weekly Performance Report',
      subject: 'Organization Alignment & Performance Statistics Summary',
      body: 'Hello Founders,\n\nPlease log in to view the Workspace Dashboard. Completion rates and active bento analytics show high velocity. Central compliance diagnostics are currently stable.\n\nSincerest regards,\nCentral AI Assistant'
    },
    {
      title: '🚀 Workspace Invite',
      subject: 'Join our Organization Group on Workspace Workspace',
      body: 'Hello Partner,\n\nYou have been invited to collaborate with our team. Please download our Workspace OS file, log in with Google, and enter our Team Merge key to access the directory.\n\nWarm regards,\nHR Desk'
    }
  ];

  const applyTemplate = (tpl: typeof templates[0]) => {
    setSubject(tpl.subject);
    setBody(tpl.body);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim() || !subject.trim() || !body.trim()) return;

    setIsSending(true);
    setStatusMessage(null);

    const hasRealToken = !!accessToken;
    let success = false;

    // Direct Google Workspace guidelines enforcement - must prompt confirmation
    const verified = window.confirm(
      `Confirm Dispatch: Send this message to ${to}? This action is immutable.`
    );
    if (!verified) {
      setIsSending(false);
      return;
    }

    try {
      if (hasRealToken) {
        // Execute real Google API Workspace delivery!
        success = await sendGmailEmail(accessToken, to.trim(), subject.trim(), body.trim());
      } else {
        // High fidelity mock SMTP delivery flow
        await new Promise((resolve) => setTimeout(resolve, 1500));
        success = true;
      }

      if (success) {
        setStatusMessage({
          text: hasRealToken 
            ? `Gmail successfully dispatched to <${to}> using direct OAuth keys!` 
            : `Notification successfully routed through SMTP local relay network to <${to}>!`,
          error: false,
        });

        const newRecord: SentRecord = {
          to: to.trim(),
          subject: subject.trim(),
          body: body.trim(),
          type: hasRealToken ? 'Gmail Core API' : 'SMTP Local Service',
          sentAt: new Date().toLocaleTimeString(),
        };

        setSentRecords((prev) => [newRecord, ...prev]);
        setTo('');
        setSubject('');
        setBody('');
      } else {
        throw new Error('Delivery node rejected message envelope.');
      }
    } catch (error: any) {
      console.error(error);
      setStatusMessage({
        text: `Operation Failed: ${error.message || 'Error executing Gmail API transmission details.'}`,
        error: true,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT: Composition Desk (Cols 7) */}
      <div 
        className={`lg:col-span-7 p-6 rounded-2xl border ${
          isDark ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200/85 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-2 mb-4 border-b pb-3 border-slate-100 dark:border-slate-800/80">
          <Mail className="w-5 h-5 text-amber-500" />
          <div>
            <h3 className="text-sm font-bold text-slate-850 dark:text-white">Compose Mail Transmission</h3>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
              {accessToken ? 'Authenticated Google Client Portal' : 'SMTP Local Simulation Portal'}
            </p>
          </div>
        </div>

        {statusMessage && (
          <div className={`p-4 rounded-xl border text-xs mb-4 flex items-center gap-2 ${
            statusMessage.error 
              ? 'bg-red-500/10 border-red-500/20 text-red-500' 
              : 'bg-emerald-50 text-emerald-700 border-emerald-150'
          }`}>
            {statusMessage.error ? <AlertOctagon className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-emerald-500" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSendEmail} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1 opacity-70">To (Receiver Address)</label>
            <input
              type="email"
              required
              placeholder="recipient@company.org, director@workspace.com..."
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={`w-full p-2.5 text-xs rounded-xl border focus:outline-none ${
                isDark ? 'bg-[#161616] border-neutral-800 text-white focus:border-neutral-700' : 'bg-white border-neutral-200 text-neutral-900 focus:border-neutral-300'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 opacity-70">Subject Header</label>
            <input
              type="text"
              required
              placeholder="e.g., SLA Alert escalations"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={`w-full p-2.5 text-xs rounded-xl border focus:outline-none ${
                isDark ? 'bg-[#161616] border-neutral-800 text-white focus:border-neutral-700' : 'bg-white border-neutral-200 text-neutral-900 focus:border-neutral-300'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 opacity-70">Message Body</label>
            <textarea
              required
              rows={6}
              placeholder="Write the content of your professional letter here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className={`w-full p-2.5 text-xs rounded-xl border focus:outline-none leading-relaxed ${
                isDark ? 'bg-[#161616] border-neutral-800 text-white focus:border-neutral-700' : 'bg-white border-neutral-200 text-neutral-900 focus:border-neutral-300'
              }`}
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSending}
              className={`px-5 py-2.5 text-xs rounded-xl font-semibold flex items-center gap-2 hover:scale-105 transition-all cursor-pointer ${
                isSending 
                ? 'opacity-40 cursor-not-allowed'
                : isDark 
                  ? 'bg-white text-black hover:bg-neutral-100' 
                  : 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-md'
              }`}
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Routing Packet...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Dispatch Email
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* RIGHT: Quick Templates, Contacts Directory, and Mail Log (Cols 5) */}
      <div className="lg:col-span-5 space-y-6">
        {/* Workspace & Google Contacts Directory */}
        <div 
          className={`p-5 rounded-2xl border ${
            isDark ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200/85 shadow-xs'
          }`}
        >
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 text-slate-450 dark:text-slate-400 font-mono">
              <Users className="w-3.5 h-3.5 text-amber-500" />
              Contacts Directory
            </h4>
            {accessToken && isSyncingContacts && (
              <RefreshCw className="w-3 h-3 text-amber-500 animate-spin" />
            )}
          </div>

          <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1 text-left">
            {/* Core Workspace Profiles */}
            <div>
              <div className="text-[10px] text-slate-405 font-mono uppercase tracking-widest mb-2 font-bold">
                Workspace Team ({profiles.length})
              </div>
              <div className="space-y-1.5">
                {profiles.map((prof) => (
                  <button
                    key={prof.id}
                    type="button"
                    onClick={() => setTo(prof.email)}
                    className={`w-full text-left p-2 rounded-xl border transition-all text-xs flex justify-between items-center cursor-pointer ${
                      to === prof.email
                        ? isDark ? 'bg-amber-500/10 border-amber-500/35' : 'bg-amber-50 border-amber-200 shadow-2xs'
                        : isDark ? 'bg-slate-800 border-slate-700/70 hover:bg-slate-700/50' : 'bg-slate-50/50 border-slate-150 hover:bg-slate-100/50'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                        {prof.name}
                        {prof.role && (
                          <span className="text-[8px] opacity-60 font-normal px-1 py-0.5 rounded-sm bg-slate-200/40 dark:bg-slate-705">
                            {prof.role}
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] font-mono text-slate-400">{prof.email}</div>
                    </div>
                    <span className="text-[8px] font-mono font-bold text-amber-600 uppercase">Select</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Google Contacts list */}
            <div>
              <div className="text-[10px] text-slate-405 font-mono uppercase tracking-widest mb-2 font-bold flex justify-between items-center">
                <span>Google Connections</span>
                {accessToken ? (
                  <span className="text-[8px] bg-emerald-500/10 font-sans tracking-normal font-bold text-emerald-500 px-1 rounded">Linked</span>
                ) : (
                  <span className="text-[8px] bg-amber-500/10 font-sans tracking-normal font-bold text-amber-500 px-1 rounded">Simulated</span>
                )}
              </div>

              {!accessToken ? (
                <div className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800 font-sans leading-relaxed">
                  Connect your Google account in the dashboard header to synchronize your real-time Google Contacts list.
                </div>
              ) : isSyncingContacts ? (
                <div className="text-[10px] text-center text-slate-400 p-4">
                  Synchronizing Google Connections...
                </div>
              ) : googleContacts.length === 0 ? (
                <div className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800 font-sans leading-relaxed">
                  No connection connections found in Google Contacts.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {googleContacts.map((contact, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setTo(contact.email)}
                      className={`w-full text-left p-2 rounded-xl border transition-all text-xs flex justify-between items-center cursor-pointer ${
                        to === contact.email
                          ? isDark ? 'bg-amber-500/10 border-amber-500/35' : 'bg-amber-50 border-amber-200 shadow-2xs'
                          : isDark ? 'bg-slate-800 border-slate-700/70 hover:bg-slate-700/50' : 'bg-slate-50/50 border-slate-150 hover:bg-slate-100/50'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-slate-700 dark:text-slate-200">{contact.name}</div>
                        <div className="text-[9px] font-mono text-slate-400">{contact.email}</div>
                      </div>
                      <span className="text-[8px] font-mono font-bold text-amber-600 uppercase">Select</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Templates Panel */}
        <div 
          className={`p-5 rounded-2xl border ${
            isDark ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200/85 shadow-xs'
          }`}
        >
          <h4 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5 text-slate-400 font-mono"><FileText className="w-3.5 h-3.5 text-amber-500" />Quick Templates</h4>

          <div className="space-y-2">
            {templates.map((tpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyTemplate(tpl)}
                className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex justify-between items-center cursor-pointer ${
                  isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-705' : 'bg-slate-50/50 border-slate-150 hover:bg-slate-100/50'
                }`}
              >
                <span className="font-semibold text-slate-700 dark:text-slate-200">{tpl.title}</span>
                <span className="text-[9px] font-mono text-amber-600 uppercase tracking-widest font-extrabold">Apply</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dispatched logs archive */}
        <div 
          className={`p-5 rounded-2xl border flex flex-col h-[230px] overflow-hidden ${
            isDark ? 'bg-[#1e293b] border-slate-800' : 'bg-slate-100/30 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-1.5 mb-3 border-b pb-2 border-slate-100 dark:border-slate-800/80">
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-450 font-mono">Sent Mail Log</h4>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 font-mono text-[9px]">
            {sentRecords.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <span>No emails sent from this workspace session.</span>
              </div>
            ) : (
              sentRecords.map((rec, idx) => (
                <div 
                  key={idx} 
                  className={`p-2.5 rounded-xl border ${
                    isDark ? 'bg-[#1a1a1a] border-slate-800 text-slate-300' : 'bg-white border-slate-150 text-slate-700'
                  }`}
                >
                  <div className="flex justify-between text-[8px] opacity-65 mb-1">
                    <span>{rec.sentAt}</span>
                    <span className="font-extrabold text-amber-600">{rec.type}</span>
                  </div>
                  <div className="font-bold">To: {rec.to}</div>
                  <div className="text-[10px] italic">Sub: {rec.subject}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK lazily to avoid crashes if API key is missing.
let aiClient: any = null;
function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('Warning: GEMINI_API_KEY is not defined. AI components will run in high-fidelity mock mode.');
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// ----------------------------------------------------
// API ENDPOINTS
// ----------------------------------------------------

// Endpoint for Central AI analysis and guidance chat
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { message, history, workspaceInfo, trainingDoc } = req.body;

    const ai = getAiClient();

    // Context message preparing the system instruction
    const systemPrompt = `You are the Central AI Monitor, a powerful AI assistant embedded into the "Organization Workspace" management system.
Your character is highly professional, strategic, slightly analytical, and perfectly aligned with the founder/CEO's specific training guidelines.

CEO/Founder's Guidance Training Docs:
"""
${trainingDoc || 'No specific company instructions supplied yet. Maintain standard professional alignment.'}
"""

Active Workspace Organization Name: ${workspaceInfo?.organization?.orgName || 'N/A'}
Active Capacity Limit: ${workspaceInfo?.organization?.teamCapacity || 'N/A'}

Active Tasks in the System:
${JSON.stringify(workspaceInfo?.tasks || [])}

Active Profiles in the System:
${JSON.stringify(workspaceInfo?.profiles || [])}

Use this context to monitor the organization, prioritize tasks, help with operations, draft emails, or analyze team chat alignment.
Provide clear, actionable, professional suggestions. Keep responses beautifully structured in markdown format. Do not use verbose, empty sentences. Be direct and helpful.`;

    // Map history to Google GenAI schema format { role: 'user' | 'model', parts: [{ text: '...' }] }
    const contents = history.map((h: any) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }],
    }));

    // Append the latest user query
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: contents,
          config: {
            systemInstruction: systemPrompt,
          },
        });

        return res.json({ text: response.text });
      } catch (gemError: any) {
        console.error('Gemini call error:', gemError);
        return res.json({
          text: `*(Central AI: Encountered service error executing request, falling back to local reasoning)*\n\nBased on your organization **${workspaceInfo?.organization?.orgName}**, I recommend confirming your workspace priorities. The team is currently monitoring active tasks like "${workspaceInfo?.tasks?.[0]?.title || 'none'}". Let me know if you would like me to assist with drafting a direct follow-up email or checking capacity allocation.`,
          error: gemError?.message || String(gemError)
        });
      }
    } else {
      // Fallback response for mock mode when Gemini API key is missing
      return res.json({
        text: `### 🤖 Central AI Monitor (Mock Mode)

It looks like the \`GEMINI_API_KEY\` is not set in your Secrets panel yet. I am running in local offline demo mode!

**CEO Training State:** ${trainingDoc ? 'Custom-Trained' : 'Standard Alignment'}
**Guideline Summary:** We are prioritizing active operations in **${workspaceInfo?.organization?.orgName || 'your organization'}**.

Based on an review of your active **${workspaceInfo?.tasks?.length || 0} tasks**:
1. You have **${workspaceInfo?.tasks?.filter((t: any) => t.priority === 'High' && t.stage !== 'Completed').length || 0} high priority pending tasks**. Keep a close eye on resource allocation!
2. Your team capacity is **${workspaceInfo?.profiles?.length || 1} out of ${workspaceInfo?.organization?.teamCapacity || 10} filled**.
3. I would be happy to draft automated correspondence or assist you with planning as soon as you connect your keys. How can I help you refine workflows today?`
      });
    }
  } catch (error: any) {
    console.error('Express chat route error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// Endpoint for AI image construction / editing studio
app.post('/api/gemini/generate-image', async (req, res) => {
  try {
    const { prompt, aspectRatio } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const ai = getAiClient();
    const ratio = aspectRatio || '1:1';

    if (ai) {
      try {
        // imagen-3.0-generate-002 is the main standard image generation model
        const response = await ai.models.generateImages({
          model: 'imagen-3.0-generate-002',
          prompt: prompt,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: ratio,
          },
        });

        const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
        if (imageBytes) {
          const dataUrl = `data:image/jpeg;base64,${imageBytes}`;
          return res.json({ dataUrl, prompt });
        } else {
          throw new Error('Image bytes were not returned from the Imagen API');
        }
      } catch (imgError: any) {
        console.error('Gemini image api error, falling back to generative placeholder:', imgError);
        // Generatively styled placeholder
        const seedVal = encodeURIComponent(prompt.trim().substring(0, 20));
        const dataUrl = `https://picsum.photos/seed/${seedVal}/800/600`;
        return res.json({
          dataUrl,
          prompt,
          warning: `Imagen request failed (${imgError.message || imgError}). Loaded styled unsplash/picsum alternative.`
        });
      }
    } else {
      // Return a high-fidelity visual placeholder URL that matches the dark/light aesthetic using picsum
      const seedVal = encodeURIComponent(prompt.trim().substring(0, 20));
      const dataUrl = `https://picsum.photos/seed/${seedVal}/800/600`;
      return res.json({
        dataUrl,
        prompt,
        warning: 'Running in demo mode. Set GEMINI_API_KEY in the secrets menu to activate real-time AI image generation.'
      });
    }
  } catch (error: any) {
    console.error('Express image route error:', error);
    res.status(500).json({ error: 'Internal Server error', details: error.message });
  }
});

// ----------------------------------------------------
// J.A.R.V.I.S. AGENT ENDPOINTS
// ----------------------------------------------------

const JARVIS_PERSONA = `You are J.A.R.V.I.S., a personal AI agent embedded into this user's "Workspace OS". You speak with the calm, dry-witted, unfailingly polite tone of a world-class British executive assistant: concise, a little understated, occasionally wry, never obsequious. Address the user respectfully but naturally (their name if known, otherwise "sir" or "boss" sparingly, not every line).

You are not just a chatbot - you are an agent with real capabilities inside this workspace. When the user asks you to actually do something (create a task, move a task to a new stage, draft an email, or raise an alert), call the matching tool instead of only describing it in text. Only use tools when the user's intent is genuinely actionable; for questions or conversation, just reply normally. You may call multiple tools in one turn if the request calls for it. After deciding on tool calls, you do not need to also restate every detail in text - a brief acknowledgement is enough, the UI will show the executed action separately.`;

function buildJarvisSystemPrompt(workspaceInfo: any, trainingDoc: string, currentUser: any): string {
  return `${JARVIS_PERSONA}

Founder/Org alignment guidelines to respect:
"""
${trainingDoc || 'None supplied yet.'}
"""

Current user you are speaking with: ${currentUser?.name || 'Unknown'} (${currentUser?.role || 'Unknown role'})
Organization: ${workspaceInfo?.organization?.orgName || 'N/A'}
Team capacity: ${workspaceInfo?.profiles?.length || 0}/${workspaceInfo?.organization?.teamCapacity || 'N/A'}

Active tasks:
${JSON.stringify(workspaceInfo?.tasks || [])}

Team profiles (use "id" as assigneeId when creating a task for a specific person, or "Personal" for the current user):
${JSON.stringify((workspaceInfo?.profiles || []).map((p: any) => ({ id: p.id, name: p.name, role: p.role })))}`;
}

const JARVIS_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'create_task',
        description: 'Create a new task on the workspace task board.',
        parameters: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING', description: 'Short task title' },
            description: { type: 'STRING', description: 'Task details' },
            priority: { type: 'STRING', enum: ['High', 'Medium', 'Low'] },
            assigneeId: { type: 'STRING', description: 'Profile id to assign to, or "Personal"' },
          },
          required: ['title', 'priority'],
        },
      },
      {
        name: 'update_task_stage',
        description: "Move an existing task to a new stage. Match the task by its title (fuzzy match is fine).",
        parameters: {
          type: 'OBJECT',
          properties: {
            taskTitle: { type: 'STRING' },
            stage: { type: 'STRING', enum: ['To-Do', 'In-Progress', 'Review', 'Completed'] },
          },
          required: ['taskTitle', 'stage'],
        },
      },
      {
        name: 'draft_email',
        description: 'Draft an email for the user to review in the Gmail Sender tab before sending. This does NOT send the email.',
        parameters: {
          type: 'OBJECT',
          properties: {
            to: { type: 'STRING', description: 'Recipient email address, if known' },
            subject: { type: 'STRING' },
            body: { type: 'STRING' },
          },
          required: ['subject', 'body'],
        },
      },
      {
        name: 'flag_alert',
        description: 'Raise a proactive alert/notification in the JARVIS alerts panel for the user to see.',
        parameters: {
          type: 'OBJECT',
          properties: {
            severity: { type: 'STRING', enum: ['Critical', 'Warning', 'Info'] },
            title: { type: 'STRING' },
            detail: { type: 'STRING' },
          },
          required: ['severity', 'title', 'detail'],
        },
      },
    ],
  },
];

// Conversational JARVIS endpoint with real tool-use/function-calling
app.post('/api/jarvis/chat', async (req, res) => {
  try {
    const { message, history, workspaceInfo, trainingDoc, currentUser } = req.body;
    const ai = getAiClient();

    if (!ai) {
      return res.json({
        text: `JARVIS core offline, sir - no \`GEMINI_API_KEY\` detected. I can still see your workspace has **${workspaceInfo?.tasks?.length || 0}** tasks logged, but I'll need my reasoning core connected before I can act on your behalf. Connect the key in the Secrets panel and I'll be fully operational.`,
        actions: [],
      });
    }

    const contents = (history || []).map((h: any) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }],
    }));
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents,
      config: {
        systemInstruction: buildJarvisSystemPrompt(workspaceInfo, trainingDoc, currentUser),
        tools: JARVIS_TOOLS,
      },
    });

    const calls = response.functionCalls || [];
    const actions = calls.map((c: any) => ({ name: c.name, args: c.args || {} }));
    let text = response.text || '';
    if (!text && actions.length > 0) {
      text = 'Right away.';
    }

    return res.json({ text, actions });
  } catch (error: any) {
    console.error('JARVIS chat route error:', error);
    return res.json({
      text: `Apologies, I hit some turbulence processing that request. (${error?.message || 'unknown error'})`,
      actions: [],
      error: error?.message || String(error),
    });
  }
});

// Scans a single email and extracts actionable follow-up tasks
app.post('/api/jarvis/email-scan', async (req, res) => {
  try {
    const { from, subject, body } = req.body;
    const ai = getAiClient();

    if (!ai) {
      return res.json({
        summary: 'JARVIS core offline: connect a GEMINI_API_KEY to enable email intelligence scanning.',
        requiresAction: false,
        actionItems: [],
      });
    }

    const prompt = `Analyze this email and extract concrete follow-up tasks a team member should track. If it is pure noise (newsletters, receipts, automated notices) with nothing actionable, return an empty actionItems array and requiresAction: false.

From: ${from || 'unknown'}
Subject: ${subject || '(no subject)'}
Body:
"""
${(body || '').slice(0, 6000)}
"""`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            summary: { type: 'STRING' },
            requiresAction: { type: 'BOOLEAN' },
            actionItems: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  title: { type: 'STRING' },
                  priority: { type: 'STRING', enum: ['High', 'Medium', 'Low'] },
                },
                required: ['title', 'priority'],
              },
            },
          },
          required: ['summary', 'requiresAction', 'actionItems'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      summary: parsed.summary || 'No summary available.',
      requiresAction: !!parsed.requiresAction,
      actionItems: parsed.actionItems || [],
    });
  } catch (error: any) {
    console.error('JARVIS email-scan route error:', error);
    // Always resolve with the expected shape so the client never has to guess about a failed scan.
    res.json({
      summary: `Scan failed: ${error?.message || 'unknown error'}`,
      requiresAction: false,
      actionItems: [],
    });
  }
});

// Proactive workspace briefing - JARVIS reviews live state and surfaces alerts unprompted
app.post('/api/jarvis/briefing', async (req, res) => {
  try {
    const { workspaceInfo, trainingDoc } = req.body;
    const ai = getAiClient();

    if (!ai) {
      return res.json({ alerts: [] });
    }

    const prompt = `You are JARVIS, proactively monitoring this organization's workspace like a diagnostics system watching for trouble. Review the live state below and surface ONLY genuinely noteworthy issues: high-priority tasks stuck in To-Do or In-Progress, team capacity near its limit, unassigned high-priority work, or workflows that look stale. Do not invent problems - if things look healthy, return an empty alerts array.

Organization: ${workspaceInfo?.organization?.orgName || 'N/A'}
Team capacity: ${workspaceInfo?.profiles?.length || 0}/${workspaceInfo?.organization?.teamCapacity || 'N/A'}
Tasks: ${JSON.stringify(workspaceInfo?.tasks || [])}
Founder guidelines: ${trainingDoc || 'none'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            alerts: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  severity: { type: 'STRING', enum: ['Critical', 'Warning', 'Info'] },
                  title: { type: 'STRING' },
                  detail: { type: 'STRING' },
                },
                required: ['severity', 'title', 'detail'],
              },
            },
          },
          required: ['alerts'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{"alerts":[]}');
    return res.json({ alerts: parsed.alerts || [] });
  } catch (error: any) {
    console.error('JARVIS briefing route error:', error);
    // Fail quiet: a broken briefing should never surface as a UI crash, just skip this cycle.
    res.json({ alerts: [] });
  }
});

// ----------------------------------------------------
// VITE OR STATIC SERVING MIDDLEWARE
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express server running on http://localhost:${PORT}`);
  });
}

startServer();

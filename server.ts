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

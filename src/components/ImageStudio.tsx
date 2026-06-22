import React, { useState } from 'react';
import { Image, Sparkles, RefreshCw, Download, Layers, ShieldCheck } from 'lucide-react';

interface ImageStudioProps {
  theme: 'Whitish Modern' | 'Black Modern';
}

interface ImageRecord {
  prompt: string;
  url: string;
  ratio: string;
  timestamp: string;
}

export default function ImageStudio({ theme }: ImageStudioProps) {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isLoading, setIsLoading] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [imageRecords, setImageRecords] = useState<ImageRecord[]>([]);
  const [responseNotice, setResponseNotice] = useState<string | null>(null);

  const isDark = theme === 'Black Modern';

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setResponseNotice(null);

    try {
      const res = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspectRatio: aspectRatio,
        }),
      });

      if (!res.ok) {
        throw new Error('Server side graphic compile error');
      }

      const data = await res.json();
      setActiveImage(data.dataUrl);

      if (data.warning) {
        setResponseNotice(data.warning);
      }

      const newRecord: ImageRecord = {
        prompt: prompt.trim(),
        url: data.dataUrl,
        ratio: aspectRatio,
        timestamp: new Date().toLocaleTimeString(),
      };

      setImageRecords((prev) => [newRecord, ...prev]);
    } catch (err: any) {
      console.error(err);
      setResponseNotice(`Error generating image: ${err.message || String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadImageObj = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `workspace_graphics_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT: Generation Controls (Cols 5) */}
      <div 
        className={`lg:col-span-5 p-6 rounded-2xl border flex flex-col justify-between ${
          isDark ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200/85 shadow-xs'
        }`}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2 border-b pb-3 border-slate-100 dark:border-slate-800/80">
            <Image className="w-5 h-5 text-cyan-500 animate-pulse" />
            <div>
              <h3 className="text-sm font-bold text-slate-850 dark:text-white">Workspace Graphics Creator</h3>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Create visual nodes with Gemini Imagen</p>
            </div>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1 opacity-70 text-slate-600 dark:text-slate-350">Graphic Description Prompt</label>
              <textarea
                required
                rows={4}
                placeholder="A modern office workspace background overlay with cyber blue colors and realistic bento cards, flat minimalist style..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className={`w-full p-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 leading-relaxed ${
                  isDark 
                    ? 'bg-slate-800 border-slate-700 text-white focus:border-slate-600' 
                    : 'bg-white border-slate-200 text-slate-800 focus:border-slate-300'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1 opacity-70">Aspect Ratio</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className={`w-full p-2.5 text-xs rounded-xl border focus:outline-none ${
                    isDark ? 'bg-[#161616] border-neutral-800 text-neutral-300' : 'bg-white border-neutral-200 text-neutral-700'
                  }`}
                >
                  <option value="1:1">1:1 Core Square</option>
                  <option value="16:9">16:9 Landscape Banner</option>
                  <option value="4:3">4:3 Thumbnail</option>
                  <option value="3:4">3:4 Portrait</option>
                  <option value="9:16">9:16 Banner Poster</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:scale-[1.02] transition-all cursor-pointer ${
                    isLoading 
                      ? 'opacity-40 cursor-not-allowed'
                      : isDark 
                        ? 'bg-white text-black hover:bg-neutral-100' 
                        : 'bg-neutral-900 text-white hover:bg-neutral-800'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Rendering...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                      Run Render
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Warning alerts block */}
        {responseNotice && (
          <div className="mt-4 p-3.5 rounded-xl border border-amber-500/10 bg-amber-500/5 text-amber-500 text-[10px] flex items-start gap-1.5 leading-relaxed">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>{responseNotice}</span>
          </div>
        )}
      </div>

      {/* RIGHT: Active Render Frame (Cols 7) */}
      <div className="lg:col-span-7 grid grid-cols-1 gap-6">
        {/* Main Canvas Frame */}
        <div 
          className={`p-6 rounded-2xl border flex flex-col justify-between items-center min-h-[300px] ${
            isDark ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-200/85 shadow-xs'
          }`}
        >
          {activeImage ? (
            <div className="w-full h-full flex flex-col justify-between space-y-4">
              <div className="relative rounded-xl overflow-hidden border border-slate-200/50 dark:border-slate-800 flex items-center justify-center bg-slate-50/50 dark:bg-black/20">
                <img
                  src={activeImage}
                  alt="Generated graphic preview"
                  className="max-h-[350px] object-contain mx-auto transition-transform hover:scale-105 duration-350"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <p className="text-[10px] text-slate-450 italic truncate max-w-[70%]">Prompt: "{prompt || 'N/A'}"</p>
                <button
                  onClick={() => downloadImageObj(activeImage)}
                  className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1 cursor-pointer transition-all ${
                    isDark 
                    ? 'border-slate-800 bg-[#161616] text-white hover:bg-[#202020]' 
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Download className="w-3 h-3 text-cyan-600" /> Download
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center p-12 text-center text-slate-400 gap-2">
              <Image className={`w-12 h-12 mb-2 opacity-30 ${isDark ? 'text-slate-500' : 'text-slate-450'}`} />
              <h4 className="text-xs font-bold font-sans text-slate-800 dark:text-white">Image Frame Sandbox</h4>
              <p className="text-[10px] leading-relaxed max-w-[280px]">
                Create modern covers, diagram cards, avatar headers, or vector layouts. Enter a prompt on the left and start compiling!
              </p>
            </div>
          )}
        </div>

        {/* Previous Renders Registry */}
        {imageRecords.length > 0 && (
          <div 
            className={`p-5 rounded-2xl border ${
              isDark ? 'bg-[#1e293b] border-slate-800' : 'bg-white border-slate-205 shadow-xs'
            }`}
          >
            <h4 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5 font-mono text-slate-400"><Layers className="w-3.5 h-3.5 text-cyan-500" />Studio Generation Archive</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {imageRecords.map((rec, idx) => (
                <div 
                  key={idx}
                  onClick={() => {
                    setActiveImage(rec.url);
                    setPrompt(rec.prompt);
                    setAspectRatio(rec.ratio);
                  }}
                  className={`group relative rounded-lg overflow-hidden border cursor-pointer hover:scale-[1.03] transition-all aspect-square min-h-[80px] bg-neutral-900 ${
                    isDark ? 'border-neutral-800' : 'border-neutral-200'
                  }`}
                >
                  <img
                    src={rec.url}
                    alt={rec.prompt}
                    className="w-full h-full object-cover opacity-75 group-hover:opacity-100"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex items-end">
                    <p className="text-[8px] text-white truncate max-w-full">{rec.prompt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

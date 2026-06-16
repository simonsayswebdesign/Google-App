
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { generateSection, generateFullPage } from './services/geminiService';
import { GeneratedSection, ViewMode } from './types';
import { stripBackgrounds, constructFullPageHtml, deconstructSnippet, injectMetadataToHtml } from './utils/sectionUtils';
import { Button } from './components/Button';
import { PreviewFrame } from './components/PreviewFrame';
import { SectionBlock } from './components/SectionBlock';
import { WordPressPanel } from './components/WordPressPanel';
import { 
  Code as CodeIcon, 
  Eye, 
  EyeOff,
  Sparkles,
  X,
  Palette,
  Layout,
  Monitor,
  RotateCcw,
  Download,
  Menu,
  Cpu,
  Eraser,
  Image as ImageIcon,
  UploadCloud,
  Layers,
  Check,
  Copy,
  ExternalLink,
  Key
} from 'lucide-react';

const STYLE_CATEGORIES = {
  "Modern & Clean": ["Modern SaaS", "Minimal", "Flat", "Claymorphism", "Material", "Monochromatic", "Scandinavian", "Organic/Fluid"],
  "Elegant & Luxury": ["Editorial", "Luxury Minimal", "Old Money", "Art Deco", "Japandi", "Typography First"],
  "Corporate & Tech": ["Corporate Professional", "Dark Mode First", "Tech Forward", "Terminal / CLI", "Modernist"],
  "Bold & Creative": ["Neobrutalist", "Y2K / Vaporwave", "Retro-futuristic", "Neo-Geo", "Kinetic", "Gradient Modern", "Glassmorphism", "Neumorphic"],
  "Art & Structure": ["Swiss/International", "Bauhaus", "Metropolitan"]
};

const getThemeColor = (style: string): string => {
  const lower = style.toLowerCase();
  if (lower.includes('brutalist') || lower.includes('kinetic')) return 'lime';
  if (lower.includes('editorial') || lower.includes('luxury')) return 'rose';
  if (lower.includes('money') || lower.includes('eco') || lower.includes('japandi') || lower.includes('scandinavian')) return 'emerald';
  if (lower.includes('swiss') || lower.includes('bauhaus') || lower.includes('red') || lower.includes('metropolitan')) return 'red';
  if (lower.includes('cyber') || lower.includes('terminal') || lower.includes('tech') || lower.includes('cli')) return 'cyan';
  if (lower.includes('vaporwave') || lower.includes('gradient') || lower.includes('geo')) return 'fuchsia';
  if (lower.includes('art deco') || lower.includes('gold')) return 'amber';
  if (lower.includes('glass') || lower.includes('neu')) return 'violet';
  if (lower.includes('corporate') || lower.includes('saas')) return 'indigo';
  return 'indigo';
};

const STORAGE_KEY = 'chaigen_state';

function App() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('Modern SaaS');
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<GeneratedSection[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.PREVIEW);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isTransparentGen, setIsTransparentGen] = useState(false);
  const [themeMode, setThemeMode] = useState<'auto' | 'light' | 'dark' | 'accent'>('auto');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');

  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return (typeof window !== 'undefined' && window.localStorage) ? window.localStorage.getItem('selected_gemini_model') || 'gemini-3.5-flash' : 'gemini-3.5-flash';
  });
  const [animationStyle, setAnimationStyle] = useState<string>(() => {
    return (typeof window !== 'undefined' && window.localStorage) ? window.localStorage.getItem('selected_animation_style') || 'slide-up' : 'slide-up';
  });

  const [subscriberApiKey, setSubscriberApiKey] = useState(() => {
    return (typeof window !== 'undefined' && window.localStorage) ? window.localStorage.getItem('subscriber_gemini_api_key') || '' : '';
  });
  const [showSubscriberApiKey, setShowSubscriberApiKey] = useState(false);

  const handleSubscriberApiKeyChange = (val: string) => {
    setSubscriberApiKey(val);
    if (typeof window !== 'undefined' && window.localStorage) {
      const trimmed = val.trim();
      if (!trimmed) {
        window.localStorage.removeItem('subscriber_gemini_api_key');
      } else {
        window.localStorage.setItem('subscriber_gemini_api_key', trimmed);
      }
    }
  };

  const abortControllerRef = useRef<AbortController | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const themeColor = useMemo(() => getThemeColor(style), [style]);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.sections) setSections(parsed.sections);
        if (parsed.style) setStyle(parsed.style);
        if (parsed.prompt) setPrompt(parsed.prompt);
        if (parsed.themeMode) setThemeMode(parsed.themeMode);
        if (parsed.isTransparentGen !== undefined) setIsTransparentGen(parsed.isTransparentGen);
        if (parsed.selectedModel) setSelectedModel(parsed.selectedModel);
        if (parsed.animationStyle) setAnimationStyle(parsed.animationStyle);
      } catch (e) {
        console.error("Failed to load state from localStorage", e);
      }
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
      sections,
      style,
      prompt,
      themeMode,
      isTransparentGen,
      selectedModel,
      animationStyle
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('selected_gemini_model', selectedModel);
      localStorage.setItem('selected_animation_style', animationStyle);
    }
  }, [sections, style, prompt, themeMode, isTransparentGen, selectedModel, animationStyle]);

  const [loadingTime, setLoadingTime] = useState(0);

  // Automatically collapse left sidebar in Preview mode for wider workspace view
  useEffect(() => {
    if (viewMode === ViewMode.PREVIEW) {
      setIsLeftSidebarCollapsed(true);
    } else {
      setIsLeftSidebarCollapsed(false);
    }
  }, [viewMode]);

  useEffect(() => {
    let interval: any;
    if (loading) {
      setLoadingTime(0);
      interval = setInterval(() => {
        setLoadingTime(prev => prev + 1);
      }, 1000);
    } else {
      setLoadingTime(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleCancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  }, []);

  const handleGenerateSection = useCallback(async () => {
    if (!prompt.trim() && !selectedImage) return;
    setLoading(true);
    setError(null);
    setIsMobileSidebarOpen(false);
    
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Industry/Niche Persistence: Use the first section as the DNA anchor
      const themeReferenceHtml = sections.length > 0 ? sections[0].html : undefined;
      const lastSectionHtml = sections.length > 0 ? sections[sections.length - 1].html : undefined;
      
      const result = await generateSection(prompt, { 
        style, 
        image: selectedImage || undefined,
        referenceHtml: themeReferenceHtml,
        prevSectionHtml: lastSectionHtml,
        isTransparent: isTransparentGen,
        themePreference: themeMode,
        model: selectedModel,
        signal: controller.signal,
        animationStyle: animationStyle
      });
      
      if (!result || !result.html) {
        throw new Error("The AI failed to produce a valid design. Please try again.");
      }

      const newSection: GeneratedSection = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        ...result
      };
      setSections(prev => [...prev, newSection]);
      setViewMode(ViewMode.PREVIEW);
      setPrompt('');
      setSelectedImage(null);
    } catch (err: any) {
      if (err.message === "Aborted") {
        console.log("Generation aborted by user");
      } else {
        let errorMessage = err.message || "Generation failed.";
        
        // Try to parse JSON error if it looks like one
        if (errorMessage.startsWith('{') || errorMessage.includes('{"error"')) {
          try {
            const parsed = JSON.parse(errorMessage.replace(/^.*?({.*}).*$/, '$1'));
            if (parsed.error?.message) {
              errorMessage = parsed.error.message;
            }
            if (parsed.error?.status === "RESOURCE_EXHAUSTED" || errorMessage.includes("quota")) {
              errorMessage = "API Quota Exceeded: You've reached the shared generation limit. To get unlimited seamless generations, please add your own key in Settings > Secrets (as GEMINI_API_KEY).";
            }
          } catch (e) {
            // Fallback to original message if parsing fails
          }
        }
        
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [prompt, style, selectedImage, sections, isTransparentGen, themeMode, selectedModel, animationStyle]);

  const handleGenerateFullPage = useCallback(async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setIsMobileSidebarOpen(false);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const anchorHtml = sections.length > 0 ? sections[0].html : undefined;
      const results = await generateFullPage(prompt, style, isTransparentGen, themeMode, anchorHtml, selectedModel, controller.signal, animationStyle);
      setSections(results.map(r => ({ id: crypto.randomUUID(), timestamp: Date.now(), ...r })));
      setViewMode(ViewMode.PREVIEW);
      setPrompt('');
    } catch (err: any) {
      if (err.message === "Aborted") {
        console.log("Full page generation aborted by user");
      } else {
        let errorMessage = err.message || "Full page generation failed.";
        
        // Try to parse JSON error if it looks like one
        if (errorMessage.startsWith('{') || errorMessage.includes('{"error"')) {
          try {
            const parsed = JSON.parse(errorMessage.replace(/^.*?({.*}).*$/, '$1'));
            if (parsed.error?.message) {
              errorMessage = parsed.error.message;
            }
            if (parsed.error?.status === "RESOURCE_EXHAUSTED" || errorMessage.includes("quota")) {
              errorMessage = "API Quota Exceeded: You've reached the shared generation limit. To get unlimited seamless generations, please add your own key in Settings > Secrets (as GEMINI_API_KEY).";
            }
          } catch (e) {
            // Fallback to original message if parsing fails
          }
        }
        
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [prompt, style, isTransparentGen, themeMode, sections, selectedModel, animationStyle]);

  const handleReset = useCallback(() => {
    setSections([]);
    setThemeMode('auto');
    setStyle('Modern SaaS');
    setPrompt('');
    setSelectedImage(null);
    setIsTransparentGen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const rawHtml = sections.map(s => s.html).join('\n\n');
  const fullHtml = constructFullPageHtml(sections);

  return (
    <div className={`flex h-screen bg-[#0a0a0c] text-gray-200 overflow-hidden font-sans selection:bg-${themeColor}-500 selection:text-white`}>
      {isMobileSidebarOpen && <div className="fixed inset-0 bg-black/80 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsMobileSidebarOpen(false)} />}
      
      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[#111114] border border-[#222226] w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-[#222226] flex items-center justify-between">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Restore Session</h3>
              <button onClick={() => setIsImportModalOpen(false)} className="p-2 text-gray-400 hover:text-white"><X className="w-6 h-6"/></button>
            </div>
            <div className="p-8 space-y-6">
              <textarea 
                className={`w-full h-64 bg-[#0a0a0c] border border-[#222226] rounded-2xl p-6 text-xs font-mono text-${themeColor}-300 outline-none resize-none`}
                placeholder="Paste code here..."
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              <Button onClick={() => {
                const restored = deconstructSnippet(importText);
                if (restored.length > 0) {
                  setSections(restored.map(s => ({
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    ...s
                  })));
                  if (restored[0].style) {
                    setStyle(restored[0].style);
                  }
                  if (restored[0].detectedThemeMode) {
                    setThemeMode(restored[0].detectedThemeMode);
                  }
                  setIsImportModalOpen(false);
                  setImportText('');
                } else setError("No sections found in the pasted build code.");
              }} themeColor={themeColor} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest">Restore Build</Button>
            </div>
          </div>
        </div>
      )}

      {/* LEFT SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-40 bg-[#111114] border-r border-[#222226] flex flex-col transform transition-all duration-300 md:relative 
        ${isMobileSidebarOpen ? 'translate-x-0 w-[360px]' : '-translate-x-full md:translate-x-0'} 
        ${isLeftSidebarCollapsed ? 'md:w-0 md:opacity-0 md:pointer-events-none md:border-r-0' : 'md:w-[360px] md:opacity-100'}
      `}>
        <div className="w-[360px] flex flex-col h-full shrink-0">
          <div className="p-6 border-b border-[#222226] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 bg-${themeColor}-600 rounded-xl flex items-center justify-center shadow-lg shadow-${themeColor}-500/20`}><Monitor className="w-6 h-6 text-white" /></div>
              <div>
                <h1 className="text-lg font-bold text-white leading-none">ChaiGen</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none">V10 Elite Builder</span>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                      <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest">Draft Saved</span>
                  </div>
                </div>
              </div>
            </div>
            <button onClick={() => setIsMobileSidebarOpen(false)} className="md:hidden"><X className="w-6 h-6"/></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
            <div className="space-y-4">
              <div className={`flex items-center space-x-2 text-${themeColor}-400`}><Palette className="w-4 h-4"/><label className="text-xs font-bold uppercase tracking-widest">Aesthetic & Theme</label></div>
              <input type="text" className="w-full bg-[#1a1a1e] border border-[#222226] rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={style} onChange={(e) => setStyle(e.target.value)} placeholder="Search styles..." />
              
              <div className="grid grid-cols-4 gap-1 p-1 bg-[#161618] border border-[#222226] rounded-xl">
                 {['auto', 'light', 'dark', 'accent'].map(m => (
                   <button key={m} onClick={() => setThemeMode(m as any)} className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${themeMode === m ? `bg-${m === 'light' ? 'white' : m === 'accent' ? 'white' : themeColor + '-600'} ${m === 'light' || m === 'accent' ? 'text-black' : 'text-white'}` : 'text-gray-500'}`}>{m}</button>
                 ))}
              </div>

              <div className="space-y-4 pt-2">
                {Object.entries(STYLE_CATEGORIES).map(([cat, styles]) => (
                  <div key={cat} className="space-y-2">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{cat}</span>
                    <div className="grid grid-cols-2 gap-2">
                      {styles.map(s => (
                        <button 
                          key={s} 
                          onClick={() => setStyle(s)} 
                          className={`px-2 py-1.5 text-[9px] font-bold rounded-lg border text-left truncate transition-colors ${style === s ? `bg-${themeColor}-600 border-${themeColor}-500 text-white shadow-lg shadow-${themeColor}-500/20` : 'bg-[#1a1a1e] border-[#222226] text-gray-400 hover:text-white hover:border-gray-600'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Subscriber API Key Panel */}
            <div className="space-y-3 p-4 bg-[#161618] border border-[#222226] rounded-2xl">
              <div className="flex items-center justify-between">
                <div className={`flex items-center space-x-2 text-${themeColor}-400`}>
                  <Key className="w-3.5 h-3.5" />
                  <label className="text-[11px] font-bold uppercase tracking-widest leading-none">Subscriber Gemini Key</label>
                </div>
                <span className="text-[9px] text-[indigo]-400 px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded font-black uppercase tracking-wider">MEMBER API</span>
              </div>
              <p className="text-[10px] text-gray-400 leading-normal">
                Don't have server limits? Enter your own Google Gemini API key here. It is stored safely on your browser and processed on API calls.
              </p>
              <div className="relative flex items-center">
                <input 
                  type={showSubscriberApiKey ? "text" : "password"} 
                  className="w-full bg-[#1e1e22] border border-[#2d2d34] rounded-xl pl-3 pr-10 py-2.5 text-xs text-white placeholder-gray-600 focus:border-indigo-500 outline-none font-mono"
                  placeholder="AIzaSy..." 
                  value={subscriberApiKey} 
                  onChange={(e) => handleSubscriberApiKeyChange(e.target.value)} 
                />
                <button 
                  type="button"
                  onClick={() => setShowSubscriberApiKey(!showSubscriberApiKey)}
                  className="absolute right-3 hover:text-white transition-colors"
                >
                  {showSubscriberApiKey ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
              {subscriberApiKey && (
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span> Custom Key Loaded
                  </span>
                  <button 
                    onClick={() => handleSubscriberApiKeyChange('')}
                    className="text-[9px] font-black uppercase text-red-500 hover:text-red-400 transition-colors"
                  >
                    Clear Key
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className={`flex items-center space-x-2 text-${themeColor}-400`}><Layout className="w-4 h-4"/><label className="text-xs font-bold uppercase tracking-widest">Industry & Content</label></div>
              <textarea className={`w-full h-32 bg-[#1a1a1e] border border-[#222226] rounded-2xl p-4 text-sm outline-none resize-none focus:ring-2 focus:ring-${themeColor}-500`} placeholder="E.g. A portfolio for a Filmmaker (all blocks will stay in this niche)..." value={prompt} onChange={(e) => setPrompt(e.target.value)} />
              {selectedImage && (
                  <div className={`relative rounded-2xl overflow-hidden border-2 border-${themeColor}-500/30`}>
                      <img src={selectedImage} alt="Ref" className="w-full h-24 object-cover" />
                      <button onClick={() => setSelectedImage(null)} className="absolute top-2 right-2 p-1 bg-black/70 rounded-full hover:bg-red-500 transition-colors"><X className="w-4 h-4 text-white"/></button>
                  </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                      const reader = new FileReader();
                      reader.onload = () => setSelectedImage(reader.result as string);
                      reader.readAsDataURL(file);
                  }
              }} />
              <button onClick={() => { if (fileInputRef.current) fileInputRef.current.value = ""; fileInputRef.current?.click(); }} className="flex items-center justify-center space-x-2 p-3 rounded-xl border border-[#222226] text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all hover:bg-[#1a1a1e]">
                <ImageIcon className="w-4 h-4" /><span>Reference Image</span>
              </button>
              <div className="flex gap-2">
                  <Button onClick={handleGenerateSection} themeColor={themeColor} loading={loading} className="w-full h-14 rounded-2xl text-xs font-black uppercase tracking-widest">APPEND BLOCK</Button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 border-b border-[#222226] bg-[#0a0a0c]/80 backdrop-blur-xl flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center space-x-4">
                <button onClick={() => setIsMobileSidebarOpen(true)} className="md:hidden"><Menu className="w-6 h-6"/></button>
                <button 
                  onClick={() => setIsLeftSidebarCollapsed(prev => !prev)} 
                  className={`hidden md:flex items-center justify-center p-2 rounded-xl border transition-all ${isLeftSidebarCollapsed ? `bg-${themeColor}-600/20 border-${themeColor}-500/50 text-${themeColor}-400` : 'bg-[#161618] border-[#222226] text-gray-400 hover:text-white hover:border-gray-600'}`}
                  title={isLeftSidebarCollapsed ? "Expand Options Panel" : "Collapse Options Panel"}
                >
                  <Layout className="w-4 h-4" />
                </button>
                <h2 className="text-xl font-black text-white tracking-tight uppercase">ELITE ARCHITECT</h2>
            </div>
            <div className="flex items-center space-x-4">
                <button onClick={() => setIsImportModalOpen(true)} className="text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-white transition-colors">Import</button>
                {sections.length > 0 && <button onClick={handleReset} className="text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1 hover:text-red-400 transition-colors"><RotateCcw className="w-3 h-3"/> Reset</button>}
                <div className="flex items-center p-1 bg-[#111114] rounded-xl border border-[#222226]">
                    <button onClick={() => setViewMode(ViewMode.PREVIEW)} className={`px-5 py-2 rounded-lg text-xs font-black uppercase transition-all ${viewMode === ViewMode.PREVIEW ? `bg-${themeColor}-600 text-white shadow-lg` : 'text-gray-500 hover:text-gray-300'}`}>Preview</button>
                    <button onClick={() => setViewMode(ViewMode.WORDPRESS)} className={`px-5 py-2 rounded-lg text-xs font-black uppercase transition-all ${viewMode === ViewMode.WORDPRESS ? `bg-${themeColor}-600 text-white shadow-lg` : 'text-gray-500 hover:text-gray-300'}`} disabled={sections.length === 0}>WordPress</button>
                </div>
                {sections.length > 0 && (
                  <button 
                    onClick={() => setIsRightSidebarCollapsed(prev => !prev)} 
                    className={`hidden md:flex items-center justify-center p-2 rounded-xl border transition-all ${isRightSidebarCollapsed ? `bg-${themeColor}-600/20 border-${themeColor}-500/50 text-${themeColor}-400` : 'bg-[#161618] border-[#222226] text-gray-400 hover:text-white hover:border-gray-600'}`}
                    title={isRightSidebarCollapsed ? "Expand Stack Layers" : "Collapse Stack Layers"}
                  >
                    <Layers className="w-4 h-4" />
                  </button>
                )}
            </div>
        </header>

        <div className="flex-1 p-8 overflow-hidden relative">
            {sections.length === 0 && !loading && (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
                    <div className={`w-20 h-20 rounded-[35px] bg-${themeColor}-600 flex items-center justify-center mb-10 shadow-3xl shadow-${themeColor}-500/20`}><Sparkles className="w-10 h-10 text-white"/></div>
                    <h3 className="text-3xl font-black text-white mb-4 uppercase tracking-tighter leading-none">Assemble Your Niche</h3>
                    <p className="text-gray-400 text-lg leading-relaxed">The first section you generate sets the industry theme (e.g. Filmmakers). Every section added after will strictly follow that topic.</p>
                </div>
            )}
            <div className="h-full flex flex-col gap-6">
                <div className="flex-1 bg-[#111114] rounded-xl border border-[#222226] overflow-hidden relative shadow-inner">
                    {viewMode === ViewMode.PREVIEW && <PreviewFrame title="Live Canvas" htmlContent={rawHtml} />}
                    {viewMode === ViewMode.WORDPRESS && (
                      <div className="w-full h-full p-6 overflow-hidden">
                        <WordPressPanel sections={sections} themeColor={themeColor} />
                      </div>
                    )}
                </div>
            </div>
            {loading && (
                <div className="absolute inset-0 bg-[#0a0a0c]/80 backdrop-blur-md flex flex-col items-center justify-center z-50">
                    <div className={`w-16 h-16 border-4 border-${themeColor}-500 border-t-transparent rounded-full animate-spin mb-6`}></div>
                    <p className="text-white text-2xl font-black tracking-tighter uppercase animate-pulse">
                        Generating...
                    </p>
                    <div className="flex flex-col items-center gap-1 mt-2">
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                            {loadingTime}s elapsed
                        </p>
                        {loadingTime > 30 && (
                            <p className="text-amber-500/60 text-[8px] font-black uppercase tracking-[0.2em] animate-pulse">
                                High traffic detected - App is retrying automatically
                            </p>
                        )}
                    </div>
                    <button 
                        onClick={handleCancelGeneration}
                        className="mt-8 px-6 py-2 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-full transition-all"
                    >
                        Cancel Request
                    </button>
                </div>
            )}
            {error && <div className="fixed bottom-8 right-8 bg-red-500 text-white px-6 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2 font-bold uppercase tracking-widest text-xs animate-in slide-in-from-bottom-4"><X className="w-4 h-4 cursor-pointer" onClick={() => setError(null)}/> {error}</div>}
        </div>
      </main>

      {/* STACK SIDEBAR */}
      {sections.length > 0 && (
        <aside className={`border-l border-[#222226] bg-[#111114] flex flex-col shrink-0 transition-all duration-300
          ${isRightSidebarCollapsed ? 'w-0 overflow-hidden border-l-0 opacity-0' : 'w-72 opacity-100'}
        `}>
          <div className="w-72 flex flex-col h-full shrink-0">
            <div className="p-6 border-b border-[#222226] flex items-center justify-between h-20">
                <div className="flex items-center space-x-2 text-gray-500">
                    <Layers className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Stack Layers</span>
                </div>
                <span className="text-[10px] font-mono text-gray-600 bg-[#1a1a1e] px-2 py-1 rounded-md">{sections.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {sections.map((s, idx) => (
                    <div key={s.id} className="relative">
                        {idx === 0 && (
                            <div className={`absolute -top-2 -left-2 z-10 bg-${themeColor}-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-lg border border-white/20`}>
                                Design Anchor
                            </div>
                        )}
                        <SectionBlock section={s} idx={idx} themeColor={themeColor} isFirst={idx === 0} isLast={idx === sections.length - 1} onDelete={(id) => setSections(prev => prev.filter(x => x.id !== id))} onMove={(id, dir) => {
                            const i = sections.findIndex(x => x.id === id);
                            const n = [...sections];
                            if (dir === 'up' && i > 0) [n[i], n[i-1]] = [n[i-1], n[i]];
                            if (dir === 'down' && i < n.length - 1) [n[i], n[i+1]] = [n[i+1], n[i]];
                            setSections(n);
                        }} onUpdate={(id, html) => setSections(prev => prev.map(x => x.id === id ? {...x, html} : x))} onCopy={(id, h) => {
                            const sec = sections.find(x => x.id === id);
                            const htmlWithMeta = sec ? injectMetadataToHtml(h, sec) : h;
                            navigator.clipboard.writeText(htmlWithMeta);
                            setCopiedId(id);
                            setTimeout(() => setCopiedId(null), 2000);
                        }} onToggleTransparency={(id) => setSections(prev => prev.map(x => x.id === id ? {...x, isTransparent: !x.isTransparent, html: !x.isTransparent ? stripBackgrounds(x.html) : x.originalHtml } : x))} copiedId={copiedId} />
                    </div>
                ))}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

export default App;

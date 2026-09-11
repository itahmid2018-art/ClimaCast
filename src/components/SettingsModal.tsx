import React, { useState, useEffect } from 'react';
import { X, Settings, Cloud, Bot, Key, Activity, Map as MapIcon, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { TemperatureUnit, ThemeMode } from '../types';

interface SettingsModalProps {
  onClose: () => void;
  unit: TemperatureUnit;
  onToggleUnit: () => void;
  theme: ThemeMode;
  onToggleTheme: (theme: ThemeMode) => void;
  platformView: 'web' | 'mobile' | 'extension';
  onSelectPlatformView: (view: 'web' | 'mobile' | 'extension') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  unit,
  onToggleUnit,
  theme,
  onToggleTheme,
  platformView,
  onSelectPlatformView,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'weather'>('general');

  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai' | 'anthropic' | 'openrouter'>('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [purpleAirKey, setPurpleAirKey] = useState('');
  const [radarMapKey, setRadarMapKey] = useState('');
  const [radarKeyStatus, setRadarKeyStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [isServerSyncing, setIsServerSyncing] = useState(false);

  useEffect(() => {
    // Load keys from server first, fallback to localStorage
    const loadKeys = async () => {
      try {
        const res = await fetch('/api/settings/keys');
        const data = await res.json();
        const keys = data.keys || {};
        
        setAiProvider((localStorage.getItem('gw_ai_provider') as any) || 'gemini');
        setGeminiKey(keys.GEMINI_API_KEY || localStorage.getItem('gw_gemini_key') || '');
        setOpenaiKey(keys.OPENAI_API_KEY || localStorage.getItem('gw_openai_key') || '');
        setAnthropicKey(keys.ANTHROPIC_API_KEY || localStorage.getItem('gw_anthropic_key') || '');
        setOpenrouterKey(keys.OPENROUTER_API_KEY || localStorage.getItem('gw_openrouter_key') || '');
        setPurpleAirKey(keys.PURPLEAIR_API_KEY || localStorage.getItem('gw_purpleair_key') || '');
        setRadarMapKey(keys.RADAR_API_KEY || localStorage.getItem('gw_radar_api_key') || '');
      } catch (err) {
        // Fallback to purely local if server fails
        setAiProvider((localStorage.getItem('gw_ai_provider') as any) || 'gemini');
        setGeminiKey(localStorage.getItem('gw_gemini_key') || '');
        setOpenaiKey(localStorage.getItem('gw_openai_key') || '');
        setAnthropicKey(localStorage.getItem('gw_anthropic_key') || '');
        setOpenrouterKey(localStorage.getItem('gw_openrouter_key') || '');
        setPurpleAirKey(localStorage.getItem('gw_purpleair_key') || '');
        setRadarMapKey(localStorage.getItem('gw_radar_api_key') || '');
      }
    };
    loadKeys();
  }, []);

  // Validation Debounce Effect for Radar Map Key
  useEffect(() => {
    const validateKey = async () => {
      if (!radarMapKey.trim()) {
        setRadarKeyStatus('idle');
        return;
      }
      setRadarKeyStatus('validating');
      try {
        // We use OpenWeatherMap as a proxy to validate standard weather map API keys
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=London&appid=${radarMapKey}`);
        if (res.ok) {
          setRadarKeyStatus('valid');
        } else {
          setRadarKeyStatus('invalid');
        }
      } catch (e) {
        setRadarKeyStatus('invalid');
      }
    };

    const timeoutId = setTimeout(validateKey, 800);
    return () => clearTimeout(timeoutId);
  }, [radarMapKey]);

  const saveAiProvider = (provider: 'gemini' | 'openai' | 'anthropic' | 'openrouter') => {
    setAiProvider(provider);
    localStorage.setItem('gw_ai_provider', provider);
  };

  const saveKey = (key: string, value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
    setter(value);
    localStorage.setItem(key, value);
    
    // Convert to DB key format
    const dbKeyMap: Record<string, string> = {
      'gw_gemini_key': 'GEMINI_API_KEY',
      'gw_openai_key': 'OPENAI_API_KEY',
      'gw_anthropic_key': 'ANTHROPIC_API_KEY',
      'gw_openrouter_key': 'OPENROUTER_API_KEY',
      'gw_purpleair_key': 'PURPLEAIR_API_KEY',
      'gw_radar_api_key': 'RADAR_API_KEY',
    };
    
    const dbKey = dbKeyMap[key];
    if (dbKey) {
      setIsServerSyncing(true);
      fetch('/api/settings/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: { [dbKey]: value } })
      }).finally(() => setIsServerSyncing(false)).catch(err => console.error('Failed to sync to db.json', err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Settings className="h-5 w-5" />
            <h2 className="text-lg font-bold">Preferences & APIs</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-full md:w-48 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3 space-y-1 overflow-x-auto flex flex-row md:flex-col">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap ${activeTab === 'general' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
            >
              <Settings className="h-4 w-4" /> General
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap ${activeTab === 'ai' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
            >
              <Bot className="h-4 w-4" /> AI Models
            </button>
            <button
              onClick={() => setActiveTab('weather')}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap ${activeTab === 'weather' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
            >
              <Cloud className="h-4 w-4" /> External APIs
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-5 overflow-y-auto bg-white dark:bg-slate-900">
            {activeTab === 'general' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">Unit & Theme</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-300">Temperature Unit</span>
                    <button onClick={onToggleUnit} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold dark:bg-slate-800">
                      {unit === 'celsius' ? 'Celsius (°C)' : 'Fahrenheit (°F)'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-300">Color Theme</span>
                    <select
                      value={theme}
                      onChange={(e) => onToggleTheme(e.target.value as ThemeMode)}
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold dark:bg-slate-800 border-none outline-none"
                    >
                      <option value="system">System Default</option>
                      <option value="light">Light Mode</option>
                      <option value="dark">Dark Mode</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">Platform View</h3>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                      <input type="radio" checked={platformView === 'web'} onChange={() => onSelectPlatformView('web')} className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-slate-700 dark:text-slate-200">Full Web Experience</span>
                    </label>
                    <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                      <input type="radio" checked={platformView === 'mobile'} onChange={() => onSelectPlatformView('mobile')} className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-slate-700 dark:text-slate-200">Mobile Simulator (Responsive test)</span>
                    </label>
                    <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                      <input type="radio" checked={platformView === 'extension'} onChange={() => onSelectPlatformView('extension')} className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-slate-700 dark:text-slate-200">Chrome Extension Layout</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="rounded-xl bg-blue-50 p-4 border border-blue-100 dark:bg-blue-950/30 dark:border-blue-900/50">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    By default, the server runs Gemini Models for weather insights securely. You can optionally switch to other providers and supply your own keys locally. These keys are sent securely to the server during insight generation.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">Select AI Provider</h3>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {['gemini', 'openai', 'anthropic', 'openrouter'].map((provider) => (
                      <button
                        key={provider}
                        onClick={() => saveAiProvider(provider as any)}
                        className={`p-3 text-sm font-semibold rounded-xl border text-center transition ${aiProvider === provider ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'}`}
                      >
                        {provider.charAt(0).toUpperCase() + provider.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
                    API Keys
                    {isServerSyncing && <span className="ml-2 inline-flex items-center text-[10px] text-blue-500 font-normal"><Loader2 className="h-3 w-3 animate-spin mr-1"/> Syncing to server...</span>}
                  </h3>
                  
                  {aiProvider === 'gemini' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Gemini API Key</label>
                      <div className="relative">
                        <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input type="password" value={geminiKey} onChange={(e) => saveKey('gw_gemini_key', e.target.value, setGeminiKey)} placeholder="AIzaSy..." className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <p className="text-[10px] text-slate-500 italic mt-1">If empty, falls back to the server-configured environment variable.</p>
                    </div>
                  )}
                  
                  {aiProvider === 'openai' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400">OpenAI API Key</label>
                      <div className="relative">
                        <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input type="password" value={openaiKey} onChange={(e) => saveKey('gw_openai_key', e.target.value, setOpenaiKey)} placeholder="sk-..." className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  )}

                  {aiProvider === 'anthropic' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Anthropic API Key</label>
                      <div className="relative">
                        <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input type="password" value={anthropicKey} onChange={(e) => saveKey('gw_anthropic_key', e.target.value, setAnthropicKey)} placeholder="sk-ant-..." className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  )}

                  {aiProvider === 'openrouter' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400">OpenRouter API Key</label>
                      <div className="relative">
                        <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input type="password" value={openrouterKey} onChange={(e) => saveKey('gw_openrouter_key', e.target.value, setOpenrouterKey)} placeholder="sk-or-v1-..." className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'weather' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">HyperLocal AQI (PurpleAir)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Provide a PurpleAir Read API Key to enable the HyperLocal Air Quality functionality from community sensors.</p>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">PurpleAir API Key</label>
                    <div className="relative">
                      <Activity className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input type="password" value={purpleAirKey} onChange={(e) => saveKey('gw_purpleair_key', e.target.value, setPurpleAirKey)} placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">Interactive Weather Radar Map</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Provide an API Key (e.g., OpenWeatherMap) to enable premium high-resolution Radar and Cloud Cover overlays.</p>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Radar & Cloud Map API Key</label>
                      {radarKeyStatus === 'validating' && <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Verifying...</span>}
                      {radarKeyStatus === 'valid' && <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Valid</span>}
                      {radarKeyStatus === 'invalid' && <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Invalid Key</span>}
                    </div>
                    <div className="relative">
                      <MapIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input 
                        type="password" 
                        value={radarMapKey} 
                        onChange={(e) => saveKey('gw_radar_api_key', e.target.value, setRadarMapKey)} 
                        placeholder="Premium API Key..." 
                        className={`w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                          radarKeyStatus === 'valid' ? 'border-emerald-500/50 focus:ring-emerald-500' : 
                          radarKeyStatus === 'invalid' ? 'border-rose-500/50 focus:ring-rose-500' : 
                          'border-slate-200 dark:border-slate-700'
                        }`} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

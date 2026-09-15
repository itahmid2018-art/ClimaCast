import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Cloud,
  Bot,
  Key,
  Activity,
  Map as MapIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  Zap,
  Globe,
  Compass,
  MapPin,
  Database,
  ArrowRight,
  BookmarkPlus,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import { TemperatureUnit, ThemeMode, GeoLocation, SavedPostalPin } from '../types';
import {
  fetchUserProfile,
  saveUserProfile,
  resolvePostalLocation,
  fetchWttrWeather,
  deletePostalPin,
} from '../services/userProfileApi';

interface SettingsModalProps {
  onClose: () => void;
  unit: TemperatureUnit;
  onToggleUnit: () => void;
  theme: ThemeMode;
  onToggleTheme: (theme: ThemeMode) => void;
  platformView: 'web' | 'mobile' | 'extension';
  onSelectPlatformView: (view: 'web' | 'mobile' | 'extension') => void;
  onSelectLocation?: (loc: GeoLocation) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  unit,
  onToggleUnit,
  theme,
  onToggleTheme,
  platformView,
  onSelectPlatformView,
  onSelectLocation,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'region' | 'database' | 'ai' | 'weather'>('general');

  // SQLite Status & Sync State (Web-Exclusive)
  const [sqliteStatus, setSqliteStatus] = useState<any>(null);
  const [isSqliteLoading, setIsSqliteLoading] = useState(false);
  const [sqliteSyncResult, setSqliteSyncResult] = useState<string | null>(null);

  // Weather Background Imagery Mode (Responsive Photography vs Ultra Data Saver)
  const [bgMode, setBgMode] = useState<'responsive' | 'gradients_only'>(() => {
    const saved = localStorage.getItem('climacast_bg_image_mode');
    if (saved === 'gradients_only') return 'gradients_only';
    return 'responsive';
  });

  const handleBgModeChange = (mode: 'responsive' | 'gradients_only') => {
    setBgMode(mode);
    localStorage.setItem('climacast_bg_image_mode', mode);
    window.dispatchEvent(new Event('climacast_bg_mode_changed'));
  };

  const loadSqliteStatus = async () => {
    setIsSqliteLoading(true);
    try {
      const res = await fetch(`/api/sqlite/status?platform=${platformView}`);
      const data = await res.json();
      setSqliteStatus(data);
    } catch (err: any) {
      setSqliteStatus({ success: false, error: err.message });
    } finally {
      setIsSqliteLoading(false);
    }
  };

  const triggerSqliteSync = async () => {
    setIsSqliteLoading(true);
    setSqliteSyncResult(null);
    try {
      const res = await fetch('/api/sqlite/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platformView }),
      });
      const data = await res.json();
      setSqliteSyncResult(data.message || 'Synchronization completed.');
      await loadSqliteStatus();
    } catch (err: any) {
      setSqliteSyncResult(`Sync failed: ${err.message}`);
    } finally {
      setIsSqliteLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'database') {
      loadSqliteStatus();
    }
  }, [activeTab, platformView]);

  // Regional Profile State (persisted in user-db.json)
  const [profileCountry, setProfileCountry] = useState('United States');
  const [profileCountryCode, setProfileCountryCode] = useState('US');
  const [profileState, setProfileState] = useState('California');
  const [profileDistrict, setProfileDistrict] = useState('');
  const [profileCity, setProfileCity] = useState('San Francisco');
  const [profileZipPin, setProfileZipPin] = useState('94103');
  const [profileAutoResolve, setProfileAutoResolve] = useState(true);
  const [profileWttrMode, setProfileWttrMode] = useState(true);
  const [profileLastUpdated, setProfileLastUpdated] = useState<string | null>(null);
  const [profileSaveStatus, setProfileSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [profileTestStatus, setProfileTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testResultSummary, setTestResultSummary] = useState<string | null>(null);
  const [savedPinsList, setSavedPinsList] = useState<SavedPostalPin[]>([]);

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
        setRadarMapKey(keys.OPENWEATHERMAP_API_KEY || keys.OPENWEATHER_API_KEY || keys.RADAR_API_KEY || localStorage.getItem('gw_radar_api_key') || '');
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

  // Load Regional Profile from user-db.json
  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const data = await fetchUserProfile();
        if (data && data.profile) {
          setProfileCountry(data.profile.country || 'United States');
          setProfileCountryCode(data.profile.countryCode || 'US');
          setProfileState(data.profile.state || 'California');
          setProfileDistrict(data.profile.district || '');
          setProfileCity(data.profile.city || '');
          setProfileZipPin(data.profile.defaultZipPin || '94103');
          setProfileAutoResolve(data.profile.autoResolveOnZipInput !== false);
          setProfileWttrMode(data.profile.wttrPrecisionMode !== false);
          setProfileLastUpdated(data.profile.lastUpdated || null);
          setSavedPinsList(data.savedZipPins || []);
        }
      } catch (err) {
        console.warn('Failed to load user-db.json profile in SettingsModal', err);
      }
    };
    loadProfileData();
  }, []);

  const handleSaveProfile = async () => {
    setProfileSaveStatus('saving');
    try {
      const updated = await saveUserProfile({
        country: profileCountry.trim(),
        countryCode: profileCountryCode.trim().toUpperCase(),
        state: profileState.trim(),
        district: profileDistrict.trim(),
        city: profileCity.trim(),
        defaultZipPin: profileZipPin.trim(),
        autoResolveOnZipInput: profileAutoResolve,
        wttrPrecisionMode: profileWttrMode,
      });
      setProfileLastUpdated(updated.profile.lastUpdated || new Date().toISOString());
      setProfileSaveStatus('saved');
      setTimeout(() => setProfileSaveStatus('idle'), 3000);
    } catch (err) {
      setProfileSaveStatus('error');
      setTimeout(() => setProfileSaveStatus('idle'), 3500);
    }
  };

  const handleTestPrediction = async () => {
    if (!profileZipPin.trim()) return;
    setProfileTestStatus('testing');
    setTestResultSummary(null);
    try {
      const geo = await resolvePostalLocation(profileZipPin.trim(), profileCountry, profileState);
      const wttr = await fetchWttrWeather(profileZipPin.trim()).catch(() => null);
      setProfileTestStatus('success');
      setTestResultSummary(
        `Resolved: ${geo.location.name} (${geo.location.latitude.toFixed(3)}°, ${geo.location.longitude.toFixed(3)}°) via ${geo.source}${
          wttr ? ` • WTTR: ${wttr.current.tempC}°C, ${wttr.current.weatherDesc}` : ''
        }`
      );
    } catch (err: any) {
      setProfileTestStatus('error');
      setTestResultSummary(err.message || 'Lookup failed.');
    }
  };

  const handleDeleteSavedPin = async (code: string) => {
    try {
      const updated = await deletePostalPin(code);
      setSavedPinsList(updated);
    } catch (err) {
      console.error(err);
    }
  };

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
      const keysPayload: Record<string, string> = { [dbKey]: value };
      if (dbKey === 'RADAR_API_KEY') {
        keysPayload['OPENWEATHERMAP_API_KEY'] = value;
        keysPayload['OPENWEATHER_API_KEY'] = value;
      }
      fetch('/api/settings/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: keysPayload })
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
              onClick={() => setActiveTab('region')}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap ${activeTab === 'region' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
            >
              <Globe className="h-4 w-4" /> Country & Region
            </button>
            <button
              onClick={() => setActiveTab('database')}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap ${activeTab === 'database' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
            >
              <Database className="h-4 w-4" /> SQLite & DB
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

                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>Weather Background Imagery &amp; Bandwidth</span>
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      Lazy Loading &amp; Responsive
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                      bgMode === 'responsive'
                        ? 'border-blue-500/80 bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-800'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}>
                      <input
                        type="radio"
                        name="bgMode"
                        checked={bgMode === 'responsive'}
                        onChange={() => handleBgModeChange('responsive')}
                        className="mt-0.5 w-4 h-4 text-blue-600"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            Responsive Photography (Auto-Optimized)
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded font-semibold">
                            Recommended
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                          Lazy-loads compressed responsive image sources tailored to device width (640w mobile, 1080w tablet, 1920w desktop). Cached in Service Worker for instant offline availability with zero layout shifts.
                        </p>
                      </div>
                    </label>

                    <label className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                      bgMode === 'gradients_only'
                        ? 'border-blue-500/80 bg-blue-50/50 dark:bg-blue-950/30 dark:border-blue-800'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}>
                      <input
                        type="radio"
                        name="bgMode"
                        checked={bgMode === 'gradients_only'}
                        onChange={() => handleBgModeChange('gradients_only')}
                        className="mt-0.5 w-4 h-4 text-blue-600"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            Atmospheric Gradients Only (Ultra Data Saver)
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded font-semibold">
                            Zero Images
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                          Completely halts background image downloads and renders instant CSS color gradients matching current weather conditions. Ideal for metered mobile data, roaming, or maximum battery conservation.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'region' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Information Banner */}
                <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/50 p-4 border border-blue-100 dark:from-blue-950/30 dark:to-indigo-950/20 dark:border-blue-900/50">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-blue-950 dark:text-blue-200 uppercase tracking-wide">
                          user-db.json Regional Persistence & WTTR.in
                        </h4>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800">
                          Active Persistence
                        </span>
                      </div>
                      <p className="text-xs text-blue-900/80 dark:text-blue-300/90 leading-relaxed">
                        Specify your <strong>Country</strong>, <strong>State</strong>, and <strong>District</strong>. These settings are stored directly in server-side <code>user-db.json</code>. ClimaCast utilizes this regional context to resolve precise hyper-local weather predictions from postal ZIP and PIN codes similar to WTTR.in.
                      </p>
                      {profileLastUpdated && (
                        <p className="text-[11px] text-blue-600 dark:text-blue-400 font-mono pt-1">
                          Last synchronized: {new Date(profileLastUpdated).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Country and State Selection */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
                    <span>Geographic Boundary Parameters</span>
                    <span className="text-xs font-normal text-slate-500">Persisted in user-db.json</span>
                  </h3>

                  {/* Country Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Country
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <select
                        value={profileCountry}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProfileCountry(val);
                          const codeMap: Record<string, string> = {
                            'United States': 'US',
                            'India': 'IN',
                            'United Kingdom': 'GB',
                            'Canada': 'CA',
                            'Australia': 'AU',
                            'Germany': 'DE',
                            'France': 'FR',
                            'Japan': 'JP',
                            'Spain': 'ES',
                            'Italy': 'IT',
                            'Brazil': 'BR',
                            'Mexico': 'MX',
                          };
                          if (codeMap[val]) {
                            setProfileCountryCode(codeMap[val]);
                          }
                          // Set sensible state defaults
                          if (val === 'United States' && !profileState) setProfileState('California');
                          if (val === 'India' && !profileState) setProfileState('Karnataka');
                          if (val === 'United Kingdom' && !profileState) setProfileState('England');
                          if (val === 'Canada' && !profileState) setProfileState('Ontario');
                        }}
                        className="sm:col-span-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="United States">United States (US)</option>
                        <option value="India">India (IN)</option>
                        <option value="United Kingdom">United Kingdom (GB)</option>
                        <option value="Canada">Canada (CA)</option>
                        <option value="Australia">Australia (AU)</option>
                        <option value="Germany">Germany (DE)</option>
                        <option value="France">France (FR)</option>
                        <option value="Japan">Japan (JP)</option>
                        <option value="Spain">Spain (ES)</option>
                        <option value="Italy">Italy (IT)</option>
                        <option value="Brazil">Brazil (BR)</option>
                        <option value="Mexico">Mexico (MX)</option>
                        <option value="Other">Other / Custom</option>
                      </select>

                      <input
                        type="text"
                        value={profileCountryCode}
                        onChange={(e) => setProfileCountryCode(e.target.value.toUpperCase())}
                        maxLength={3}
                        placeholder="ISO (e.g. US)"
                        className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-center uppercase font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  {/* State / Province Field with Quick Suggestions */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        State / Province / Territory
                      </label>
                      <span className="text-[11px] text-slate-400">Required for accurate PIN disambiguation</span>
                    </div>
                    <input
                      type="text"
                      value={profileState}
                      onChange={(e) => setProfileState(e.target.value)}
                      placeholder="e.g. California, Karnataka, Ontario, England, New York..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />

                    {/* Common Suggestions */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[11px] text-slate-400">Suggestions:</span>
                      {(profileCountry === 'India'
                        ? ['Karnataka', 'Maharashtra', 'Delhi', 'Tamil Nadu', 'Telangana', 'Gujarat', 'West Bengal']
                        : profileCountry === 'United Kingdom'
                        ? ['England', 'Scotland', 'Wales', 'Northern Ireland', 'Greater London']
                        : profileCountry === 'Canada'
                        ? ['Ontario', 'Quebec', 'British Columbia', 'Alberta']
                        : ['California', 'New York', 'Texas', 'Florida', 'Washington', 'Illinois', 'Colorado']
                      ).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setProfileState(st)}
                          className={`px-2 py-0.5 rounded-md text-[11px] transition ${
                            profileState.toLowerCase() === st.toLowerCase()
                              ? 'bg-blue-600 text-white font-semibold'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* District / City Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        District / County (Optional)
                      </label>
                      <input
                        type="text"
                        value={profileDistrict}
                        onChange={(e) => setProfileDistrict(e.target.value)}
                        placeholder="e.g. San Francisco County, Bengaluru Urban"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        City / Locality
                      </label>
                      <input
                        type="text"
                        value={profileCity}
                        onChange={(e) => setProfileCity(e.target.value)}
                        placeholder="e.g. San Francisco, Bengaluru, London"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  {/* Default ZIP / PIN Code */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Default ZIP or PIN Code
                      </label>
                      <span className="text-[11px] text-slate-400">Used as default precision seed</span>
                    </div>
                    <div className="relative">
                      <Compass className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={profileZipPin}
                        onChange={(e) => setProfileZipPin(e.target.value)}
                        placeholder="e.g. 94103, 560001, 10001, SW1A 1AA..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                      <div>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          Auto-resolve Postal Codes in Main Search
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Automatically query postal resolution when a 5-6 digit PIN or ZIP is entered in top search bar
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={profileAutoResolve}
                        onChange={(e) => setProfileAutoResolve(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                      <div>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          WTTR.in High Precision Mode
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Fetch WTTR.in format=j1 meteorological matrices for instant verification
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={profileWttrMode}
                        onChange={(e) => setProfileWttrMode(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </label>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={profileSaveStatus === 'saving'}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition"
                    >
                      {profileSaveStatus === 'saving' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : profileSaveStatus === 'saved' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                      ) : (
                        <Database className="h-4 w-4" />
                      )}
                      <span>
                        {profileSaveStatus === 'saving'
                          ? 'Saving to user-db.json...'
                          : profileSaveStatus === 'saved'
                          ? 'Saved to user-db.json!'
                          : 'Save to user-db.json'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestPrediction}
                      disabled={profileTestStatus === 'testing' || !profileZipPin.trim()}
                      className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition"
                    >
                      {profileTestStatus === 'testing' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Compass className="h-3.5 w-3.5 text-blue-500" />
                      )}
                      <span>Test WTTR.in Prediction</span>
                    </button>
                  </div>

                  {/* Test Prediction Result Notice */}
                  {testResultSummary && (
                    <div
                      className={`p-3 rounded-xl border text-xs animate-in fade-in duration-150 ${
                        profileTestStatus === 'success'
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/60 dark:text-emerald-300'
                          : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-900/60 dark:text-red-300'
                      }`}
                    >
                      <div className="font-semibold mb-0.5">
                        {profileTestStatus === 'success' ? 'Prediction Test Succeeded' : 'Prediction Test Failed'}
                      </div>
                      <p className="font-mono text-[11px] leading-relaxed">{testResultSummary}</p>
                    </div>
                  )}

                  {/* Saved PINs in user-db.json */}
                  {savedPinsList.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Saved Postal Codes in user-db.json ({savedPinsList.length})
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {savedPinsList.map((p) => (
                          <div
                            key={p.code}
                            className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded">
                                {p.code}
                              </span>
                              <span className="truncate text-slate-700 dark:text-slate-200">
                                {p.name}, {p.state || p.country}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteSavedPin(p.code)}
                              title="Delete from user-db.json"
                              className="text-slate-400 hover:text-red-500 p-1 rounded"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'database' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Information Banner */}
                <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/50 p-4 border border-blue-100 dark:from-blue-950/30 dark:to-indigo-950/20 dark:border-blue-900/50">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                      <Database className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold text-blue-950 dark:text-blue-200 uppercase tracking-wide">
                          SQLite Database Engine
                        </h4>
                        <span
                          className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                            platformView === 'web'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                          }`}
                        >
                          {platformView === 'web'
                            ? 'Web Exclusive • Active'
                            : `Bypassed (${platformView.toUpperCase()} Mode)`}
                        </span>
                      </div>
                      <p className="text-xs text-blue-900/80 dark:text-blue-300/90 leading-relaxed">
                        SQLite persistence is <strong>exclusive to the Web version</strong>. The application uses a 3-tier persistence strategy: <strong>.env</strong> is the default fallback for essential host and API keys; <strong>user-db.json</strong> and <strong>db.json</strong> temporarily maintain user details with unique user and machine node IDs; and the <strong>SQLite DB</strong> (<code>climacast.sqlite</code>) durably records all configuration, dispatches, and logs.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Storage Hierarchy Architecture */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
                    Storage Architecture & Fallback Flow
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">1. .env (Default)</h4>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        Default fallback with all essential variables required to host and run smoothly (keys, tokens, IDs).
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">2. JSON Files</h4>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        Maintains user profile and locations temporarily in <code>user-db.json</code> &amp; <code>db.json</code>.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">3. SQLite (Web Only)</h4>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        Durable relational store. Bypassed in mobile/extension mode in favor of client cache.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Database Metrics & Sync */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      SQLite Table Metrics
                    </h3>
                    <button
                      type="button"
                      onClick={triggerSqliteSync}
                      disabled={isSqliteLoading || platformView !== 'web'}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-xs cursor-pointer"
                    >
                      {isSqliteLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Database className="h-3.5 w-3.5" />
                      )}
                      <span>Sync to SQLite</span>
                    </button>
                  </div>

                  {sqliteSyncResult && (
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 text-xs border border-blue-200/80 dark:border-blue-800/80">
                      {sqliteSyncResult}
                    </div>
                  )}

                  {platformView !== 'web' ? (
                    <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-200 text-xs space-y-1">
                      <p className="font-bold">SQLite is inactive for {platformView.toUpperCase()} mode.</p>
                      <p>As per requirements, SQLite is exclusive to the web version. Mobile and extension layouts use local storage to ensure offline independence.</p>
                    </div>
                  ) : isSqliteLoading && !sqliteStatus ? (
                    <div className="flex items-center justify-center p-6 text-slate-400">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      <span>Reading SQLite tables...</span>
                    </div>
                  ) : sqliteStatus?.stats ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Object.entries(sqliteStatus.stats.counts || {}).map(([table, count]) => (
                        <div
                          key={table}
                          className="p-3 rounded-xl border border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-800/60"
                        >
                          <div className="text-[10px] uppercase font-mono text-slate-400 tracking-wider truncate" title={table}>
                            {table.replace(/_/g, ' ')}
                          </div>
                          <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                            {String(count)} <span className="text-[10px] font-normal text-slate-400">records</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-50 text-slate-500 text-xs dark:bg-slate-800">
                      Click "Sync to SQLite" to inspect or synchronize web database records.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="rounded-2xl bg-blue-50/80 p-4 border border-blue-100 dark:bg-blue-950/30 dark:border-blue-900/50">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wide">
                        AI Meteorological Intelligence Engine
                      </h4>
                      <p className="mt-1 text-xs text-blue-800/90 dark:text-blue-300 leading-relaxed">
                        ClimaCast utilizes Gemini AI models on the server to analyze pressure gradients, UV exposure, and precipitation likelihood to generate the <strong>Tip of the Day</strong> and executive clothing/health advice. If your key is unconfigured or hits rate limits, our built-in <strong>Meteorological Synthesis Engine</strong> seamlessly provides algorithmic advice so you are never left without guidance.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
                    Select AI Provider
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'gemini', label: 'Google Gemini', desc: 'Default Engine' },
                      { id: 'openai', label: 'OpenAI (BYOK)', desc: 'GPT-4o & Mini' },
                      { id: 'anthropic', label: 'Anthropic (BYOK)', desc: 'Claude 3.5 Sonnet' },
                      { id: 'openrouter', label: 'OpenRouter (BYOK)', desc: 'Universal Gateway' },
                    ].map((provider) => (
                      <button
                        key={provider.id}
                        onClick={() => saveAiProvider(provider.id as any)}
                        className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between gap-1 ${
                          aiProvider === provider.id
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:border-blue-400'
                        }`}
                      >
                        <span className="text-xs font-bold">{provider.label}</span>
                        <span className={`text-[10px] ${aiProvider === provider.id ? 'text-blue-100' : 'text-slate-400'}`}>
                          {provider.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-1">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      API Key Credentials
                    </h3>
                    {isServerSyncing && (
                      <span className="inline-flex items-center text-[10px] text-blue-500 font-medium">
                        <Loader2 className="h-3 w-3 animate-spin mr-1" /> Syncing to server vault...
                      </span>
                    )}
                  </div>
                  
                  {aiProvider === 'gemini' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <span>Gemini API Key</span>
                          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-normal text-slate-500">
                            Recommended
                          </span>
                        </label>
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          <span>Get Free Key</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <div className="relative">
                        <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="password"
                          value={geminiKey}
                          onChange={(e) => saveKey('gw_gemini_key', e.target.value, setGeminiKey)}
                          placeholder="AIzaSy..."
                          className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Leave blank to automatically use the server-injected secret or built-in heuristic synthesis.
                      </p>
                    </div>
                  )}
                  
                  {aiProvider === 'openai' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">OpenAI API Key</label>
                        <a
                          href="https://platform.openai.com/api-keys"
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          <span>OpenAI Platform</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <div className="relative">
                        <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="password"
                          value={openaiKey}
                          onChange={(e) => saveKey('gw_openai_key', e.target.value, setOpenaiKey)}
                          placeholder="sk-..."
                          className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {aiProvider === 'anthropic' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Anthropic API Key</label>
                        <a
                          href="https://console.anthropic.com/settings/keys"
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          <span>Anthropic Console</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <div className="relative">
                        <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="password"
                          value={anthropicKey}
                          onChange={(e) => saveKey('gw_anthropic_key', e.target.value, setAnthropicKey)}
                          placeholder="sk-ant-..."
                          className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {aiProvider === 'openrouter' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">OpenRouter API Key</label>
                        <a
                          href="https://openrouter.ai/keys"
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          <span>OpenRouter Keys</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <div className="relative">
                        <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="password"
                          value={openrouterKey}
                          onChange={(e) => saveKey('gw_openrouter_key', e.target.value, setOpenrouterKey)}
                          placeholder="sk-or-v1-..."
                          className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'weather' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Zero-Key Built-in Services Banner */}
                <div className="rounded-2xl bg-emerald-50/70 p-4 border border-emerald-200/80 dark:bg-emerald-950/20 dark:border-emerald-900/50">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wide">
                        Core Built-In Services (100% Free & Keyless)
                      </h4>
                      <p className="text-xs text-emerald-800/90 dark:text-emerald-300 leading-relaxed">
                        ClimaCast is engineered for zero setup friction. The following planetary services are pre-integrated and require <strong>no API keys or accounts</strong>:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] text-emerald-900 dark:text-emerald-300">
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span><strong>Open-Meteo:</strong> Global Forecasts & Past Trends</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span><strong>Windy Global:</strong> Live Doppler & Satellite Radar</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span><strong>RainViewer:</strong> Classic Doppler Loop Frames</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span><strong>Google Earth / Street View:</strong> 3D Orbital Explorer</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Optional Key 1: PurpleAir */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span>HyperLocal Air Quality (PurpleAir)</span>
                        <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          Optional
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Reads decentralized laser particle sensors in nearby neighborhoods.
                      </p>
                    </div>
                    <a
                      href="https://develop.purpleair.com"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      <span>Get Read Key</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">PurpleAir Read API Key</label>
                    <div className="relative">
                      <Activity className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="password"
                        value={purpleAirKey}
                        onChange={(e) => saveKey('gw_purpleair_key', e.target.value, setPurpleAirKey)}
                        placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Only required when switching the AQI card from <em>Default (Open-Meteo)</em> to <em>HyperLocal</em>.
                    </p>
                  </div>
                </div>

                {/* Optional Key 2: OpenWeatherMap */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span>OpenWeatherMap HD Radar Tiles</span>
                        <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          Optional
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        High-resolution radar and cloud tile layers in the Classic Leaflet map view.
                      </p>
                    </div>
                    <a
                      href="https://openweathermap.org/api"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      <span>Get Free Key</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">OpenWeatherMap API Key</label>
                      {radarKeyStatus === 'validating' && (
                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" /> Verifying...
                        </span>
                      )}
                      {radarKeyStatus === 'valid' && (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Valid Active Key
                        </span>
                      )}
                      {radarKeyStatus === 'invalid' && (
                        <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Invalid Key
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <MapIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input 
                        type="password" 
                        value={radarMapKey} 
                        onChange={(e) => saveKey('gw_radar_api_key', e.target.value, setRadarMapKey)} 
                        placeholder="OpenWeather 32-character hex key..." 
                        className={`w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-mono ${
                          radarKeyStatus === 'valid'
                            ? 'border-emerald-500/50 focus:ring-emerald-500'
                            : radarKeyStatus === 'invalid'
                            ? 'border-rose-500/50 focus:ring-rose-500'
                            : 'border-slate-200 dark:border-slate-700'
                        }`} 
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Not needed for the primary Windy Global radar or RainViewer Doppler loops.
                    </p>
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

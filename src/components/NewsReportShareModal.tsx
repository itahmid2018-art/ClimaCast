/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Share2,
  Newspaper,
  Radio,
  Tv,
  AlertTriangle,
  Send,
  MessageSquare,
  Mail,
  Copy,
  Check,
  Phone,
  Smartphone,
  Sparkles,
  Download,
  ExternalLink,
  ShieldCheck,
  Info,
  RefreshCw,
} from 'lucide-react';
import { ProcessedWeather, TemperatureUnit } from '../types';
import {
  formatWeatherNewsReport,
  NewsReportStyle,
  getWhatsAppShareUrl,
  getEmailShareUrl,
  getSmsShareUrl,
  getTelegramShareUrl,
} from '../utils/newsReportFormatter';

interface NewsReportShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  weather: ProcessedWeather;
  unit: TemperatureUnit;
}

type ShareChannel = 'whatsapp' | 'twilio' | 'email' | 'device';

export const NewsReportShareModal: React.FC<NewsReportShareModalProps> = ({
  isOpen,
  onClose,
  weather,
  unit,
}) => {
  const [activeChannel, setActiveChannel] = useState<ShareChannel>('whatsapp');
  const [style, setStyle] = useState<NewsReportStyle>('tv_broadcast');
  const [anchorName, setAnchorName] = useState<string>('Chief Meteorologist');
  const [recipientName, setRecipientName] = useState<string>('');
  const [customNote, setCustomNote] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [isEditingReport, setIsEditingReport] = useState<boolean>(false);
  const [customReportText, setCustomReportText] = useState<string>('');

  // Status and Twilio API states
  const [copied, setCopied] = useState<boolean>(false);
  const [isSendingTwilio, setIsSendingTwilio] = useState<boolean>(false);
  const [twilioStatus, setTwilioStatus] = useState<{
    configured: boolean;
    fromPhoneMasked: string | null;
  } | null>(null);
  const [twilioResult, setTwilioResult] = useState<{
    success: boolean;
    message?: string;
    sid?: string;
    error?: string;
    hint?: string;
  } | null>(null);

  // Check Twilio backend configuration on mount
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/share/status')
      .then((res) => res.json())
      .then((data) => {
        setTwilioStatus({
          configured: Boolean(data.twilioConfigured),
          fromPhoneMasked: data.fromPhoneMasked || null,
        });
      })
      .catch((err) => {
        console.warn('Could not fetch share status:', err);
        setTwilioStatus({ configured: false, fromPhoneMasked: null });
      });
  }, [isOpen]);

  // Generate the formatted news report based on current settings
  const generatedReport = useMemo(() => {
    return formatWeatherNewsReport(weather, unit, {
      style,
      anchorName,
      recipientName,
      customNote,
    });
  }, [weather, unit, style, anchorName, recipientName, customNote]);

  // Update custom report text when generated report changes, unless actively user-edited
  useEffect(() => {
    if (!isEditingReport) {
      setCustomReportText(generatedReport.fullFormattedReport);
    }
  }, [generatedReport, isEditingReport]);

  // Keyboard escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentReportText = isEditingReport ? customReportText : generatedReport.fullFormattedReport;

  // Handle Clipboard Copy
  const handleCopy = () => {
    navigator.clipboard.writeText(currentReportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Handle WhatsApp Dispatch
  const handleWhatsAppShare = () => {
    const url = getWhatsAppShareUrl(currentReportText, recipientPhone);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Handle Email Dispatch
  const handleEmailShare = () => {
    const url = getEmailShareUrl(generatedReport.headline, currentReportText, recipientEmail);
    window.location.href = url;
  };

  // Handle Native SMS Dispatch (via device)
  const handleNativeSmsShare = () => {
    const textToSend = activeChannel === 'twilio' ? generatedReport.smsVersion : currentReportText;
    const url = getSmsShareUrl(textToSend, recipientPhone);
    window.location.href = url;
  };

  // Handle Twilio SMS API Dispatch
  const handleTwilioSend = async () => {
    if (!recipientPhone.trim()) {
      setTwilioResult({
        success: false,
        error: 'Please specify a recipient phone number with country code (e.g. +15551234567).',
      });
      return;
    }

    setIsSendingTwilio(true);
    setTwilioResult(null);

    try {
      const response = await fetch('/api/share/twilio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientPhone.trim(),
          message: generatedReport.smsVersion,
          headline: generatedReport.headline,
          location: weather.location.name,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTwilioResult({
          success: true,
          sid: data.sid,
          message: `News report SMS dispatched successfully! (Twilio SID: ${data.sid})`,
        });
      } else {
        setTwilioResult({
          success: false,
          error: data.error || 'Failed to dispatch via Twilio.',
          hint: data.hint,
        });
      }
    } catch (err: any) {
      setTwilioResult({
        success: false,
        error: err.message || 'Network error while contacting Twilio dispatch endpoint.',
      });
    } finally {
      setIsSendingTwilio(false);
    }
  };

  // Handle Web Share API (native sheet)
  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: generatedReport.headline,
          text: currentReportText,
          url: window.location.href,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Share error:', err);
        }
      }
    } else {
      handleCopy();
    }
  };

  // Handle File Download
  const handleDownloadDispatch = () => {
    const blob = new Blob([currentReportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `weather-news-dispatch-${weather.location.name.toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="news-report-share-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="news-report-share-modal"
        className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 dark:bg-slate-900 dark:ring-white/10 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white dark:from-slate-800/80 dark:via-slate-800/50 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Newspaper className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Share Weather as News Report
                </h2>
                <span className="rounded-full bg-blue-100 dark:bg-blue-950 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                  Meteorology Press Wire
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dispatch an authentic broadcast weather news bulletin for {weather.location.name} across WhatsApp, Twilio, Email, and SMS.
              </p>
            </div>
          </div>

          <button
            id="close-news-share-modal-btn"
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
            title="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body: 2 Columns on Desktop */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Journalistic Customization & Channel Configuration (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Style Selector Tabs */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                1. Newsprint / Broadcast Archetype
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStyle('tv_broadcast')}
                  className={`flex items-center gap-2 rounded-xl p-2.5 text-left text-xs font-semibold transition border ${
                    style === 'tv_broadcast'
                      ? 'border-blue-500 bg-blue-50/80 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-600 shadow-xs'
                      : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-white dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300'
                  }`}
                >
                  <Tv className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div className="flex flex-col">
                    <span>TV Broadcast Desk</span>
                    <span className="text-[10px] font-normal opacity-75">Anchor lead-in & synoptics</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStyle('morning_chronicle')}
                  className={`flex items-center gap-2 rounded-xl p-2.5 text-left text-xs font-semibold transition border ${
                    style === 'morning_chronicle'
                      ? 'border-blue-500 bg-blue-50/80 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-600 shadow-xs'
                      : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-white dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300'
                  }`}
                >
                  <Newspaper className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                  <div className="flex flex-col">
                    <span>Daily Chronicle</span>
                    <span className="text-[10px] font-normal opacity-75">Classic newspaper byline</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStyle('radio_wire')}
                  className={`flex items-center gap-2 rounded-xl p-2.5 text-left text-xs font-semibold transition border ${
                    style === 'radio_wire'
                      ? 'border-blue-500 bg-blue-50/80 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-600 shadow-xs'
                      : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-white dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300'
                  }`}
                >
                  <Radio className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div className="flex flex-col">
                    <span>60s Radio Wire</span>
                    <span className="text-[10px] font-normal opacity-75">Drive-time concise summary</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStyle('breaking_bulletin')}
                  className={`flex items-center gap-2 rounded-xl p-2.5 text-left text-xs font-semibold transition border ${
                    style === 'breaking_bulletin'
                      ? 'border-amber-500 bg-amber-50/80 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-600 shadow-xs'
                      : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-white dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300'
                  }`}
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  <div className="flex flex-col">
                    <span>Breaking Alert</span>
                    <span className="text-[10px] font-normal opacity-75">Urgent advisory bulletin</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Customization Fields */}
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                2. Personalization & Sign-off
              </span>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Reporter / Anchor Name
                  </label>
                  <input
                    id="input-news-anchor-name"
                    type="text"
                    value={anchorName}
                    onChange={(e) => setAnchorName(e.target.value)}
                    placeholder="e.g. Chief Meteorologist"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Recipient Name (Optional)
                  </label>
                  <input
                    id="input-news-recipient-name"
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g. Mom, Alex, Team"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Personal Dispatch Note / Sign-off
                </label>
                <input
                  id="input-news-custom-note"
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="e.g. Carry an umbrella when we meet for dinner!"
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Sharing Channel Tabs */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                3. Choose Sharing Destination
              </label>

              <div className="flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveChannel('whatsapp')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                    activeChannel === 'whatsapp'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveChannel('twilio')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                    activeChannel === 'twilio'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>Twilio / SMS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveChannel('email')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                    activeChannel === 'email'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Email</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveChannel('device')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                    activeChannel === 'device'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>More</span>
                </button>
              </div>

              {/* Active Channel Action Pane */}
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-800/80 shadow-xs">
                {activeChannel === 'whatsapp' && (
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                        Recipient Phone (Optional)
                      </label>
                      <input
                        id="input-whatsapp-phone"
                        type="tel"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        placeholder="e.g. +1234567890 (leave blank to pick contact in WhatsApp)"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                        Include country code (e.g. +1 for US, +91 for India, +44 for UK).
                      </span>
                    </div>

                    <button
                      id="btn-share-whatsapp-action"
                      type="button"
                      onClick={handleWhatsAppShare}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700 transition active:scale-[0.99]"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Dispatch to WhatsApp</span>
                      <ExternalLink className="h-3.5 w-3.5 opacity-70 ml-1" />
                    </button>
                  </div>
                )}

                {activeChannel === 'twilio' && (
                  <div className="flex flex-col gap-3">
                    {/* Twilio Status Badge */}
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                      <div className="flex items-center gap-2">
                        <ShieldCheck
                          className={`h-4 w-4 ${
                            twilioStatus?.configured ? 'text-emerald-500' : 'text-amber-500'
                          }`}
                        />
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          Twilio SMS Engine:
                        </span>
                      </div>
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                          twilioStatus?.configured
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {twilioStatus?.configured
                          ? `Ready (${twilioStatus.fromPhoneMasked})`
                          : 'BYOK in Settings / Fallback Active'}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                        Recipient Mobile Number (with Country Code)
                      </label>
                      <input
                        id="input-twilio-phone"
                        type="tel"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        placeholder="e.g. +14155552671"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>

                    {/* Result alert if sent or error */}
                    {twilioResult && (
                      <div
                        className={`rounded-lg p-2.5 text-xs ${
                          twilioResult.success
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                        }`}
                      >
                        <p className="font-semibold">{twilioResult.message || twilioResult.error}</p>
                        {twilioResult.hint && (
                          <p className="text-[11px] opacity-80 mt-1">{twilioResult.hint}</p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        id="btn-twilio-api-send"
                        type="button"
                        onClick={handleTwilioSend}
                        disabled={isSendingTwilio}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        {isSendingTwilio ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        <span>{isSendingTwilio ? 'Dispatching...' : 'Send via Twilio API'}</span>
                      </button>

                      <button
                        id="btn-native-sms-send"
                        type="button"
                        onClick={handleNativeSmsShare}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                        title="Open device native SMS / iMessage app with pre-filled report"
                      >
                        <Smartphone className="h-3.5 w-3.5 text-blue-500" />
                        <span>Native Device SMS</span>
                      </button>
                    </div>
                  </div>
                )}

                {activeChannel === 'email' && (
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                        Recipient Email Address (Optional)
                      </label>
                      <input
                        id="input-news-email"
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="e.g. colleague@example.com"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>

                    <button
                      id="btn-share-email-action"
                      type="button"
                      onClick={handleEmailShare}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition active:scale-[0.99]"
                    >
                      <Mail className="h-4 w-4" />
                      <span>Open in Email App (Mailto)</span>
                      <ExternalLink className="h-3.5 w-3.5 opacity-70 ml-1" />
                    </button>
                  </div>
                )}

                {activeChannel === 'device' && (
                  <div className="flex flex-col gap-2">
                    <button
                      id="btn-share-device-native"
                      type="button"
                      onClick={handleWebShare}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 transition"
                    >
                      <Share2 className="h-4 w-4" />
                      <span>Open Device Share Sheet</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const url = getTelegramShareUrl(currentReportText);
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        <Send className="h-3.5 w-3.5 text-sky-500" />
                        <span>Telegram</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadDispatch}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-700 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        <Download className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Save .TXT</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Live Teleprompter / Newspaper Preview (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Live News Bulletin Teleprompter
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {currentReportText.length} characters
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingReport((prev) => !prev)}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {isEditingReport ? 'Reset Auto-Script' : 'Edit Script'}
                </button>
                <button
                  id="btn-copy-news-report"
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
                  title="Copy full news bulletin to clipboard"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Bulletin</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Authentic Newsprint / Teleprompter Display Box */}
            <div className="relative flex-1 rounded-xl border border-slate-200 bg-amber-50/20 p-4 font-mono text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200 shadow-inner overflow-hidden flex flex-col">
              {/* Paper header styling */}
              <div className="flex items-center justify-between border-b border-dashed border-slate-300/80 pb-2 mb-3 text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <span className="font-serif italic font-bold">CLIMACAST METEOROLOGICAL WIRE</span>
                <span>{generatedReport.timestamp}</span>
              </div>

              {isEditingReport ? (
                <textarea
                  id="textarea-custom-news-report"
                  value={customReportText}
                  onChange={(e) => setCustomReportText(e.target.value)}
                  rows={14}
                  className="w-full flex-1 rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white leading-relaxed resize-none"
                  placeholder="Type or modify your customized news script here..."
                />
              ) : (
                <div className="flex-1 overflow-y-auto whitespace-pre-wrap leading-relaxed pr-1 font-sans text-xs">
                  {currentReportText}
                </div>
              )}

              {/* Footer teleprompter bar */}
              <div className="mt-3 pt-2 border-t border-dashed border-slate-300/80 flex items-center justify-between text-[10px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <span>{generatedReport.byline}</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  Ready for Dispatch
                </span>
              </div>
            </div>

            {/* Quick SMS preview snippet */}
            <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-bold text-[10px] uppercase tracking-wider text-slate-500 block mb-0.5">
                Compact SMS / Twitter Segment (150 chars):
              </span>
              <p className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                {generatedReport.smsVersion}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Info className="h-3.5 w-3.5 text-blue-500" />
            <span>Weather telemetry sourced directly from regional meteorological radar.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800 transition"
            >
              Close
            </button>
            <button
              id="footer-share-now-btn"
              type="button"
              onClick={() => {
                if (activeChannel === 'whatsapp') handleWhatsAppShare();
                else if (activeChannel === 'twilio') handleTwilioSend();
                else if (activeChannel === 'email') handleEmailShare();
                else handleWebShare();
              }}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
            >
              <Send className="h-3.5 w-3.5" />
              <span>
                {activeChannel === 'whatsapp'
                  ? 'Send to WhatsApp'
                  : activeChannel === 'twilio'
                  ? 'Send SMS'
                  : activeChannel === 'email'
                  ? 'Send Email'
                  : 'Share Now'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

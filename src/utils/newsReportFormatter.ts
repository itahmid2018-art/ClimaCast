/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProcessedWeather, TemperatureUnit } from '../types';
import { getWeatherCondition } from './weatherCodes';

export type NewsReportStyle =
  | 'tv_broadcast'      // TV Anchor Broadcast Desk
  | 'morning_chronicle'  // Morning Newspaper Front Page
  | 'radio_wire'        // 60-Second Radio Drive-Time Wire
  | 'breaking_bulletin'; // Urgent Breaking Weather Alert

export interface NewsReportData {
  headline: string;
  leadStory: string;
  bulletinBody: string;
  fullFormattedReport: string;
  smsVersion: string;
  byline: string;
  timestamp: string;
  locationText: string;
  anchorDesk: string;
}

export interface NewsReportOptions {
  style?: NewsReportStyle;
  anchorName?: string;
  customNote?: string;
  recipientName?: string;
}

export function formatWeatherNewsReport(
  weather: ProcessedWeather,
  unit: TemperatureUnit,
  options: NewsReportOptions = {}
): NewsReportData {
  const { current, location, daily } = weather;
  const today = daily[0];
  const unitSymbol = unit === 'celsius' ? '°C' : '°F';
  const speedUnit = unit === 'celsius' ? 'km/h' : 'mph';
  const condition = getWeatherCondition(current.weatherCode, current.isDay);

  const style = options.style || 'tv_broadcast';
  const anchor = options.anchorName?.trim() || 'Chief Meteorologist';
  const recipient = options.recipientName?.trim();
  const customNote = options.customNote?.trim();

  const locationText = `${location.name}${location.admin1 ? `, ${location.admin1}` : ''}${
    location.country ? ` (${location.country})` : ''
  }`;

  const dateObj = new Date(current.time);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = dateObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const highTemp = today ? today.tempMax : Math.round(current.temperature + 4);
  const lowTemp = today ? today.tempMin : Math.round(current.temperature - 6);
  const rainChance = today ? today.precipitationProbabilityMax : 10;
  const uvIndex = current.uvIndex ?? (today ? today.uvIndexMax : 4);
  const aqi = weather.airQuality?.aqiUs;

  // Temperature sensation narrative
  const tempDiff = Math.round(current.apparentTemperature - current.temperature);
  const feelsLikeNarrative =
    tempDiff >= 3
      ? `humidity is elevating heat index to ${Math.round(current.apparentTemperature)}${unitSymbol}`
      : tempDiff <= -3
      ? `brisk wind chill drives perceived temperature down to ${Math.round(current.apparentTemperature)}${unitSymbol}`
      : `feels true-to-thermometer at ${Math.round(current.apparentTemperature)}${unitSymbol}`;

  let headline = '';
  let leadStory = '';
  let bulletinBody = '';
  let byline = `ClimaCast Meteorological Bureau • Dispatched by ${anchor}`;
  let anchorDesk = `ClimaCast Newsroom Desk • ${location.name}`;

  if (style === 'tv_broadcast') {
    headline = `🎙️ [LIVE BROADCAST] CLIMACAST METEOROLOGICAL DESK: ${location.name.toUpperCase()}`;
    leadStory = `"Good ${current.isDay ? 'day' : 'evening'}${recipient ? ` ${recipient}` : ''}. This is ${anchor} reporting live from the ClimaCast Newsroom with your regional weather bulletin for ${locationText}."`;
    
    bulletinBody = `${leadStory}

📡 TOP WEATHER STORY:
${location.name} is currently reporting ${condition.description.toLowerCase()} with the mercury steady at ${Math.round(current.temperature)}${unitSymbol} (${feelsLikeNarrative}).

📊 METEOROLOGICAL TELEMETRY:
• Current Temperature: ${Math.round(current.temperature)}${unitSymbol} (Feels like ${Math.round(current.apparentTemperature)}${unitSymbol})
• Today's Thermal Envelope: High of ${highTemp}${unitSymbol} / Overnight Low of ${lowTemp}${unitSymbol}
• Sky Condition: ${condition.description}
• Surface Winds: ${current.windSpeed} ${speedUnit}
• Relative Humidity: ${current.relativeHumidity}%
• Precipitation Probability: ${rainChance}%
• Solar UV Index: ${uvIndex}
${aqi ? `• Air Quality Index: ${aqi} (${weather.airQuality?.qualityLevel || 'Good'})` : ''}
${today ? `• Astronomical Horizon: Sunrise at ${today.sunrise} | Sunset at ${today.sunset}` : ''}

🗓️ 3-DAY SYNOPTIC PROJECTION:
${daily.slice(0, 3).map((d) => `  - ${new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })}: High ${d.tempMax}${unitSymbol} / Low ${d.tempMin}${unitSymbol}, ${d.precipitationProbabilityMax}% precip`).join('\n')}

💡 CHIEF METEOROLOGIST ADVISORY:
${rainChance > 40 ? '⚠️ Keep rain gear within reach as precipitation bands move through the corridor.' : '✅ Favorable weather conditions dominate. Ideal for travel and outdoor activities.'}
${customNote ? `\n📝 SPECIAL DISPATCH NOTE:\n"${customNote}"` : ''}

Sign-off: "Reporting for ClimaCast News Desk. Stay weather-aware, ${location.name}."`;

  } else if (style === 'morning_chronicle') {
    headline = `📰 THE DAILY WEATHER CHRONICLE • ${location.name.toUpperCase()} EDITION`;
    leadStory = `DATELINE ${location.name.toUpperCase()} — ${formattedDate} (${formattedTime}). Atmospheric telemetry gathered from regional radar sensors.`;

    bulletinBody = `${headline}
${leadStory}
Byline: ${anchor}, Senior Meteorologist

SUMMARY DISPATCH:
${recipient ? `For: ${recipient}\n` : ''}Residents across ${locationText} awaken to ${condition.description.toLowerCase()} conditions, with current readings sitting at ${Math.round(current.temperature)}${unitSymbol}.

THERMAL & BAROMETRIC DATA:
• Current: ${Math.round(current.temperature)}${unitSymbol} | Sensation: ${Math.round(current.apparentTemperature)}${unitSymbol}
• Day Span: Expected crest of ${highTemp}${unitSymbol} dipping to ${lowTemp}${unitSymbol} tonight
• Wind: ${current.windSpeed} ${speedUnit} | Humidity: ${current.relativeHumidity}%
• Precip Risk: ${rainChance}% | UV Factor: ${uvIndex}
${aqi ? `• Air Quality: US AQI ${aqi} (${weather.airQuality?.qualityLevel || 'Good'})` : ''}

EXTENDED OUTLOOK:
${daily.slice(1, 4).map((d) => `• ${new Date(d.date).toLocaleDateString('en-US', { weekday: 'long' })}: ${d.tempMax}${unitSymbol} / ${d.tempMin}${unitSymbol} (${d.precipitationProbabilityMax}% precip chance)`).join('\n')}
${customNote ? `\nSPECIAL MEMO: ${customNote}` : ''}

Printed & Distributed via ClimaCast Multi-Platform Network.`;

  } else if (style === 'radio_wire') {
    headline = `📻 CLIMACAST 60-SECOND RADIO WEATHER WIRE • ${location.name.toUpperCase()}`;
    leadStory = `Radio traffic & weather on the eights. Here is your fast meteorological brief for ${location.name}.`;

    bulletinBody = `[RADIO WEATHER ON THE EIGHTS]
📻 Location: ${locationText}
⏰ As of ${formattedTime}, ${formattedDate}
${recipient ? `Hey ${recipient}! ` : ''}Right now in ${location.name}: ${Math.round(current.temperature)}${unitSymbol}, ${condition.description}.
High today topping out at ${highTemp}${unitSymbol}, low around ${lowTemp}${unitSymbol}.
Winds blowing at ${current.windSpeed} ${speedUnit}, rain probability: ${rainChance}%.
${aqi ? `Air Quality: AQI ${aqi}. ` : ''}${customNote ? `Personal note: "${customNote}". ` : ''}That's your 60-second ClimaCast update. Drive safe!`;

  } else {
    // breaking_bulletin
    headline = `⚡ BREAKING WEATHER ALERT • METEOROLOGICAL DISPATCH: ${location.name.toUpperCase()}`;
    leadStory = `URGENT BULLETIN: Atmospheric telemetry update for ${locationText} at ${formattedTime}.`;

    bulletinBody = `🚨 CLIMACAST BREAKING WEATHER BULLETIN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Location: ${locationText}
⏱️ Broadcast: ${formattedDate} at ${formattedTime}
${recipient ? `👤 Addressed to: ${recipient}\n` : ''}
⚡ CURRENT CONDITIONS:
• Status: ${condition.description.toUpperCase()}
• Temperature: ${Math.round(current.temperature)}${unitSymbol} (Feels like ${Math.round(current.apparentTemperature)}${unitSymbol})
• Expected High / Low: ${highTemp}${unitSymbol} / ${lowTemp}${unitSymbol}
• Wind: ${current.windSpeed} ${speedUnit} | Rain Probability: ${rainChance}%
• Sun UV: ${uvIndex} | Air Quality AQI: ${aqi ?? 'Nominal'}

⚠️ ADVISORY:
${rainChance > 35 ? 'Precipitation expected. Exercise precaution during commute.' : 'No severe meteorological anomalies reported in immediate zone.'}
${customNote ? `\n📌 NOTE: "${customNote}"\n` : ''}
Source: ClimaCast Global Meteorological Wire`;
  }

  // Compact SMS version (under 280 chars to fit standard mobile SMS / Twilio segment limits)
  const smsVersion = `📰 WEATHER NEWS [${location.name}]: ${Math.round(current.temperature)}${unitSymbol}, ${condition.description}. High ${highTemp}${unitSymbol}/Low ${lowTemp}${unitSymbol}. Rain ${rainChance}%, Wind ${current.windSpeed}${speedUnit}.${customNote ? ` Note: "${customNote}".` : ''} - ClimaCast News Desk`;

  const fullFormattedReport = `${headline}
${bulletinBody}

🔗 Live Interactive Radar & Map: https://ais-pre-2j5vkz47k6lszvoh3n7nws-1038819846954.asia-southeast1.run.app`;

  return {
    headline,
    leadStory,
    bulletinBody,
    fullFormattedReport,
    smsVersion,
    byline,
    timestamp: `${formattedDate} • ${formattedTime}`,
    locationText,
    anchorDesk,
  };
}

/**
 * Generates WhatsApp click-to-chat URL with pre-filled news report text
 */
export function getWhatsAppShareUrl(text: string, phone?: string): string {
  const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
  const encodedText = encodeURIComponent(text);
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  return `https://api.whatsapp.com/send?text=${encodedText}`;
}

/**
 * Generates Email mailto URL with pre-filled subject and news report body
 */
export function getEmailShareUrl(subject: string, body: string, email?: string): string {
  const cleanEmail = email?.trim() || '';
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  return `mailto:${cleanEmail}?subject=${encodedSubject}&body=${encodedBody}`;
}

/**
 * Generates Native SMS URL with pre-filled news report text
 */
export function getSmsShareUrl(body: string, phone?: string): string {
  const cleanPhone = phone ? phone.trim() : '';
  const encodedBody = encodeURIComponent(body);
  // Support both iOS and Android sms scheme
  if (cleanPhone) {
    return `sms:${cleanPhone}?body=${encodedBody}`;
  }
  return `sms:?body=${encodedBody}`;
}

/**
 * Generates Telegram share URL
 */
export function getTelegramShareUrl(text: string): string {
  const encodedText = encodeURIComponent(text);
  return `https://t.me/share/url?url=&text=${encodedText}`;
}

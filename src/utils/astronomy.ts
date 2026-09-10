/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MoonPhaseCode, MoonPhaseInfo } from '../types';

export type { MoonPhaseCode, MoonPhaseInfo };

// Synodic lunar month duration in days
const SYNODIC_MONTH = 29.53058867;
// Reference Known New Moon: Jan 6, 2000, 18:14 UTC
const REF_NEW_MOON_UTC = new Date('2000-01-06T18:14:00Z').getTime();
const MS_PER_DAY = 86400000;

/**
 * Calculates high-accuracy astronomical lunar phase and illumination for any given date.
 */
export function calculateMoonPhase(inputDate: Date | string = new Date()): MoonPhaseInfo {
  const date = typeof inputDate === 'string' ? new Date(inputDate) : inputDate;
  const time = isNaN(date.getTime()) ? Date.now() : date.getTime();

  // Days elapsed since anchor new moon
  const diffDays = (time - REF_NEW_MOON_UTC) / MS_PER_DAY;
  // Normalized lunar age within the synodic month (0 <= age < 29.53058867)
  const age = ((diffDays % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
  const fraction = age / SYNODIC_MONTH;

  // Illumination percentage based on lunar phase angle approximation
  const illumination = Math.round((0.5 * (1 - Math.cos(2 * Math.PI * fraction))) * 100);
  const isWaxing = fraction < 0.5;

  let code: MoonPhaseCode = 'new_moon';
  let name = 'New Moon';
  let description = 'Moon is positioned between Earth and the Sun, unilluminated to observers.';

  // Standard astronomical classification intervals centered on primary phases
  if (fraction < 0.03 || fraction >= 0.97) {
    code = 'new_moon';
    name = 'New Moon';
    description = 'Dark disk with minimal to zero visible illumination; ideal for stargazing.';
  } else if (fraction < 0.22) {
    code = 'waxing_crescent';
    name = 'Waxing Crescent';
    description = 'Slender crescent growing brighter in the western evening twilight.';
  } else if (fraction < 0.28) {
    code = 'first_quarter';
    name = 'First Quarter';
    description = 'Right half of the lunar disk is illuminated; high in southern sky at sunset.';
  } else if (fraction < 0.47) {
    code = 'waxing_gibbous';
    name = 'Waxing Gibbous';
    description = 'More than half illuminated and waxing toward a full lunar disk.';
  } else if (fraction < 0.53) {
    code = 'full_moon';
    name = 'Full Moon';
    description = 'Completely illuminated disk rising at sunset and visible throughout the night.';
  } else if (fraction < 0.72) {
    code = 'waning_gibbous';
    name = 'Waning Gibbous';
    description = 'More than half illuminated but shrinking toward the third quarter.';
  } else if (fraction < 0.78) {
    code = 'last_quarter';
    name = 'Last Quarter';
    description = 'Left half illuminated; rises around midnight and visible in morning skies.';
  } else {
    code = 'waning_crescent';
    name = 'Waning Crescent';
    description = 'Fading silver crescent visible in the eastern sky just before sunrise.';
  }

  // Calculate days remaining until next major primary phase
  let nextPhaseName = 'New Moon';
  let daysToNext = 0;

  if (fraction < 0.25) {
    nextPhaseName = 'First Quarter';
    daysToNext = (0.25 - fraction) * SYNODIC_MONTH;
  } else if (fraction < 0.50) {
    nextPhaseName = 'Full Moon';
    daysToNext = (0.50 - fraction) * SYNODIC_MONTH;
  } else if (fraction < 0.75) {
    nextPhaseName = 'Last Quarter';
    daysToNext = (0.75 - fraction) * SYNODIC_MONTH;
  } else {
    nextPhaseName = 'New Moon';
    daysToNext = (1.0 - fraction) * SYNODIC_MONTH;
  }

  return {
    code,
    name,
    ageDays: Math.round(age * 10) / 10,
    illumination,
    fraction: Math.round(fraction * 1000) / 1000,
    isWaxing,
    nextMajorPhase: {
      name: nextPhaseName,
      daysRemaining: Math.max(1, Math.round(daysToNext)),
    },
    description,
  };
}

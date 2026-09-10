/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MoonPhaseCode } from '../utils/astronomy';

interface MoonPhaseIconProps {
  phase: MoonPhaseCode;
  className?: string;
}

export const MoonPhaseIcon: React.FC<MoonPhaseIconProps> = ({
  phase,
  className = 'h-4 w-4',
}) => {
  const baseDiscDark = 'fill-slate-800 dark:fill-slate-900 stroke-slate-400/40';
  const litBright = 'fill-amber-300 dark:fill-amber-200';
  const litFull = 'fill-amber-300 dark:fill-amber-100';

  switch (phase) {
    case 'new_moon':
      return (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="9.5"
            className="fill-slate-700/80 stroke-slate-400/50 dark:fill-slate-900 dark:stroke-slate-600"
            strokeWidth="1.5"
          />
          {/* Subtle starry dots on the dark silhouette */}
          <circle cx="9" cy="8" r="0.75" className="fill-slate-500/50" />
          <circle cx="15" cy="14" r="0.6" className="fill-slate-500/50" />
        </svg>
      );

    case 'waxing_crescent':
      return (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9.5" className={baseDiscDark} strokeWidth="1" />
          {/* Right-side glowing crescent */}
          <path
            d="M12 2.5 A9.5 9.5 0 0 1 12 21.5 A6.5 9.5 0 0 0 12 2.5 Z"
            className={litBright}
          />
        </svg>
      );

    case 'first_quarter':
      return (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9.5" className={baseDiscDark} strokeWidth="1" />
          {/* Exact right hemisphere illuminated */}
          <path
            d="M12 2.5 A9.5 9.5 0 0 1 12 21.5 Z"
            className={litBright}
          />
        </svg>
      );

    case 'waxing_gibbous':
      return (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Full lit base with left crescent shadow */}
          <circle cx="12" cy="12" r="9.5" className={litBright} />
          <path
            d="M12 2.5 A9.5 9.5 0 0 0 12 21.5 A5 9.5 0 0 1 12 2.5 Z"
            className={baseDiscDark}
            strokeWidth="0.5"
          />
        </svg>
      );

    case 'full_moon':
      return (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="9.5"
            className={`${litFull} stroke-amber-400/60`}
            strokeWidth="1"
          />
          {/* Lunar maria crater textures */}
          <circle cx="8" cy="9" r="1.5" className="fill-amber-400/30" />
          <circle cx="15" cy="8" r="1.2" className="fill-amber-400/30" />
          <circle cx="13" cy="14" r="2.2" className="fill-amber-400/25" />
          <circle cx="9" cy="15" r="1" className="fill-amber-400/25" />
        </svg>
      );

    case 'waning_gibbous':
      return (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Full lit base with right crescent shadow */}
          <circle cx="12" cy="12" r="9.5" className={litBright} />
          <path
            d="M12 2.5 A9.5 9.5 0 0 1 12 21.5 A5 9.5 0 0 0 12 2.5 Z"
            className={baseDiscDark}
            strokeWidth="0.5"
          />
        </svg>
      );

    case 'last_quarter':
      return (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9.5" className={baseDiscDark} strokeWidth="1" />
          {/* Exact left hemisphere illuminated */}
          <path
            d="M12 2.5 A9.5 9.5 0 0 0 12 21.5 Z"
            className={litBright}
          />
        </svg>
      );

    case 'waning_crescent':
    default:
      return (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9.5" className={baseDiscDark} strokeWidth="1" />
          {/* Left-side glowing crescent */}
          <path
            d="M12 2.5 A9.5 9.5 0 0 0 12 21.5 A6.5 9.5 0 0 1 12 2.5 Z"
            className={litBright}
          />
        </svg>
      );
  }
};

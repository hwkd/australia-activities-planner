import type { Weather } from "~/stores/weather";

/**
 * Monoline weather icons from the Set the sky strip (Variant 2). They take the text colour, so they
 * read on every sky. Hot is a thermometer, not a sun (spec §3.1).
 */
const PATHS: Record<Weather, React.ReactNode> = {
  sunny: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4" />
    </>
  ),
  cloudy: <path d="M7.4 18.5h9.4a3.9 3.9 0 0 0 .4-7.78 5.4 5.4 0 0 0-10.3 1.15A3.4 3.4 0 0 0 7.4 18.5z" />,
  rainy: (
    <>
      <path d="M7.4 14.5h9.4a3.9 3.9 0 0 0 .4-7.78 5.4 5.4 0 0 0-10.3 1.15A3.4 3.4 0 0 0 7.4 14.5z" />
      <path d="M8.5 17.5l-1 2.8M12.5 17.5l-1 2.8M16.5 17.5l-1 2.8" />
    </>
  ),
  hot: (
    <>
      <path d="M14 13.9V5a2 2 0 0 0-4 0v8.9a4 4 0 1 0 4 0z" />
      <path d="M12 9.5v6.5" />
      <path d="M18 4.5l1.2-1.2M19.5 8h1.7M18 11.5l1.2 1.2" />
    </>
  ),
};

export function WeatherIcon({ weather, size = 24, strokeWidth = 1.8, className }: { weather: Weather; size?: number; strokeWidth?: number; className?: string }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {PATHS[weather]}
    </svg>
  );
}

/** UI line icons from the A artboards (24 px grid, take the text colour). */
const UI = {
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  ticket: <path d="M4 9V7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a3 3 0 0 0 0 6v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a3 3 0 0 0 0-6z" />,
  arrow: <path d="M7 17L17 7M9 7h8v8" />,
  hidden: <path d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 8.5 4.2 9.5 6-.4.8-1.3 2-2.5 3.2M6.2 7.6C4.4 8.8 3.1 10.6 2.5 12c1 1.8 4.5 6 9.5 6 1.5 0 2.9-.4 4.1-1" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2.5" />
      <path d="M4 10h16M8.5 3v4M15.5 3v4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  spark: <path d="M12 3.5l2.1 6.4 6.4 2.1-6.4 2.1-2.1 6.4-2.1-6.4-6.4-2.1 6.4-2.1zM19 3.5v3M17.5 5h3" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  back: <path d="M15 5l-7 7 7 7" />,
  pin: <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11zM14.3 10a2.3 2.3 0 1 1-4.6 0 2.3 2.3 0 0 1 4.6 0z" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5h.01" /></>,
  map: <path d="M9 4L3.5 6v14L9 18l6 2 5.5-2V4L15 6zM9 4v14M15 6v14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  phone: <path d="M5 4h3.5l1.8 4.5-2.3 1.4a11 11 0 0 0 5.6 5.6l1.4-2.3L19.5 15v3.5a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z" />,
  share: <path d="M12 15V4M8 8l4-4 4 4M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12" />,
  umbrella: <path d="M3 12a9 9 0 0 1 18 0zM12 12v6.5a2 2 0 0 1-4 0M12 3V2" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />,
  tram: <><rect x="6" y="3.5" width="12" height="13" rx="3" /><path d="M6 11h12M9 20l-1.5 1.5M15 20l1.5 1.5M9.5 14h.01M14.5 14h.01" /></>,
  return: <path d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />,
  bulb: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />,
  minus: <path d="M5 12h14" />,
  sunSmall: <path d="M12 2.8v2M12 19.2v2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M2.8 12h2M19.2 12h2M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4M16.2 12a4.2 4.2 0 1 1-8.4 0 4.2 4.2 0 0 1 8.4 0z" />,
  bag: <path d="M6 8h12l-1 12H7zM9 8V6a3 3 0 0 1 6 0v2" />,
  home: <path d="M4 20V9l8-5 8 5v11M9 20v-6h6v6" />,
  access: <><circle cx="12" cy="4.5" r="1.8" /><path d="M12 7.5v6h5l2 5M12 10h5M9 11.5a5 5 0 1 0 6.5 6.5" /></>,
  shield: <path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6zM12 8.5v4M12 15.5h.01" />,
  next: <path d="M5 12h14M13 6l6 6-6 6" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  warn: <><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17h.01" /></>,
  // Leg modes (the artboard's transit icons).
  walk: <path d="M13 4v1M12 8l-2 6 3 3v4M12 8l3 3 3 1M10 14l-2.5 7M12 8l-4 2-1 3" />,
  train: <path d="M7 3.5h10a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-9a2 2 0 0 1 2-2zM5 11h14M8.5 21l1.5-3.5M15.5 21L14 17.5M8.5 14.5h.01M15.5 14.5h.01" />,
  bus: <path d="M6 3.5h12a2 2 0 0 1 2 2V17H4V5.5a2 2 0 0 1 2-2zM4 12h16M7 17v2.5M17 17v2.5M7.5 14.5h.01M16.5 14.5h.01" />,
  ferry: <path d="M4 14.5l1.5 4h13l1.5-4zM7 14.5V10h10v4.5M10 10V6.5h4V10M3 22c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1" />,
  car: <path d="M5 16.5V12l2-5h10l2 5v4.5zM5 16.5V19h3v-2.5M16 16.5V19h3v-2.5M5 12h14M8 14h.01M16 14h.01" />,
} as const;
export type IconName = keyof typeof UI;

export function Icon({ name, size = 15, strokeWidth = 2, className }: { name: IconName; size?: number; strokeWidth?: number; className?: string }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {UI[name]}
    </svg>
  );
}

/** Three-bar fit meter: one bar per level; "Perfect" fills all three in the great colour. */
export function FitMeter({ fit, color }: { fit: 0 | 1 | 2; color?: string }) {
  const on = (n: number) => (fit >= n ? 1 : 0.28);
  return (
    <svg aria-hidden="true" width="18" height="14" viewBox="0 0 18 14" style={{ color: color ?? (fit === 2 ? "var(--great)" : "var(--ink)") }}>
      <rect x="0" y="8" width="4" height="6" rx="1.2" fill="currentColor" opacity={fit > 0 ? 1 : 0.28} />
      <rect x="7" y="4" width="4" height="10" rx="1.2" fill="currentColor" opacity={on(1)} />
      <rect x="14" y="0" width="4" height="14" rx="1.2" fill="currentColor" opacity={on(2)} />
    </svg>
  );
}

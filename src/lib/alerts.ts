/**
 * NSW Rural Fire Service fire danger ratings and total fire bans (spec §11.2), for activity pages.
 * The RFS publishes them per fire weather district for today and tomorrow; every Sydney activity is
 * in the Greater Sydney Region district.
 */
export const RFS_FEED = "https://www.rfs.nsw.gov.au/feeds/fdrToban.xml";
export const RFS_PAGE = "https://www.rfs.nsw.gov.au/fire-information/fdr-and-tobans";
export const SYDNEY_DISTRICT = "Greater Sydney Region";

export interface FireDanger {
  district: string;
  today: string;
  tomorrow: string;
  banToday: boolean;
  banTomorrow: boolean;
  /** When we fetched it (ISO). */
  fetchedAt: string;
}

const tag = (xml: string, name: string) => new RegExp(`<${name}>([^<]*)</${name}>`).exec(xml)?.[1]?.trim() ?? "";

/** Reads one district from the RFS feed; null when it isn't there or looks wrong. */
export function parseFireDanger(xml: string, district = SYDNEY_DISTRICT, fetchedAt = new Date().toISOString()): FireDanger | null {
  for (const block of xml.split("<District>").slice(1)) {
    if (tag(block, "Name") !== district) continue;
    const today = tag(block, "DangerLevelToday"), tomorrow = tag(block, "DangerLevelTomorrow");
    if (!today || !tomorrow) return null;
    return { district, today, tomorrow, banToday: /^yes$/i.test(tag(block, "FireBanToday")), banTomorrow: /^yes$/i.test(tag(block, "FireBanTomorrow")), fetchedAt };
  }
  return null;
}

/** "MODERATE" → "Moderate", "NO RATING" → "No rating". */
export const ratingLabel = (level: string) => level.charAt(0) + level.slice(1).toLowerCase();

/** Outdoor activities get the fire alert; the Plan B rule's "indoor" (great in the rain) doesn't. */
export const needsFireAlert = (a: { weatherFit: { rainy: number } }) => a.weatherFit.rainy < 2;

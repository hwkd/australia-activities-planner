import { common } from "./en-AU/common";
import { discover } from "./en-AU/discover";
import { detail } from "./en-AU/detail";
import { plans } from "./en-AU/plans";
import { sheets } from "./en-AU/sheets";
import { layout } from "./en-AU/layout";
import { lib } from "./en-AU/lib";

/**
 * All visitor-facing UI text, in Australian English (spec §7 Internationalisation, tracker M12.1).
 * Components read text from here instead of writing it inline, so Phase 3 translations (spec §12.4)
 * can swap this object for another locale's. Plain strings for fixed text; small functions for text
 * with values in it. Dates and numbers are formatted with `Intl` (en-AU), not here. The admin
 * (`src/components/admin`) is English-only and isn't included.
 *
 * One module per area, in ./en-AU/: common (weather, fit, groups, shared words), discover, detail,
 * plans (My plans and the shared plan), sheets (Add to a day, calendar export, undo), layout (shell,
 * tabs, footer, error pages, privacy) and lib (text produced by src/lib logic).
 */
export const t = { common, discover, detail, plans, sheets, layout, lib } as const;
export type Strings = typeof t;

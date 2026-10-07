/**
 * Australia's states and territories (D16, spec §3.1, §12.5). New South Wales is the one live state;
 * the others show in the state switch as not here yet. A state goes live by setting `live` once it has
 * its activities (spec §12.5: storage, URLs and per-state data come with the second state).
 */
export const STATES = [
  { key: "nsw", short: "NSW", name: "New South Wales", live: true },
  { key: "vic", short: "VIC", name: "Victoria", live: false },
  { key: "qld", short: "QLD", name: "Queensland", live: false },
  { key: "wa", short: "WA", name: "Western Australia", live: false },
  { key: "sa", short: "SA", name: "South Australia", live: false },
  { key: "tas", short: "TAS", name: "Tasmania", live: false },
  { key: "act", short: "ACT", name: "Australian Capital Territory", live: false },
  { key: "nt", short: "NT", name: "Northern Territory", live: false },
] as const;

export type StateKey = (typeof STATES)[number]["key"];
/** The state Discover lists while only one is live. */
export const CURRENT_STATE = STATES[0];

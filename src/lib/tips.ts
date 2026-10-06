/**
 * "Our tip:" (spec §4.1): advice and observations no official source can confirm (when car parks
 * fill, when it gets crowded, which time is quieter) start their sentence with "Our tip:", so the
 * text stays honest wherever it's shown, and activity pages turn the prefix into a small label.
 */
export const TIP_PREFIX = "Our tip:";

export interface TextPart {
  text: string;
  /** True for a sentence that started with "Our tip:" (the prefix removed, first letter capitalised). */
  tip: boolean;
}

/** Splits a text into plain parts and tip sentences. A tip runs from "Our tip:" to the end of the text. */
export function tipParts(text: string): TextPart[] {
  const i = text.indexOf(TIP_PREFIX);
  if (i < 0) return [{ text, tip: false }];
  const before = text.slice(0, i).trimEnd();
  const rest = text.slice(i + TIP_PREFIX.length).trim();
  const tip = rest.charAt(0).toUpperCase() + rest.slice(1);
  return [...(before ? [{ text: before, tip: false }] : []), { text: tip, tip: true }];
}

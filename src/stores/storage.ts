import { setPersistentEngine, windowPersistentEvents } from "@nanostores/persistent";

/**
 * A storage engine that never throws (spec §4.4, AC 13): localStorage if it works; otherwise
 * sessionStorage, so plans survive moving between pages for the rest of the session; otherwise memory
 * (this page only).
 */
const memory: Record<string, string> = {};

function usable(get: () => Storage): Storage | null {
  try {
    const s = get();
    if (!s) return null;
    const probe = "__swf_probe__";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

const backing = typeof window === "undefined" && typeof localStorage === "undefined" ? null : (usable(() => localStorage) ?? usable(() => sessionStorage));

export const safeStorage = new Proxy(memory, {
  get(_t, key: string) {
    if (backing) {
      try {
        const v = backing.getItem(key);
        if (v !== null) return v;
      } catch {
        /* fall through to memory */
      }
    }
    return memory[key];
  },
  set(_t, key: string, value: string) {
    memory[key] = value;
    if (backing) {
      try {
        backing.setItem(key, value);
      } catch {
        /* storage full or blocked: memory copy is enough for this session */
      }
    }
    return true;
  },
  deleteProperty(_t, key: string) {
    delete memory[key];
    if (backing) {
      try {
        backing.removeItem(key);
      } catch {
        /* ignore */
      }
    }
    return true;
  },
  has(_t, key: string) {
    if (key in memory) return true;
    if (!backing) return false;
    try {
      return backing.getItem(key) !== null;
    } catch {
      return false;
    }
  }
});

if (typeof window !== "undefined") setPersistentEngine(safeStorage, windowPersistentEvents);

/** Writes through to localStorage and reports whether it really landed there (not just in memory). */
export function writeDurably(key: string, value: string): boolean {
  memory[key] = value;
  if (!backing) return false;
  try {
    backing.setItem(key, value);
    return backing.getItem(key) === value;
  } catch {
    return false;
  }
}

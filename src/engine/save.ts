/** localStorage only: pp_settings, pp_progress, pp_current_run. No cookies, no network. */
export const KEYS = { settings: 'pp_settings', progress: 'pp_progress', run: 'pp_current_run' } as const;

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage blocked: play continues unsaved */ }
}

export function remove(key: string): void {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

export function clearAll(): void {
  Object.values(KEYS).forEach(remove);
}

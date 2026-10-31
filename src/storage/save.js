const KEY = "unknown-world-save-v1";

export function hasSave() {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(payload) {
  const data = {
    version: 1,
    savedAt: Date.now(),
    ...payload,
  };
  localStorage.setItem(KEY, JSON.stringify(data));
  return data;
}

export function clearSave() {
  localStorage.removeItem(KEY);
}

const LS_KEY = "uw-sandbox-v2";
const IDB_NAME = "unknown-world-db";
const IDB_STORE = "saves";

function idb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function hasSave() {
  try {
    const db = await idb();
    return await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const r = tx.objectStore(IDB_STORE).get("slot0");
      r.onsuccess = () => resolve(!!r.result);
      r.onerror = () => resolve(!!localStorage.getItem(LS_KEY));
    });
  } catch {
    return !!localStorage.getItem(LS_KEY);
  }
}

export async function loadGame() {
  try {
    const db = await idb();
    const data = await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const r = tx.objectStore(IDB_STORE).get("slot0");
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => reject(r.error);
    });
    if (data) return data;
  } catch (_) {}
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveGame(data) {
  const payload = { version: 2, savedAt: Date.now(), ...data };
  try {
    const db = await idb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(payload, "slot0");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (_) {
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
  }
  try {
    localStorage.setItem(LS_KEY + "-meta", JSON.stringify({ savedAt: payload.savedAt, seed: payload.seed }));
  } catch (_) {}
  return payload;
}

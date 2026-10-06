// Speicher auf dem Handy (IndexedDB). Ein einfacher Schlüssel-Wert-Speicher.
// Schlüssel: 'reise' (importierte Reisedaten), 'meta' (Herkunft), 'eigene' (deine Einträge).

const DB_NAME = 'thailand-app';
const STORE = 'kv';
let dbPromise = null;

function oeffne() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('Datenbank blockiert – bitte App neu öffnen.'));
    });
    dbPromise.catch(() => { dbPromise = null; });
  }
  return dbPromise;
}

async function transaktion(modus, fn) {
  const db = await oeffne();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, modus);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const lies = (key) => transaktion('readonly', (s) => s.get(key));
export const schreibe = (key, wert) => transaktion('readwrite', (s) => s.put(wert, key));
export const loesche = (key) => transaktion('readwrite', (s) => s.delete(key));

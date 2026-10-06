// Speicher auf dem Handy (IndexedDB).
// 'kv':    Schlüssel-Wert-Speicher – 'reise' (Reisedaten), 'meta' (Herkunft), 'eigene' (deine Einträge)
// 'fotos': Tagebuch-Fotos { id, d, bild (Blob), vorschau (Blob), erstellt }

const DB_NAME = 'thailand-app';
const KV = 'kv';
const FOTOS = 'fotos';
let dbPromise = null;

function oeffne() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(KV)) db.createObjectStore(KV);
        if (!db.objectStoreNames.contains(FOTOS)) db.createObjectStore(FOTOS, { keyPath: 'id' });
      };
      req.onsuccess = () => {
        // Falls eine neuere App-Version die Datenbank öffnen will: Verbindung freigeben
        req.result.onversionchange = () => req.result.close();
        resolve(req.result);
      };
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('Datenbank blockiert – bitte App neu öffnen.'));
    });
    dbPromise.catch(() => { dbPromise = null; });
  }
  return dbPromise;
}

async function transaktion(store, modus, fn) {
  const db = await oeffne();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, modus);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const lies = (key) => transaktion(KV, 'readonly', (s) => s.get(key));
export const schreibe = (key, wert) => transaktion(KV, 'readwrite', (s) => s.put(wert, key));
export const loesche = (key) => transaktion(KV, 'readwrite', (s) => s.delete(key));

export const fotoLesen = (id) => transaktion(FOTOS, 'readonly', (s) => s.get(id));
export const fotoSpeichern = (foto) => transaktion(FOTOS, 'readwrite', (s) => s.put(foto));
export const fotoLoeschen = (id) => transaktion(FOTOS, 'readwrite', (s) => s.delete(id));
export const alleFotos = () => transaktion(FOTOS, 'readonly', (s) => s.getAll());
export const fotosLeeren = () => transaktion(FOTOS, 'readwrite', (s) => s.clear());

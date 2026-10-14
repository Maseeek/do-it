import type { DuelSnapshot } from './duel-data';

const DATABASE = 'do-it-duel-cache-v1';
const TABLE = 'snapshots';
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(TABLE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export function duelCacheKey(project: string, account: string, duel: string) {
  return JSON.stringify([project, account, duel]);
}
export async function readDuelCache(key: string): Promise<DuelSnapshot | null> {
  if (typeof indexedDB === 'undefined') return null;
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(TABLE).objectStore(TABLE).get(key);
      request.onsuccess = () => {
        const value = request.result;
        const collections = ['habits', 'checkIns', 'stakes', 'reactions', 'restDays'];
        const valid = value && typeof value.cursor === 'string' && /^\d+$/.test(value.cursor) &&
          value.data && collections.every(collection => Array.isArray(value.data[collection]));
        resolve(valid ? value : null);
      };
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}
export async function writeDuelCache(key: string, value: DuelSnapshot) {
  if (typeof indexedDB === 'undefined') return;
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(TABLE, 'readwrite');
      transaction.objectStore(TABLE).put(value, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { db.close(); }
}

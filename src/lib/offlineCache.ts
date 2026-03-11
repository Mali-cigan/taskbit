import { Page } from '@/types/workspace';

const DB_NAME = 'taskbit-offline';
const DB_VERSION = 1;
const PAGES_STORE = 'pages';
const META_STORE = 'meta';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(PAGES_STORE)) {
        db.createObjectStore(PAGES_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };
  });
}

/** Serialise dates before storing */
function serialisePage(page: Page) {
  return {
    ...page,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
  };
}

function deserialisePage(raw: any): Page {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  };
}

export async function cachePages(pages: Page[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([PAGES_STORE, META_STORE], 'readwrite');
    const store = tx.objectStore(PAGES_STORE);
    const metaStore = tx.objectStore(META_STORE);

    // Clear existing and write all
    store.clear();
    for (const page of pages) {
      store.put(serialisePage(page));
    }
    metaStore.put({ key: 'lastCached', value: Date.now() });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // IndexedDB may not be available — silently fail
  }
}

export async function getCachedPages(): Promise<Page[] | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(PAGES_STORE, 'readonly');
    const store = tx.objectStore(PAGES_STORE);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const raw = request.result;
        if (!raw || raw.length === 0) {
          resolve(null);
          return;
        }
        resolve(raw.map(deserialisePage));
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function clearCache(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([PAGES_STORE, META_STORE], 'readwrite');
    tx.objectStore(PAGES_STORE).clear();
    tx.objectStore(META_STORE).clear();
  } catch {
    // silent
  }
}

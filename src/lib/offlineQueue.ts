import { supabase } from '@/integrations/supabase/client';

export interface QueuedOperation {
  id: string;
  table: 'pages' | 'blocks';
  action: 'insert' | 'update' | 'delete' | 'upsert';
  payload: Record<string, unknown>;
  createdAt: number;
}

const DB_NAME = 'taskbit-offline';
const DB_VERSION = 2;
const QUEUE_STORE = 'offlineQueue';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('pages')) {
        db.createObjectStore('pages', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
      }
    };
  });
}

export async function enqueueOperation(op: Omit<QueuedOperation, 'id' | 'createdAt'>): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(QUEUE_STORE);
    const entry: QueuedOperation = {
      ...op,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    store.put(entry);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // IndexedDB unavailable
  }
}

export async function getQueuedOperations(): Promise<QueuedOperation[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(QUEUE_STORE, 'readonly');
    const store = tx.objectStore(QUEUE_STORE);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

async function removeOperation(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(QUEUE_STORE, 'readwrite');
    tx.objectStore(QUEUE_STORE).delete(id);
  } catch {
    // silent
  }
}

/**
 * Flush all queued operations to Supabase.
 * Returns the number of successfully synced operations.
 */
export async function flushQueue(): Promise<number> {
  const ops = await getQueuedOperations();
  if (ops.length === 0) return 0;

  // Sort oldest first
  ops.sort((a, b) => a.createdAt - b.createdAt);

  let synced = 0;

  for (const op of ops) {
    try {
      let result;

      if (op.action === 'insert') {
        result = await supabase.from(op.table).insert(op.payload as never);
      } else if (op.action === 'update') {
        const { id, ...rest } = op.payload;
        result = await supabase.from(op.table).update(rest as never).eq('id', id as string);
      } else if (op.action === 'delete') {
        result = await supabase.from(op.table).delete().eq('id', op.payload.id as string);
      } else if (op.action === 'upsert') {
        result = await supabase.from(op.table).upsert(op.payload as never, { onConflict: 'id' });
      }

      if (result?.error) {
        console.warn('Failed to sync queued op:', op.id, result.error);
        continue; // keep in queue for next attempt
      }

      await removeOperation(op.id);
      synced++;
    } catch (err) {
      console.warn('Error syncing queued op:', op.id, err);
    }
  }

  return synced;
}

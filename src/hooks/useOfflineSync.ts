import { useEffect, useRef, useCallback } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { enqueueOperation, flushQueue, QueuedOperation } from '@/lib/offlineQueue';
import { toast } from '@/hooks/use-toast';

/**
 * Hook that manages offline queue: enqueues operations when offline
 * and flushes the queue when connectivity is restored.
 */
export function useOfflineSync() {
  const isOnline = useOnlineStatus();
  const wasOfflineRef = useRef(!isOnline);

  // Flush queue when coming back online
  useEffect(() => {
    if (isOnline && wasOfflineRef.current) {
      flushQueue().then((count) => {
        if (count > 0) {
          toast({
            title: 'Synced',
            description: `${count} offline change${count > 1 ? 's' : ''} synced to the cloud.`,
          });
        }
      });
    }
    wasOfflineRef.current = !isOnline;
  }, [isOnline]);

  /**
   * Wraps a Supabase operation: runs it if online, queues it if offline.
   */
  const executeOrQueue = useCallback(
    async (
      op: Omit<QueuedOperation, 'id' | 'createdAt'>,
      onlineAction: () => Promise<{ error: any }>,
    ) => {
      if (navigator.onLine) {
        const result = await onlineAction();
        if (result.error) {
          // If it failed due to network, queue it
          if (result.error.message?.includes('fetch') || result.error.message?.includes('network')) {
            await enqueueOperation(op);
          }
          throw result.error;
        }
        return result;
      } else {
        await enqueueOperation(op);
        return { error: null };
      }
    },
    [],
  );

  return { isOnline, executeOrQueue };
}

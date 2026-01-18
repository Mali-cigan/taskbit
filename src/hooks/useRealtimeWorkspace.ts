import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Page, Block, BlockType } from '@/types/workspace';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseRealtimeWorkspaceOptions {
  userId: string | undefined;
  onPageChange: (change: {
    type: 'INSERT' | 'UPDATE' | 'DELETE';
    page: Partial<Page> & { id: string };
  }) => void;
  onBlockChange: (change: {
    type: 'INSERT' | 'UPDATE' | 'DELETE';
    pageId: string;
    block: Partial<Block> & { id: string };
  }) => void;
}

interface DbPage {
  id: string;
  user_id: string;
  title: string;
  icon: string;
  position: number;
  created_at: string;
  updated_at: string;
}

interface DbBlock {
  id: string;
  page_id: string;
  user_id: string;
  type: string;
  content: string;
  checked: boolean | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export function useRealtimeWorkspace({ userId, onPageChange, onBlockChange }: UseRealtimeWorkspaceOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastLocalChangeRef = useRef<{ table: string; id: string; timestamp: number } | null>(null);

  // Mark a change as local to avoid echo
  const markLocalChange = useCallback((table: string, id: string) => {
    lastLocalChangeRef.current = { table, id, timestamp: Date.now() };
  }, []);

  const isLocalChange = useCallback((table: string, id: string) => {
    const local = lastLocalChangeRef.current;
    if (!local) return false;
    
    // Consider it local if within 2 seconds
    const isRecent = Date.now() - local.timestamp < 2000;
    const isSame = local.table === table && local.id === id;
    
    if (isRecent && isSame) {
      lastLocalChangeRef.current = null;
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Create realtime channel for workspace sync
    const channel = supabase
      .channel(`workspace:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pages',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<DbPage>) => {
          const record = (payload.new as DbPage) || (payload.old as DbPage);
          if (!record?.id) return;
          
          // Skip if this is our own change
          if (isLocalChange('pages', record.id)) return;

          const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
          
          if (eventType === 'DELETE') {
            onPageChange({
              type: 'DELETE',
              page: { id: (payload.old as DbPage).id },
            });
          } else {
            const dbPage = payload.new as DbPage;
            onPageChange({
              type: eventType,
              page: {
                id: dbPage.id,
                title: dbPage.title,
                icon: dbPage.icon,
                createdAt: new Date(dbPage.created_at),
                updatedAt: new Date(dbPage.updated_at),
              },
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blocks',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<DbBlock>) => {
          const record = (payload.new as DbBlock) || (payload.old as DbBlock);
          if (!record?.id) return;
          
          // Skip if this is our own change
          if (isLocalChange('blocks', record.id)) return;

          const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
          
          if (eventType === 'DELETE') {
            const oldBlock = payload.old as DbBlock;
            onBlockChange({
              type: 'DELETE',
              pageId: oldBlock.page_id,
              block: { id: oldBlock.id },
            });
          } else {
            const dbBlock = payload.new as DbBlock;
            onBlockChange({
              type: eventType,
              pageId: dbBlock.page_id,
              block: {
                id: dbBlock.id,
                type: dbBlock.type as BlockType,
                content: dbBlock.content,
                checked: dbBlock.checked ?? undefined,
              },
            });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [userId, onPageChange, onBlockChange, isLocalChange]);

  return { markLocalChange };
}

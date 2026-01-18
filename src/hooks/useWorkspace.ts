import { useState, useCallback, useEffect } from 'react';
import { Page, Block, BlockType } from '@/types/workspace';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

// Database types for pages and blocks
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

const getDefaultBlocks = (): Omit<Block, 'id'>[] => [
  { type: 'heading1', content: 'Welcome to your workspace' },
  { type: 'text', content: 'This is your personal workspace. Start writing, organizing, and building your ideas.' },
  { type: 'heading2', content: 'Getting started' },
  { type: 'checklist', content: 'Create your first page', checked: false },
  { type: 'checklist', content: 'Add some blocks', checked: false },
  { type: 'checklist', content: 'Organize your thoughts', checked: false },
  { type: 'divider', content: '' },
  { type: 'text', content: 'Click the + button to add new blocks, or press / to see options.' },
];

export function useWorkspace() {
  const { user } = useAuth();
  const [pages, setPages] = useState<Page[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const activePage = pages.find(p => p.id === activePageId) || pages[0] || null;

  // Load pages and blocks from database
  useEffect(() => {
    if (!user) {
      setPages([]);
      setActivePageId(null);
      setIsLoading(false);
      return;
    }

    const loadWorkspace = async () => {
      setIsLoading(true);
      try {
        // Load pages with their blocks
        const { data: pagesData, error: pagesError } = await supabase
          .from('pages')
          .select('*')
          .eq('user_id', user.id)
          .order('position', { ascending: true });

        if (pagesError) throw pagesError;

        if (!pagesData || pagesData.length === 0) {
          // Create default welcome page for new users
          await createDefaultPage();
          return;
        }

        // Load blocks for all pages
        const { data: blocksData, error: blocksError } = await supabase
          .from('blocks')
          .select('*')
          .eq('user_id', user.id)
          .order('position', { ascending: true });

        if (blocksError) throw blocksError;

        // Map database data to Page format
        const loadedPages: Page[] = (pagesData as DbPage[]).map((dbPage) => {
          const pageBlocks = ((blocksData || []) as DbBlock[])
            .filter((b) => b.page_id === dbPage.id)
            .map((b) => ({
              id: b.id,
              type: b.type as BlockType,
              content: b.content,
              checked: b.checked ?? undefined,
            }));

          return {
            id: dbPage.id,
            title: dbPage.title,
            icon: dbPage.icon,
            blocks: pageBlocks,
            createdAt: new Date(dbPage.created_at),
            updatedAt: new Date(dbPage.updated_at),
          };
        });

        setPages(loadedPages);
        if (!activePageId && loadedPages.length > 0) {
          setActivePageId(loadedPages[0].id);
        }
      } catch (error) {
        console.error('Error loading workspace:', error);
        toast({
          title: 'Error loading workspace',
          description: 'Failed to load your pages. Please try refreshing.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    const createDefaultPage = async () => {
      try {
        // Create welcome page
        const { data: pageData, error: pageError } = await supabase
          .from('pages')
          .insert({
            user_id: user.id,
            title: 'Welcome to Workspace',
            icon: '👋',
            position: 0,
          })
          .select()
          .single();

        if (pageError) throw pageError;

        const dbPage = pageData as DbPage;

        // Create default blocks
        const defaultBlocks = getDefaultBlocks();
        const blocksToInsert = defaultBlocks.map((block, index) => ({
          page_id: dbPage.id,
          user_id: user.id,
          type: block.type,
          content: block.content,
          checked: block.checked ?? null,
          position: index,
        }));

        const { data: blocksData, error: blocksError } = await supabase
          .from('blocks')
          .insert(blocksToInsert)
          .select();

        if (blocksError) throw blocksError;

        const newPage: Page = {
          id: dbPage.id,
          title: dbPage.title,
          icon: dbPage.icon,
          blocks: ((blocksData || []) as DbBlock[]).map((b) => ({
            id: b.id,
            type: b.type as BlockType,
            content: b.content,
            checked: b.checked ?? undefined,
          })),
          createdAt: new Date(dbPage.created_at),
          updatedAt: new Date(dbPage.updated_at),
        };

        setPages([newPage]);
        setActivePageId(newPage.id);
      } catch (error) {
        console.error('Error creating default page:', error);
        toast({
          title: 'Error creating workspace',
          description: 'Failed to initialize your workspace.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkspace();
  }, [user]);

  const createPage = useCallback(async () => {
    if (!user) return null;

    try {
      const position = pages.length;
      const { data: pageData, error: pageError } = await supabase
        .from('pages')
        .insert({
          user_id: user.id,
          title: 'Untitled',
          icon: '📄',
          position,
        })
        .select()
        .single();

      if (pageError) throw pageError;

      const dbPage = pageData as DbPage;

      // Create initial empty heading block
      const { data: blockData, error: blockError } = await supabase
        .from('blocks')
        .insert({
          page_id: dbPage.id,
          user_id: user.id,
          type: 'heading1',
          content: '',
          position: 0,
        })
        .select()
        .single();

      if (blockError) throw blockError;

      const dbBlock = blockData as DbBlock;

      const newPage: Page = {
        id: dbPage.id,
        title: dbPage.title,
        icon: dbPage.icon,
        blocks: [{
          id: dbBlock.id,
          type: dbBlock.type as BlockType,
          content: dbBlock.content,
          checked: undefined,
        }],
        createdAt: new Date(dbPage.created_at),
        updatedAt: new Date(dbPage.updated_at),
      };

      setPages(prev => [...prev, newPage]);
      setActivePageId(newPage.id);
      return newPage;
    } catch (error) {
      console.error('Error creating page:', error);
      toast({
        title: 'Error creating page',
        description: 'Failed to create a new page.',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, pages.length]);

  const deletePage = useCallback(async (pageId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', pageId)
        .eq('user_id', user.id);

      if (error) throw error;

      setPages(prev => {
        const filtered = prev.filter(p => p.id !== pageId);
        if (activePageId === pageId && filtered.length > 0) {
          setActivePageId(filtered[0].id);
        } else if (filtered.length === 0) {
          setActivePageId(null);
        }
        return filtered;
      });
    } catch (error) {
      console.error('Error deleting page:', error);
      toast({
        title: 'Error deleting page',
        description: 'Failed to delete the page.',
        variant: 'destructive',
      });
    }
  }, [user, activePageId]);

  const updatePageTitle = useCallback(async (pageId: string, title: string) => {
    if (!user) return;

    // Optimistic update
    setPages(prev => prev.map(p =>
      p.id === pageId ? { ...p, title, updatedAt: new Date() } : p
    ));

    try {
      const { error } = await supabase
        .from('pages')
        .update({ title })
        .eq('id', pageId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating page title:', error);
      // Revert on error - would need to store previous value
    }
  }, [user]);

  const updatePageIcon = useCallback(async (pageId: string, icon: string) => {
    if (!user) return;

    // Optimistic update
    setPages(prev => prev.map(p =>
      p.id === pageId ? { ...p, icon, updatedAt: new Date() } : p
    ));

    try {
      const { error } = await supabase
        .from('pages')
        .update({ icon })
        .eq('id', pageId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating page icon:', error);
    }
  }, [user]);

  const addBlock = useCallback(async (pageId: string, type: BlockType, afterBlockId?: string) => {
    if (!user) return null;

    const page = pages.find(p => p.id === pageId);
    if (!page) return null;

    let position = page.blocks.length;
    if (afterBlockId) {
      const index = page.blocks.findIndex(b => b.id === afterBlockId);
      if (index >= 0) {
        position = index + 1;
      }
    }

    try {
      const { data: blockData, error } = await supabase
        .from('blocks')
        .insert({
          page_id: pageId,
          user_id: user.id,
          type,
          content: '',
          checked: type === 'checklist' ? false : null,
          position,
        })
        .select()
        .single();

      if (error) throw error;

      const dbBlock = blockData as DbBlock;
      const newBlock: Block = {
        id: dbBlock.id,
        type: dbBlock.type as BlockType,
        content: dbBlock.content,
        checked: dbBlock.checked ?? undefined,
      };

      setPages(prev => prev.map(p => {
        if (p.id !== pageId) return p;

        if (!afterBlockId) {
          return { ...p, blocks: [...p.blocks, newBlock], updatedAt: new Date() };
        }

        const index = p.blocks.findIndex(b => b.id === afterBlockId);
        const newBlocks = [...p.blocks];
        newBlocks.splice(index + 1, 0, newBlock);
        return { ...p, blocks: newBlocks, updatedAt: new Date() };
      }));

      return newBlock;
    } catch (error) {
      console.error('Error adding block:', error);
      toast({
        title: 'Error adding block',
        description: 'Failed to add a new block.',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, pages]);

  const updateBlock = useCallback(async (pageId: string, blockId: string, updates: Partial<Block>) => {
    if (!user) return;

    // Optimistic update
    setPages(prev => prev.map(p => {
      if (p.id !== pageId) return p;
      return {
        ...p,
        blocks: p.blocks.map(b => b.id === blockId ? { ...b, ...updates } : b),
        updatedAt: new Date(),
      };
    }));

    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.content !== undefined) dbUpdates.content = updates.content;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.checked !== undefined) dbUpdates.checked = updates.checked;

      const { error } = await supabase
        .from('blocks')
        .update(dbUpdates)
        .eq('id', blockId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating block:', error);
    }
  }, [user]);

  const deleteBlock = useCallback(async (pageId: string, blockId: string) => {
    if (!user) return;

    // Optimistic update
    setPages(prev => prev.map(p => {
      if (p.id !== pageId) return p;
      return {
        ...p,
        blocks: p.blocks.filter(b => b.id !== blockId),
        updatedAt: new Date(),
      };
    }));

    try {
      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('id', blockId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting block:', error);
      toast({
        title: 'Error deleting block',
        description: 'Failed to delete the block.',
        variant: 'destructive',
      });
    }
  }, [user]);

  return {
    pages,
    activePage,
    activePageId,
    isLoading,
    setActivePageId,
    createPage,
    deletePage,
    updatePageTitle,
    updatePageIcon,
    addBlock,
    updateBlock,
    deleteBlock,
  };
}

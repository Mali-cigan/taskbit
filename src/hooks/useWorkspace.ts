import { useState, useCallback } from 'react';
import { Page, Block, BlockType } from '@/types/workspace';

const generateId = () => Math.random().toString(36).substr(2, 9);

const defaultPages: Page[] = [
  {
    id: 'welcome',
    title: 'Welcome to Workspace',
    icon: '👋',
    blocks: [
      { id: '1', type: 'heading1', content: 'Welcome to your workspace' },
      { id: '2', type: 'text', content: 'This is your personal workspace. Start writing, organizing, and building your ideas.' },
      { id: '3', type: 'heading2', content: 'Getting started' },
      { id: '4', type: 'checklist', content: 'Create your first page', checked: false },
      { id: '5', type: 'checklist', content: 'Add some blocks', checked: false },
      { id: '6', type: 'checklist', content: 'Organize your thoughts', checked: false },
      { id: '7', type: 'divider', content: '' },
      { id: '8', type: 'text', content: 'Click the + button to add new blocks, or press / to see options.' },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'quick-notes',
    title: 'Quick Notes',
    icon: '📝',
    blocks: [
      { id: '1', type: 'heading1', content: 'Quick Notes' },
      { id: '2', type: 'text', content: 'Jot down your quick thoughts here...' },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export function useWorkspace() {
  const [pages, setPages] = useState<Page[]>(defaultPages);
  const [activePageId, setActivePageId] = useState<string>('welcome');

  const activePage = pages.find(p => p.id === activePageId) || pages[0];

  const createPage = useCallback(() => {
    const newPage: Page = {
      id: generateId(),
      title: 'Untitled',
      icon: '📄',
      blocks: [
        { id: generateId(), type: 'heading1', content: '' },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setPages(prev => [...prev, newPage]);
    setActivePageId(newPage.id);
    return newPage;
  }, []);

  const deletePage = useCallback((pageId: string) => {
    setPages(prev => {
      const filtered = prev.filter(p => p.id !== pageId);
      if (activePageId === pageId && filtered.length > 0) {
        setActivePageId(filtered[0].id);
      }
      return filtered;
    });
  }, [activePageId]);

  const updatePageTitle = useCallback((pageId: string, title: string) => {
    setPages(prev => prev.map(p => 
      p.id === pageId ? { ...p, title, updatedAt: new Date() } : p
    ));
  }, []);

  const updatePageIcon = useCallback((pageId: string, icon: string) => {
    setPages(prev => prev.map(p => 
      p.id === pageId ? { ...p, icon, updatedAt: new Date() } : p
    ));
  }, []);

  const addBlock = useCallback((pageId: string, type: BlockType, afterBlockId?: string) => {
    const newBlock: Block = {
      id: generateId(),
      type,
      content: '',
      checked: type === 'checklist' ? false : undefined,
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
  }, []);

  const updateBlock = useCallback((pageId: string, blockId: string, updates: Partial<Block>) => {
    setPages(prev => prev.map(p => {
      if (p.id !== pageId) return p;
      return {
        ...p,
        blocks: p.blocks.map(b => b.id === blockId ? { ...b, ...updates } : b),
        updatedAt: new Date(),
      };
    }));
  }, []);

  const deleteBlock = useCallback((pageId: string, blockId: string) => {
    setPages(prev => prev.map(p => {
      if (p.id !== pageId) return p;
      return {
        ...p,
        blocks: p.blocks.filter(b => b.id !== blockId),
        updatedAt: new Date(),
      };
    }));
  }, []);

  return {
    pages,
    activePage,
    activePageId,
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

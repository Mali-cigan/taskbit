import { useState, useCallback } from 'react';
import { Page, Block, BlockType } from '@/types/workspace';
import { BlockEditor } from './BlockEditor';
import { Plus, Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';

interface PageEditorProps {
  page: Page;
  onUpdateTitle: (title: string) => void;
  onUpdateIcon: (icon: string) => void;
  onAddBlock: (type: BlockType, afterBlockId?: string) => void;
  onUpdateBlock: (blockId: string, updates: Partial<Page['blocks'][0]>) => void;
  onDeleteBlock: (blockId: string) => void;
  onReorderBlocks?: (pageId: string, reorderedBlocks: Block[]) => void;
  pageId: string;
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
  isPro?: boolean;
}

const blockTypes: { type: BlockType; label: string; icon: string }[] = [
  { type: 'text', label: 'Text', icon: '📝' },
  { type: 'heading1', label: 'Heading 1', icon: '𝗛' },
  { type: 'heading2', label: 'Heading 2', icon: '𝗵' },
  { type: 'heading3', label: 'Heading 3', icon: 'h' },
  { type: 'bullet', label: 'Bullet List', icon: '•' },
  { type: 'numbered', label: 'Numbered List', icon: '1.' },
  { type: 'checklist', label: 'Checklist', icon: '☑️' },
  { type: 'divider', label: 'Divider', icon: '—' },
];

const commonEmojis = ['📄', '📝', '📋', '📌', '📍', '⭐', '💡', '🎯', '🔥', '✨', '💼', '📊', '📈', '🗂️', '📁', '🏠', '🚀', '💎', '🎨', '🔧'];

export function PageEditor({
  page,
  onUpdateTitle,
  onUpdateIcon,
  onAddBlock,
  onUpdateBlock,
  onDeleteBlock,
  onReorderBlocks,
  pageId,
  onToggleSidebar,
  isSidebarCollapsed,
  isPro = false,
}: PageEditorProps) {
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // Require a small drag distance before activating — prevents accidental drags when clicking
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = page.blocks.findIndex((b) => b.id === active.id);
    const newIndex = page.blocks.findIndex((b) => b.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(page.blocks, oldIndex, newIndex);
    onReorderBlocks?.(pageId, reordered);
  }, [page.blocks, onReorderBlocks, pageId]);

  const activeBlock = activeId ? page.blocks.find((b) => b.id === activeId) : null;

  return (
    <main className="flex-1 h-screen overflow-y-auto bg-page-bg">
      {/* Header */}
      <header className="h-14 px-4 flex items-center border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        {isSidebarCollapsed && (
          <button
            onClick={onToggleSidebar}
            className="p-2 mr-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-hover-overlay transition-gentle"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>{page.icon}</span>
          <span className="text-sm">{page.title || 'Untitled'}</span>
        </div>
      </header>

      {/* Page Content */}
      <div className="max-w-3xl mx-auto px-12 py-16">
        {/* Icon & Title */}
        <div className="mb-6 flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-3xl hover:bg-hover-overlay rounded-md p-1.5 transition-gentle">
                {page.icon}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <div className="grid grid-cols-5 gap-2">
                {commonEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => onUpdateIcon(emoji)}
                    className="text-xl p-2 hover:bg-hover-overlay rounded-md transition-gentle"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <input
            type="text"
            value={page.title}
            onChange={(e) => onUpdateTitle(e.target.value)}
            placeholder="Untitled"
            className="flex-1 text-3xl font-semibold bg-transparent border-none outline-none placeholder:text-placeholder"
          />
        </div>

        {/* Blocks with Drag-and-Drop */}
        <div className="space-y-1 pl-10">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          >
            <SortableContext
              items={page.blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              {page.blocks.map((block, index) => (
                <BlockEditor
                  key={block.id}
                  block={block}
                  onUpdate={(updates) => onUpdateBlock(block.id, updates)}
                  onDelete={() => onDeleteBlock(block.id)}
                  onAddBlock={(type) => onAddBlock(type, block.id)}
                  onFocus={() => setFocusedBlockId(block.id)}
                  autoFocus={index === page.blocks.length - 1 && block.content === ''}
                  isPro={isPro}
                />
              ))}
            </SortableContext>

            {/* Drag overlay — ghost of the dragged block */}
            <DragOverlay>
              {activeBlock ? (
                <div className="opacity-80 shadow-lg rounded-md bg-background border border-border px-3 py-1.5 text-sm text-foreground cursor-grabbing">
                  {activeBlock.content || `[${activeBlock.type}]`}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        {/* Add Block Button */}
        <div className="mt-4 pl-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-hover-overlay transition-gentle text-sm">
                <Plus className="w-4 h-4" />
                <span>Add a block</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {blockTypes.map(({ type, label, icon }) => (
                <DropdownMenuItem key={type} onClick={() => onAddBlock(type)}>
                  <span className="w-6">{icon}</span>
                  <span>{label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </main>
  );
}

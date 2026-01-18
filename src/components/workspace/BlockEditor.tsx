import { useRef, useEffect, KeyboardEvent } from 'react';
import { Block, BlockType } from '@/types/workspace';
import { GripVertical, Plus, Trash2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BlockEditorProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
  onDelete: () => void;
  onAddBlock: (type: BlockType) => void;
  onFocus?: () => void;
  autoFocus?: boolean;
}

const blockTypeConfig: Record<BlockType, { placeholder: string; className: string }> = {
  heading1: {
    placeholder: 'Heading 1',
    className: 'text-2xl font-semibold tracking-tight',
  },
  heading2: {
    placeholder: 'Heading 2',
    className: 'text-xl font-semibold tracking-tight',
  },
  heading3: {
    placeholder: 'Heading 3',
    className: 'text-lg font-medium',
  },
  text: {
    placeholder: 'Type something...',
    className: 'text-base leading-relaxed',
  },
  checklist: {
    placeholder: 'To-do',
    className: 'text-base leading-relaxed',
  },
  divider: {
    placeholder: '',
    className: '',
  },
};

const blockTypes: { type: BlockType; label: string; icon: string }[] = [
  { type: 'text', label: 'Text', icon: '📝' },
  { type: 'heading1', label: 'Heading 1', icon: '𝗛' },
  { type: 'heading2', label: 'Heading 2', icon: '𝗵' },
  { type: 'heading3', label: 'Heading 3', icon: 'h' },
  { type: 'checklist', label: 'Checklist', icon: '☑️' },
  { type: 'divider', label: 'Divider', icon: '—' },
];

export function BlockEditor({
  block,
  onUpdate,
  onDelete,
  onAddBlock,
  onFocus,
  autoFocus,
}: BlockEditorProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const config = blockTypeConfig[block.type];

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onAddBlock('text');
    }
    if (e.key === 'Backspace' && block.content === '') {
      e.preventDefault();
      onDelete();
    }
  };

  const adjustHeight = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  if (block.type === 'divider') {
    return (
      <div className="group relative flex items-center py-2">
        <div className="absolute -left-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-gentle">
          <button className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-hover-overlay">
            <GripVertical className="w-4 h-4" />
          </button>
        </div>
        <hr className="flex-1 border-border" />
        <button
          onClick={onDelete}
          className="absolute -right-8 p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-gentle"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="group relative flex items-start py-0.5">
      {/* Left controls */}
      <div className="absolute -left-10 top-0.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-gentle">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-hover-overlay">
              <Plus className="w-4 h-4" />
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
        <button className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-hover-overlay cursor-grab">
          <GripVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Checkbox for checklist */}
      {block.type === 'checklist' && (
        <button
          onClick={() => onUpdate({ checked: !block.checked })}
          className={cn(
            "w-4 h-4 mt-1 mr-2 rounded border flex items-center justify-center transition-gentle flex-shrink-0",
            block.checked
              ? "bg-accent border-accent text-accent-foreground"
              : "border-muted-foreground/40 hover:border-accent"
          )}
        >
          {block.checked && <Check className="w-3 h-3" />}
        </button>
      )}

      {/* Content */}
      <textarea
        ref={inputRef}
        value={block.content}
        onChange={(e) => {
          onUpdate({ content: e.target.value });
          adjustHeight(e.target);
        }}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        placeholder={config.placeholder}
        rows={1}
        className={cn(
          "flex-1 bg-transparent border-none outline-none resize-none overflow-hidden",
          "placeholder:text-placeholder",
          config.className,
          block.type === 'checklist' && block.checked && "line-through text-muted-foreground"
        )}
        style={{ minHeight: '1.5em' }}
      />

      {/* Delete button */}
      <button
        onClick={onDelete}
        className="absolute -right-8 top-0.5 p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-gentle"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

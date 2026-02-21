import { useRef, useEffect, KeyboardEvent } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Block, BlockType, isPremiumBlock } from '@/types/workspace';
import { GripVertical, Plus, Trash2, Check, AlertCircle, Quote, Code, Table, ChevronRight, Image, Link, Layout, Database, Crown, List, ListOrdered, Sigma } from 'lucide-react';
import { ImageBlock } from './ImageBlock';
import { EmbedBlock } from './EmbedBlock';
import { AIWriteButton } from './AIWriteButton';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BlockEditorProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
  onDelete: () => void;
  onAddBlock: (type: BlockType) => void;
  onFocus?: () => void;
  autoFocus?: boolean;
  isPro?: boolean;
}

const blockTypeConfig: Record<BlockType, { placeholder: string; className: string }> = {
  heading1: { placeholder: 'Heading 1', className: 'text-2xl font-semibold tracking-tight' },
  heading2: { placeholder: 'Heading 2', className: 'text-xl font-semibold tracking-tight' },
  heading3: { placeholder: 'Heading 3', className: 'text-lg font-medium' },
  text: { placeholder: 'Type something...', className: 'text-base leading-relaxed' },
  checklist: { placeholder: 'To-do', className: 'text-base leading-relaxed' },
  divider: { placeholder: '', className: '' },
  bullet: { placeholder: 'List item', className: 'text-base leading-relaxed' },
  numbered: { placeholder: 'List item', className: 'text-base leading-relaxed' },
  callout: { placeholder: 'Type a callout...', className: 'text-base leading-relaxed' },
  quote: { placeholder: 'Type a quote...', className: 'text-base leading-relaxed italic' },
  code: { placeholder: 'Write some code...', className: 'font-mono text-sm' },
  math: { placeholder: 'Write a math expression (LaTeX)...', className: 'font-mono text-sm' },
  table: { placeholder: 'Table', className: '' },
  toggle: { placeholder: 'Toggle heading', className: 'text-base font-medium' },
  image: { placeholder: 'Add an image URL...', className: 'text-base' },
  embed: { placeholder: 'Paste embed URL...', className: 'text-base' },
  kanban: { placeholder: 'Kanban board', className: '' },
  database: { placeholder: 'Database', className: '' },
};

const basicBlockTypes: { type: BlockType; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: 'Text', icon: '📝' },
  { type: 'heading1', label: 'Heading 1', icon: '𝗛' },
  { type: 'heading2', label: 'Heading 2', icon: '𝗵' },
  { type: 'heading3', label: 'Heading 3', icon: 'h' },
  { type: 'bullet', label: 'Bullet List', icon: <List className="w-4 h-4" /> },
  { type: 'numbered', label: 'Numbered List', icon: <ListOrdered className="w-4 h-4" /> },
  { type: 'checklist', label: 'Checklist', icon: '☑️' },
  { type: 'divider', label: 'Divider', icon: '—' },
];

const premiumBlockTypes: { type: BlockType; label: string; icon: React.ReactNode }[] = [
  { type: 'callout', label: 'Callout', icon: <AlertCircle className="w-4 h-4" /> },
  { type: 'quote', label: 'Quote', icon: <Quote className="w-4 h-4" /> },
  { type: 'code', label: 'Code', icon: <Code className="w-4 h-4" /> },
  { type: 'math', label: 'Math', icon: <Sigma className="w-4 h-4" /> },
  { type: 'table', label: 'Table', icon: <Table className="w-4 h-4" /> },
  { type: 'toggle', label: 'Toggle', icon: <ChevronRight className="w-4 h-4" /> },
  { type: 'image', label: 'Image', icon: <Image className="w-4 h-4" /> },
  { type: 'embed', label: 'Embed', icon: <Link className="w-4 h-4" /> },
  { type: 'kanban', label: 'Kanban', icon: <Layout className="w-4 h-4" /> },
  { type: 'database', label: 'Database', icon: <Database className="w-4 h-4" /> },
];

const calloutStyles = {
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
  warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400',
  success: 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400',
  error: 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400',
};

// Shared block menu shown in the left gutter
function BlockMenu({
  isPro,
  onAdd,
}: {
  isPro: boolean;
  onAdd: (type: BlockType) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-hover-overlay">
          <Plus className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {basicBlockTypes.map(({ type, label, icon }) => (
          <DropdownMenuItem key={type} onClick={() => onAdd(type)}>
            <span className="w-6 flex items-center">{icon}</span>
            <span>{label}</span>
          </DropdownMenuItem>
        ))}
        {isPro ? (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1 text-xs text-muted-foreground flex items-center gap-1">
              <Crown className="w-3 h-3" /> Pro Blocks
            </div>
            {premiumBlockTypes.map(({ type, label, icon }) => (
              <DropdownMenuItem key={type} onClick={() => onAdd(type)}>
                <span className="w-6 flex items-center">{icon}</span>
                <span>{label}</span>
              </DropdownMenuItem>
            ))}
          </>
        ) : (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-1 mb-1">
                <Crown className="w-3 h-3" /> Pro Blocks
              </div>
              <p className="text-xs opacity-75">Upgrade to unlock callouts, code, tables, and more</p>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function BlockEditor({
  block,
  onUpdate,
  onDelete,
  onAddBlock,
  onFocus,
  autoFocus,
  isPro = false,
}: BlockEditorProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const config = blockTypeConfig[block.type];

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const dragStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    position: 'relative',
  };

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

  const handleAddBlock = (type: BlockType) => {
    if (isPremiumBlock(type) && !isPro) return;
    onAddBlock(type);
  };

  // Drag handle button — attaches sortable listeners
  const GripHandle = () => (
    <button
      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-hover-overlay cursor-grab active:cursor-grabbing touch-none"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="w-4 h-4" />
    </button>
  );

  const DeleteButton = ({ className = "absolute -right-8 top-1" }: { className?: string }) => (
    <button
      onClick={onDelete}
      className={cn(
        "p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-gentle",
        className
      )}
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );

  // ── DIVIDER ────────────────────────────────────────────────────────────────
  if (block.type === 'divider') {
    return (
      <div ref={setNodeRef} style={dragStyle} className="group relative flex items-center py-2">
        <div className="absolute -left-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-gentle">
          <GripHandle />
        </div>
        <hr className="flex-1 border-border" />
        <DeleteButton className="absolute -right-8 top-1/2 -translate-y-1/2" />
      </div>
    );
  }

  // ── CALLOUT ────────────────────────────────────────────────────────────────
  if (block.type === 'callout') {
    const calloutType = block.calloutType || 'info';
    return (
      <div ref={setNodeRef} style={dragStyle} className="group relative py-1">
        <div className="absolute -left-10 top-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-gentle">
          <BlockMenu isPro={isPro} onAdd={handleAddBlock} />
          <GripHandle />
        </div>
        <div className={cn('flex items-start gap-3 p-3 rounded-lg border', calloutStyles[calloutType])}>
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <textarea
            ref={inputRef}
            value={block.content}
            onChange={(e) => { onUpdate({ content: e.target.value }); adjustHeight(e.target); }}
            onKeyDown={handleKeyDown}
            onFocus={onFocus}
            placeholder={config.placeholder}
            rows={1}
            className={cn('flex-1 bg-transparent border-none outline-none resize-none overflow-hidden placeholder:text-current placeholder:opacity-50', config.className)}
          />
        </div>
        <DeleteButton />
      </div>
    );
  }

  // ── QUOTE ──────────────────────────────────────────────────────────────────
  if (block.type === 'quote') {
    return (
      <div ref={setNodeRef} style={dragStyle} className="group relative py-1">
        <div className="absolute -left-10 top-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-gentle">
          <BlockMenu isPro={isPro} onAdd={handleAddBlock} />
          <GripHandle />
        </div>
        <div className="flex items-start border-l-4 border-muted-foreground/30 pl-4">
          <textarea
            ref={inputRef}
            value={block.content}
            onChange={(e) => { onUpdate({ content: e.target.value }); adjustHeight(e.target); }}
            onKeyDown={handleKeyDown}
            onFocus={onFocus}
            placeholder={config.placeholder}
            rows={1}
            className={cn('flex-1 bg-transparent border-none outline-none resize-none overflow-hidden placeholder:text-placeholder', config.className)}
          />
        </div>
        <DeleteButton />
      </div>
    );
  }

  // ── CODE ───────────────────────────────────────────────────────────────────
  if (block.type === 'code') {
    return (
      <div ref={setNodeRef} style={dragStyle} className="group relative py-1">
        <div className="absolute -left-10 top-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-gentle">
          <BlockMenu isPro={isPro} onAdd={handleAddBlock} />
          <GripHandle />
        </div>
        <div className="rounded-lg bg-muted/50 border border-border p-4 overflow-x-auto">
          <textarea
            ref={inputRef}
            value={block.content}
            onChange={(e) => { onUpdate({ content: e.target.value }); adjustHeight(e.target); }}
            onFocus={onFocus}
            placeholder={config.placeholder}
            rows={3}
            className={cn('w-full bg-transparent border-none outline-none resize-none placeholder:text-placeholder', config.className)}
          />
        </div>
        <DeleteButton />
      </div>
    );
  }

  // ── TOGGLE ─────────────────────────────────────────────────────────────────
  if (block.type === 'toggle') {
    return (
      <div ref={setNodeRef} style={dragStyle} className="group relative py-1">
        <div className="absolute -left-10 top-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-gentle">
          <BlockMenu isPro={isPro} onAdd={handleAddBlock} />
          <GripHandle />
        </div>
        <div className="flex items-start gap-2">
          <button
            onClick={() => onUpdate({ collapsed: !block.collapsed })}
            className="p-0.5 mt-0.5 rounded hover:bg-hover-overlay transition-gentle"
          >
            <ChevronRight className={cn('w-4 h-4 transition-transform', !block.collapsed && 'rotate-90')} />
          </button>
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={block.content}
              onChange={(e) => { onUpdate({ content: e.target.value }); adjustHeight(e.target); }}
              onKeyDown={handleKeyDown}
              onFocus={onFocus}
              placeholder={config.placeholder}
              rows={1}
              className={cn('w-full bg-transparent border-none outline-none resize-none overflow-hidden placeholder:text-placeholder', config.className)}
            />
            {!block.collapsed && (
              <div className="pl-2 mt-2 border-l-2 border-border">
                <p className="text-sm text-muted-foreground">Toggle content goes here...</p>
              </div>
            )}
          </div>
        </div>
        <DeleteButton />
      </div>
    );
  }

  // ── IMAGE ──────────────────────────────────────────────────────────────────
  if (block.type === 'image') {
    return (
      <div ref={setNodeRef} style={dragStyle}>
        <ImageBlock block={block} onUpdate={onUpdate} onDelete={onDelete} />
      </div>
    );
  }

  // ── EMBED ──────────────────────────────────────────────────────────────────
  if (block.type === 'embed') {
    return (
      <div ref={setNodeRef} style={dragStyle}>
        <EmbedBlock block={block} onUpdate={onUpdate} onDelete={onDelete} />
      </div>
    );
  }

  // ── BULLET LIST ────────────────────────────────────────────────────────────
  if (block.type === 'bullet') {
    return (
      <div ref={setNodeRef} style={dragStyle} className="group relative flex items-start py-0.5 gap-2">
        <div className="absolute -left-10 top-0.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-gentle">
          <BlockMenu isPro={isPro} onAdd={handleAddBlock} />
          <GripHandle />
        </div>
        <span className="mt-1 w-4 text-muted-foreground flex-shrink-0 text-center select-none leading-relaxed">•</span>
        <textarea
          ref={inputRef}
          value={block.content}
          onChange={(e) => { onUpdate({ content: e.target.value }); adjustHeight(e.target); }}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          placeholder={config.placeholder}
          rows={1}
          className={cn('flex-1 bg-transparent border-none outline-none resize-none overflow-hidden placeholder:text-placeholder', config.className)}
          style={{ minHeight: '1.5em' }}
        />
        <DeleteButton className="absolute -right-8 top-0.5" />
      </div>
    );
  }

  // ── NUMBERED LIST ──────────────────────────────────────────────────────────
  if (block.type === 'numbered') {
    return (
      <div ref={setNodeRef} style={dragStyle} className="group relative flex items-start py-0.5 gap-2">
        <div className="absolute -left-10 top-0.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-gentle">
          <BlockMenu isPro={isPro} onAdd={handleAddBlock} />
          <GripHandle />
        </div>
        <span className="mt-0.5 w-5 text-muted-foreground flex-shrink-0 text-sm select-none text-right leading-relaxed">1.</span>
        <textarea
          ref={inputRef}
          value={block.content}
          onChange={(e) => { onUpdate({ content: e.target.value }); adjustHeight(e.target); }}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          placeholder={config.placeholder}
          rows={1}
          className={cn('flex-1 bg-transparent border-none outline-none resize-none overflow-hidden placeholder:text-placeholder', config.className)}
          style={{ minHeight: '1.5em' }}
        />
        <DeleteButton className="absolute -right-8 top-0.5" />
      </div>
    );
  }

  // ── MATH ───────────────────────────────────────────────────────────────────
  if (block.type === 'math') {
    return (
      <div ref={setNodeRef} style={dragStyle} className="group relative py-1">
        <div className="absolute -left-10 top-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-gentle">
          <GripHandle />
        </div>
        <div className="rounded-lg bg-muted/30 border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sigma className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Math (LaTeX)</span>
          </div>
          <textarea
            ref={inputRef}
            value={block.content}
            onChange={(e) => { onUpdate({ content: e.target.value }); adjustHeight(e.target); }}
            onFocus={onFocus}
            placeholder={config.placeholder}
            rows={2}
            className={cn('w-full bg-transparent border-none outline-none resize-none placeholder:text-placeholder', config.className)}
          />
          {block.content && (
            <div className="mt-2 pt-2 border-t border-border">
              <code className="text-sm text-foreground/70 italic">{block.content}</code>
            </div>
          )}
        </div>
        <DeleteButton />
      </div>
    );
  }

  // ── DEFAULT (text, headings, checklist) ────────────────────────────────────
  return (
    <div ref={setNodeRef} style={dragStyle} className="group relative flex items-start py-0.5">
      {/* Left controls */}
      <div className="absolute -left-14 top-0.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-gentle">
        <AIWriteButton block={block} onUpdate={onUpdate} />
        <BlockMenu isPro={isPro} onAdd={handleAddBlock} />
        <GripHandle />
      </div>

      {/* Checkbox for checklist */}
      {block.type === 'checklist' && (
        <button
          onClick={() => onUpdate({ checked: !block.checked })}
          className={cn(
            'w-4 h-4 mt-1 mr-2 rounded border flex items-center justify-center transition-gentle flex-shrink-0',
            block.checked
              ? 'bg-accent border-accent text-accent-foreground'
              : 'border-muted-foreground/40 hover:border-accent'
          )}
        >
          {block.checked && <Check className="w-3 h-3" />}
        </button>
      )}

      {/* Content */}
      <textarea
        ref={inputRef}
        value={block.content}
        onChange={(e) => { onUpdate({ content: e.target.value }); adjustHeight(e.target); }}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        placeholder={config.placeholder}
        rows={1}
        className={cn(
          'flex-1 bg-transparent border-none outline-none resize-none overflow-hidden placeholder:text-placeholder',
          config.className,
          block.type === 'checklist' && block.checked && 'line-through text-muted-foreground'
        )}
        style={{ minHeight: '1.5em' }}
      />

      {/* Delete button */}
      <DeleteButton className="absolute -right-8 top-0.5" />
    </div>
  );
}

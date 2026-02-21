import { useState, useRef, useEffect, useMemo } from 'react';
import { BlockType, isPremiumBlock } from '@/types/workspace';
import { AlertCircle, Quote, Code, Table, ChevronRight, Image, Link, Layout, Database, Crown, List, ListOrdered, Sigma } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SlashCommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: BlockType) => void;
  isPro: boolean;
  position?: { top: number; left: number };
}

const allCommands: { type: BlockType; label: string; icon: React.ReactNode; premium: boolean }[] = [
  { type: 'text', label: 'Text', icon: <span className="w-4 h-4 flex items-center justify-center text-xs">📝</span>, premium: false },
  { type: 'heading1', label: 'Heading 1', icon: <span className="w-4 h-4 flex items-center justify-center text-xs font-bold">H1</span>, premium: false },
  { type: 'heading2', label: 'Heading 2', icon: <span className="w-4 h-4 flex items-center justify-center text-xs font-bold">H2</span>, premium: false },
  { type: 'heading3', label: 'Heading 3', icon: <span className="w-4 h-4 flex items-center justify-center text-xs font-bold">H3</span>, premium: false },
  { type: 'bullet', label: 'Bullet List', icon: <List className="w-4 h-4" />, premium: false },
  { type: 'numbered', label: 'Numbered List', icon: <ListOrdered className="w-4 h-4" />, premium: false },
  { type: 'checklist', label: 'Checklist', icon: <span className="w-4 h-4 flex items-center justify-center text-xs">☑️</span>, premium: false },
  { type: 'divider', label: 'Divider', icon: <span className="w-4 h-4 flex items-center justify-center text-xs">—</span>, premium: false },
  { type: 'callout', label: 'Callout', icon: <AlertCircle className="w-4 h-4" />, premium: true },
  { type: 'quote', label: 'Quote', icon: <Quote className="w-4 h-4" />, premium: true },
  { type: 'code', label: 'Code', icon: <Code className="w-4 h-4" />, premium: true },
  { type: 'math', label: 'Math', icon: <Sigma className="w-4 h-4" />, premium: true },
  { type: 'table', label: 'Table', icon: <Table className="w-4 h-4" />, premium: true },
  { type: 'toggle', label: 'Toggle', icon: <ChevronRight className="w-4 h-4" />, premium: true },
  { type: 'image', label: 'Image', icon: <Image className="w-4 h-4" />, premium: true },
  { type: 'embed', label: 'Embed', icon: <Link className="w-4 h-4" />, premium: true },
  { type: 'kanban', label: 'Kanban', icon: <Layout className="w-4 h-4" />, premium: true },
  { type: 'database', label: 'Database', icon: <Database className="w-4 h-4" />, premium: true },
];

export function SlashCommandMenu({ isOpen, onClose, onSelect, isPro, position }: SlashCommandMenuProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allCommands.filter((cmd) => {
      if (cmd.premium && !isPro) return false;
      return cmd.label.toLowerCase().includes(q) || cmd.type.includes(q);
    });
  }, [search, isPro]);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      // Small delay to allow mount
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        onSelect(filtered[selectedIndex].type);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-56 bg-popover border border-border rounded-lg shadow-xl overflow-hidden"
      style={position ? { top: position.top, left: position.left } : { top: '100%', left: 0 }}
    >
      <div className="px-2 pt-2 pb-1">
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search blocks..."
          className="w-full bg-muted rounded px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div className="max-h-64 overflow-y-auto py-1">
        {filtered.length === 0 && (
          <div className="px-3 py-2 text-sm text-muted-foreground">No blocks found</div>
        )}
        {filtered.map((cmd, i) => (
          <button
            key={cmd.type}
            onClick={() => onSelect(cmd.type)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-hover-overlay transition-gentle',
              i === selectedIndex && 'bg-hover-overlay'
            )}
          >
            <span className="w-5 flex items-center justify-center text-muted-foreground">{cmd.icon}</span>
            <span>{cmd.label}</span>
            {cmd.premium && <Crown className="w-3 h-3 text-muted-foreground ml-auto" />}
          </button>
        ))}
        {!isPro && (
          <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border mt-1">
            <Crown className="w-3 h-3 inline mr-1" />
            Upgrade to Pro for more block types
          </div>
        )}
      </div>
    </div>
  );
}

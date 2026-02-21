import { useState, useEffect, useCallback, useRef } from 'react';
import { Bold, Italic, Underline, Link, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingToolbarProps {
  containerRef: React.RefObject<HTMLDivElement>;
}

export function FloatingToolbar({ containerRef }: FloatingToolbarProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const toolbarRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);

  const checkSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !containerRef.current) {
      if (!showLinkInput) setVisible(false);
      return;
    }

    // Check if selection is within our container
    const range = sel.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      if (!showLinkInput) setVisible(false);
      return;
    }

    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    setPosition({
      top: rect.top - containerRect.top - 44,
      left: rect.left - containerRect.left + rect.width / 2,
    });
    setVisible(true);
  }, [containerRef, showLinkInput]);

  useEffect(() => {
    document.addEventListener('selectionchange', checkSelection);
    return () => document.removeEventListener('selectionchange', checkSelection);
  }, [checkSelection]);

  const execFormat = (command: string, value?: string) => {
    // Restore saved range if needed
    if (savedRange.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRange.current);
      savedRange.current = null;
    }
    document.execCommand(command, false, value);
    containerRef.current?.focus();
  };

  const isActive = (command: string) => {
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  };

  const handleLinkClick = () => {
    // Save the current selection before opening link input
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
    setShowLinkInput(true);
    setLinkUrl('');
  };

  const applyLink = () => {
    if (linkUrl.trim()) {
      const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
      execFormat('createLink', url);
    }
    setShowLinkInput(false);
    setLinkUrl('');
  };

  if (!visible) return null;

  return (
    <div
      ref={toolbarRef}
      className="absolute z-50 flex items-center gap-0.5 bg-popover border border-border rounded-lg shadow-lg px-1 py-0.5 -translate-x-1/2"
      style={{ top: position.top, left: position.left }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {showLinkInput ? (
        <div className="flex items-center gap-1 px-1">
          <input
            autoFocus
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyLink();
              if (e.key === 'Escape') { setShowLinkInput(false); setLinkUrl(''); }
            }}
            placeholder="Paste link..."
            className="w-40 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button onClick={applyLink} className="p-1 rounded hover:bg-hover-overlay text-accent">
            <Link className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { setShowLinkInput(false); setLinkUrl(''); }} className="p-1 rounded hover:bg-hover-overlay text-muted-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={() => execFormat('bold')}
            className={cn('p-1.5 rounded hover:bg-hover-overlay transition-gentle', isActive('bold') && 'bg-hover-overlay text-accent')}
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => execFormat('italic')}
            className={cn('p-1.5 rounded hover:bg-hover-overlay transition-gentle', isActive('italic') && 'bg-hover-overlay text-accent')}
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => execFormat('underline')}
            className={cn('p-1.5 rounded hover:bg-hover-overlay transition-gentle', isActive('underline') && 'bg-hover-overlay text-accent')}
            title="Underline"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <button
            onClick={handleLinkClick}
            className="p-1.5 rounded hover:bg-hover-overlay transition-gentle"
            title="Add link"
          >
            <Link className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

import { useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { FloatingToolbar } from './FloatingToolbar';

interface RichTextInputProps {
  value: string;
  onChange: (html: string) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
  onFocus?: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  style?: React.CSSProperties;
}

export function RichTextInput({
  value,
  onChange,
  onKeyDown,
  onFocus,
  placeholder,
  className,
  autoFocus,
  style,
}: RichTextInputProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false);
  const lastValue = useRef(value);

  // Sync external value → DOM only when it actually changed externally
  useEffect(() => {
    if (!ref.current) return;
    if (lastValue.current !== value) {
      // Only update DOM if the value truly changed from outside
      const current = ref.current.innerHTML;
      // Strip empty tags to compare
      const normalize = (s: string) => s.replace(/<br\s*\/?>/gi, '').replace(/&nbsp;/gi, ' ').trim();
      if (normalize(current) !== normalize(value)) {
        ref.current.innerHTML = value || '';
      }
      lastValue.current = value;
    }
  }, [value]);

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
      // Place cursor at end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [autoFocus]);

  const handleInput = useCallback(() => {
    if (!ref.current || isComposing.current) return;
    const html = ref.current.innerHTML;
    // Treat <br> only as empty
    const cleaned = html === '<br>' ? '' : html;
    lastValue.current = cleaned;
    onChange(cleaned);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const mod = e.metaKey || e.ctrlKey;

    // Rich text shortcuts
    if (mod && e.key === 'b') {
      e.preventDefault();
      document.execCommand('bold');
      return;
    }
    if (mod && e.key === 'i') {
      e.preventDefault();
      document.execCommand('italic');
      return;
    }
    if (mod && e.key === 'u') {
      e.preventDefault();
      document.execCommand('underline');
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onKeyDown?.(e);
      return;
    }
    if (e.key === 'Backspace') {
      const el = ref.current;
      if (el) {
        const text = el.textContent || '';
        if (text === '') {
          e.preventDefault();
          onKeyDown?.(e);
          return;
        }
      }
    }
    onKeyDown?.(e);
  }, [onKeyDown]);

  const isEmpty = !value || value === '<br>' || value.replace(/<[^>]*>/g, '').trim() === '';

  return (
    <div className="relative flex-1">
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        onCompositionStart={() => { isComposing.current = true; }}
        onCompositionEnd={() => { isComposing.current = false; handleInput(); }}
        className={cn(
          'outline-none min-h-[1.5em] break-words',
          '[&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline [&_a]:text-accent [&_a]:underline [&_a]:cursor-pointer',
          className
        )}
        style={style}
        data-placeholder={placeholder}
      />
      {isEmpty && placeholder && (
        <span className="absolute top-0 left-0 pointer-events-none text-placeholder select-none">
          {placeholder}
        </span>
      )}
      <FloatingToolbar containerRef={ref} />
    </div>
  );
}

import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, X, FileText, Mail, Calendar, HardDrive, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Page } from '@/types/workspace';
import { useGoogleIntegrations } from '@/hooks/useGoogleIntegrations';

interface UnifiedSearchProps {
  pages: Page[];
  onSelectPage: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  id: string;
  type: 'page' | 'gmail' | 'calendar' | 'drive';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  action?: () => void;
}

export function UnifiedSearch({ pages, onSelectPage, isOpen, onClose }: UnifiedSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isConnected, fetchGmailMessages, fetchCalendarEvents, searchDriveFiles } = useGoogleIntegrations();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const lowerQ = q.toLowerCase();
    const allResults: SearchResult[] = [];

    // Search local pages
    pages.forEach(page => {
      const titleMatch = page.title.toLowerCase().includes(lowerQ);
      const contentMatch = page.blocks.some(b => b.content.toLowerCase().includes(lowerQ));
      if (titleMatch || contentMatch) {
        allResults.push({
          id: `page-${page.id}`,
          type: 'page',
          title: page.title,
          subtitle: contentMatch ? 'Content match' : 'Title match',
          icon: <FileText className="w-4 h-4 text-blue-500" />,
          action: () => { onSelectPage(page.id); onClose(); },
        });
      }
    });

    // Search Google services if connected
    if (isConnected) {
      try {
        const [emails, events, files] = await Promise.allSettled([
          fetchGmailMessages(),
          fetchCalendarEvents(),
          searchDriveFiles(q),
        ]);

        if (emails.status === 'fulfilled') {
          emails.value.filter(e => 
            e.subject.toLowerCase().includes(lowerQ) || 
            e.from.toLowerCase().includes(lowerQ)
          ).slice(0, 3).forEach(email => {
            allResults.push({
              id: `gmail-${email.id}`,
              type: 'gmail',
              title: email.subject,
              subtitle: email.from,
              icon: <Mail className="w-4 h-4 text-red-500" />,
            });
          });
        }

        if (events.status === 'fulfilled') {
          events.value.filter(e => 
            e.title.toLowerCase().includes(lowerQ)
          ).slice(0, 3).forEach(event => {
            allResults.push({
              id: `cal-${event.id}`,
              type: 'calendar',
              title: event.title,
              subtitle: new Date(event.start).toLocaleDateString(),
              icon: <Calendar className="w-4 h-4 text-green-500" />,
            });
          });
        }

        if (files.status === 'fulfilled') {
          files.value.slice(0, 3).forEach(file => {
            allResults.push({
              id: `drive-${file.id}`,
              type: 'drive',
              title: file.name,
              subtitle: file.type,
              icon: <HardDrive className="w-4 h-4 text-yellow-500" />,
              action: file.webViewLink ? () => window.open(file.webViewLink, '_blank') : undefined,
            });
          });
        }
      } catch {
        // Silently fail for Google services
      }
    }

    setResults(allResults);
    setSelectedIndex(0);
    setLoading(false);
  }, [pages, isConnected, fetchGmailMessages, fetchCalendarEvents, searchDriveFiles, onSelectPage, onClose]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]?.action) {
      e.preventDefault();
      results[selectedIndex].action!();
    }
  };

  if (!isOpen) return null;

  const typeLabels: Record<string, string> = {
    page: 'Pages',
    gmail: 'Gmail',
    calendar: 'Calendar',
    drive: 'Drive',
  };

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-popover border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, emails, events, files..."
            className="border-0 shadow-none focus-visible:ring-0 px-0 h-auto text-base"
          />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          <button onClick={onClose} className="p-1 rounded hover:bg-muted">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {query && !loading && results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No results found for "{query}"
            </div>
          )}

          {Object.entries(grouped).map(([type, items]) => (
            <div key={type}>
              <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/30">
                {typeLabels[type] || type}
              </div>
              {items.map(item => {
                flatIndex++;
                const idx = flatIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => item.action?.()}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-hover-overlay transition-gentle',
                      idx === selectedIndex && 'bg-hover-overlay'
                    )}
                  >
                    {item.icon}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}

          {!query && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Type to search across pages{isConnected ? ', emails, events, and files' : ''}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground flex items-center gap-4">
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}

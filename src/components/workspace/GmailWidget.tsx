import { useState, useEffect, useCallback, useRef } from 'react';
import { Mail, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useGoogleIntegrations } from '@/hooks/useGoogleIntegrations';
import { cn } from '@/lib/utils';

export function GmailWidget() {
  const { isConnected, fetchGmailMessages } = useGoogleIntegrations();
  const [emails, setEmails] = useState<{ id: string; subject: string; from: string; date: string; snippet: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevCountRef = useRef(0);

  const loadEmails = useCallback(async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const msgs = await fetchGmailMessages();
      setEmails(msgs.slice(0, 5));

      // Flash notification if new emails arrived
      if (prevCountRef.current > 0 && msgs.length > prevCountRef.current) {
        // Trigger a visual pulse by temporarily bumping count
        setUnreadCount(msgs.length);
      } else {
        setUnreadCount(msgs.length);
      }
      prevCountRef.current = msgs.length;
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [isConnected, fetchGmailMessages]);

  useEffect(() => {
    loadEmails();
    // Poll every 30 seconds for near-real-time updates
    const interval = setInterval(loadEmails, 30 * 1000);
    return () => clearInterval(interval);
  }, [loadEmails]);

  if (!isConnected) return null;

  return (
    <div className="border-t border-sidebar-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-gentle"
      >
        <Mail className="w-4 h-4" />
        <span className="flex-1 text-left font-medium">Gmail</span>
        {unreadCount > 0 && (
          <span className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="px-2 pb-2">
          <div className="flex items-center justify-end mb-1">
            <button
              onClick={loadEmails}
              disabled={loading}
              className="p-1 rounded hover:bg-sidebar-accent/50 text-sidebar-foreground/60"
            >
              <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
            </button>
          </div>

          {emails.length === 0 && !loading && (
            <p className="text-xs text-sidebar-foreground/50 px-2 py-1">No recent emails</p>
          )}

          <div className="space-y-0.5">
            {emails.map(email => (
              <div
                key={email.id}
                className="rounded-md px-2 py-1.5 hover:bg-sidebar-accent/50 cursor-default transition-gentle"
              >
                <p className="text-xs font-medium text-sidebar-foreground truncate">{email.subject}</p>
                <p className="text-[10px] text-sidebar-foreground/50 truncate">{email.from}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

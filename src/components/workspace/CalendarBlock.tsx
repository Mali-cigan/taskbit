import { useState, useEffect, useCallback } from 'react';
import { Block } from '@/types/workspace';
import { Calendar, RefreshCw, Trash2, Clock, MapPin, Loader2 } from 'lucide-react';
import { useGoogleIntegrations } from '@/hooks/useGoogleIntegrations';
import { cn } from '@/lib/utils';

interface CalendarBlockProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
  onDelete: () => void;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
}

export function CalendarBlock({ block, onUpdate, onDelete }: CalendarBlockProps) {
  const { isConnected, fetchCalendarEvents } = useGoogleIntegrations();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const loadEvents = useCallback(async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const evts = await fetchCalendarEvents();
      setEvents(evts.slice(0, 5));
      setLastRefresh(new Date());
      // Store a timestamp in content so the block knows it has data
      onUpdate({ content: JSON.stringify({ lastRefresh: new Date().toISOString(), count: evts.length }) });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [isConnected, fetchCalendarEvents]);

  useEffect(() => {
    loadEvents();
    // Auto-refresh every 10 minutes
    const interval = setInterval(loadEvents, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadEvents]);

  if (!isConnected) {
    return (
      <div className="group relative py-2">
        <div className="border-2 border-dashed border-border rounded-lg p-6 bg-muted/20 text-center">
          <Calendar className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Connect Google to embed calendar events</p>
        </div>
        <button onClick={onDelete} className="absolute -right-8 top-2 p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-gentle">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit',
      });
    } catch { return dateStr; }
  };

  return (
    <div className="group relative py-2">
      <div className="rounded-lg border border-border bg-muted/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/30 border-b border-border">
          <Calendar className="w-4 h-4 text-green-500" />
          <span className="text-sm font-medium flex-1">Upcoming Events</span>
          <button
            onClick={loadEvents}
            disabled={loading}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
          {lastRefresh && (
            <span className="text-[10px] text-muted-foreground">
              {lastRefresh.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* Events */}
        <div className="divide-y divide-border">
          {loading && events.length === 0 && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && events.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No upcoming events
            </div>
          )}

          {events.map(event => (
            <div key={event.id} className="px-4 py-2.5 hover:bg-muted/20 transition-gentle">
              <p className="text-sm font-medium">{event.title}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {formatTime(event.start)}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate max-w-[150px]">{event.location}</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={onDelete} className="absolute -right-8 top-2 p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-gentle">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

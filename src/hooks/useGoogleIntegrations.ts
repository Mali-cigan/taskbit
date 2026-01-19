import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface GoogleIntegration {
  gmail_enabled: boolean;
  calendar_enabled: boolean;
  drive_enabled: boolean;
}

interface GmailMessage {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
}

interface DriveFile {
  id: string;
  name: string;
  type: string;
  isFolder: boolean;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
  iconLink?: string;
}

export function useGoogleIntegrations() {
  const { user } = useAuth();
  const [integration, setIntegration] = useState<GoogleIntegration | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchIntegration() {
      if (!user) {
        setIntegration(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('google_integrations')
        .select('gmail_enabled, calendar_enabled, drive_enabled')
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        setIntegration(data);
      }
      setLoading(false);
    }

    fetchIntegration();
  }, [user]);

  const connect = useCallback(async () => {
    try {
      // Call google-auth with action=authorize query param
      const { data, error } = await supabase.functions.invoke('google-auth', {
        body: { action: 'authorize' },
      });

      if (error) {
        console.error('Google auth error:', error);
        throw new Error(error.message);
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No authorization URL returned');
      }
    } catch (err) {
      console.error('Failed to connect Google:', err);
      throw err;
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const { error } = await supabase.functions.invoke('google-auth', {
        body: { action: 'disconnect' },
      });

      if (error) {
        console.error('Google disconnect error:', error);
        throw new Error(error.message);
      }

      setIntegration(null);
    } catch (err) {
      console.error('Failed to disconnect Google:', err);
      throw err;
    }
  }, []);

  const fetchGmailMessages = useCallback(async (): Promise<GmailMessage[]> => {
    const { data, error } = await supabase.functions.invoke('google-gmail', {
      body: { action: 'list' },
    });

    if (error) {
      throw new Error(error.message);
    }

    return data?.messages || [];
  }, []);

  const fetchCalendarEvents = useCallback(async (): Promise<CalendarEvent[]> => {
    const { data, error } = await supabase.functions.invoke('google-calendar', {
      body: { action: 'list' },
    });

    if (error) {
      throw new Error(error.message);
    }

    return data?.events || [];
  }, []);

  const createCalendarEvent = useCallback(async (event: {
    title: string;
    start: string;
    end: string;
    description?: string;
    location?: string;
  }) => {
    const { data, error } = await supabase.functions.invoke('google-calendar', {
      body: { action: 'create', ...event },
    });

    if (error) {
      throw new Error(error.message);
    }

    return data?.event;
  }, []);

  const fetchDriveFiles = useCallback(async (folderId?: string): Promise<DriveFile[]> => {
    const { data, error } = await supabase.functions.invoke('google-drive', {
      body: { action: 'list', folderId },
    });

    if (error) {
      throw new Error(error.message);
    }

    return data?.files || [];
  }, []);

  const searchDriveFiles = useCallback(async (query: string): Promise<DriveFile[]> => {
    const { data, error } = await supabase.functions.invoke('google-drive', {
      body: { action: 'search', q: query },
    });

    if (error) {
      throw new Error(error.message);
    }

    return data?.files || [];
  }, []);

  return {
    integration,
    loading,
    isConnected: !!integration,
    connect,
    disconnect,
    fetchGmailMessages,
    fetchCalendarEvents,
    createCalendarEvent,
    fetchDriveFiles,
    searchDriveFiles,
  };
}

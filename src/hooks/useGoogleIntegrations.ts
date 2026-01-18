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
    const { data, error } = await supabase.functions.invoke('google-auth', {
      body: {},
    });

    if (error) {
      throw new Error(error.message);
    }

    // The function returns an authorize URL we need to construct
    const response = await supabase.functions.invoke('google-auth?action=authorize', {
      body: {},
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    if (response.data?.url) {
      window.location.href = response.data.url;
    }
  }, []);

  const disconnect = useCallback(async () => {
    const { error } = await supabase.functions.invoke('google-auth?action=disconnect', {
      body: {},
    });

    if (error) {
      throw new Error(error.message);
    }

    setIntegration(null);
  }, []);

  const fetchGmailMessages = useCallback(async (): Promise<GmailMessage[]> => {
    const { data, error } = await supabase.functions.invoke('google-gmail?action=list', {
      body: {},
    });

    if (error) {
      throw new Error(error.message);
    }

    return data?.messages || [];
  }, []);

  const fetchCalendarEvents = useCallback(async (): Promise<CalendarEvent[]> => {
    const { data, error } = await supabase.functions.invoke('google-calendar?action=list', {
      body: {},
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
    const { data, error } = await supabase.functions.invoke('google-calendar?action=create', {
      body: event,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data?.event;
  }, []);

  const fetchDriveFiles = useCallback(async (folderId?: string): Promise<DriveFile[]> => {
    const query = folderId ? `?action=list&folderId=${folderId}` : '?action=list';
    const { data, error } = await supabase.functions.invoke(`google-drive${query}`, {
      body: {},
    });

    if (error) {
      throw new Error(error.message);
    }

    return data?.files || [];
  }, []);

  const searchDriveFiles = useCallback(async (query: string): Promise<DriveFile[]> => {
    const { data, error } = await supabase.functions.invoke(`google-drive?action=search&q=${encodeURIComponent(query)}`, {
      body: {},
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

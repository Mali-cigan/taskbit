import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Mail, Calendar, HardDrive, ExternalLink, Folder, FileText, RefreshCw } from 'lucide-react';
import { useGoogleIntegrations } from '@/hooks/useGoogleIntegrations';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function GoogleIntegrationsPanel() {
  const {
    integration,
    loading,
    isConnected,
    connect,
    disconnect,
    fetchGmailMessages,
    fetchCalendarEvents,
    fetchDriveFiles,
  } = useGoogleIntegrations();

  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [emails, setEmails] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await connect();
    } catch (error) {
      toast.error('Failed to connect Google account');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnect();
      setEmails([]);
      setEvents([]);
      setFiles([]);
      toast.success('Google account disconnected');
    } catch (error) {
      toast.error('Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  const loadEmails = async () => {
    setLoadingEmails(true);
    try {
      const messages = await fetchGmailMessages();
      setEmails(messages);
    } catch (error) {
      toast.error('Failed to load emails');
    } finally {
      setLoadingEmails(false);
    }
  };

  const loadEvents = async () => {
    setLoadingEvents(true);
    try {
      const calendarEvents = await fetchCalendarEvents();
      setEvents(calendarEvents);
    } catch (error) {
      toast.error('Failed to load calendar events');
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadFiles = async () => {
    setLoadingFiles(true);
    try {
      const driveFiles = await fetchDriveFiles();
      setFiles(driveFiles);
    } catch (error) {
      toast.error('Failed to load Drive files');
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      loadEmails();
      loadEvents();
      loadFiles();
    }
  }, [isConnected]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google Integrations
          </CardTitle>
          <CardDescription>
            Connect your Google account to access Gmail, Calendar, and Drive
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleConnect} disabled={connecting}>
            {connecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect Google Account'
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google Integrations
              <Badge variant="secondary">Connected</Badge>
            </CardTitle>
            <CardDescription>
              Your Google services are connected
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={disconnecting}>
            {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Disconnect'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="gmail" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="gmail" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Gmail
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="drive" className="flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              Drive
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gmail" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium">Recent Emails</h4>
              <Button variant="ghost" size="sm" onClick={loadEmails} disabled={loadingEmails}>
                <RefreshCw className={`w-4 h-4 ${loadingEmails ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <ScrollArea className="h-64">
              {loadingEmails ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : emails.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No emails found</p>
              ) : (
                <div className="space-y-2">
                  {emails.map((email) => (
                    <div key={email.id} className="p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <p className="font-medium text-sm truncate">{email.subject}</p>
                      <p className="text-xs text-muted-foreground truncate">{email.from}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{email.snippet}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium">Upcoming Events</h4>
              <Button variant="ghost" size="sm" onClick={loadEvents} disabled={loadingEvents}>
                <RefreshCw className={`w-4 h-4 ${loadingEvents ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <ScrollArea className="h-64">
              {loadingEvents ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : events.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No upcoming events</p>
              ) : (
                <div className="space-y-2">
                  {events.map((event) => (
                    <div key={event.id} className="p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <p className="font-medium text-sm">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.start && format(new Date(event.start), 'MMM d, yyyy h:mm a')}
                      </p>
                      {event.location && (
                        <p className="text-xs text-muted-foreground mt-1">{event.location}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="drive" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium">Recent Files</h4>
              <Button variant="ghost" size="sm" onClick={loadFiles} disabled={loadingFiles}>
                <RefreshCw className={`w-4 h-4 ${loadingFiles ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <ScrollArea className="h-64">
              {loadingFiles ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : files.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No files found</p>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div key={file.id} className="p-3 rounded-lg border hover:bg-muted/50 transition-colors flex items-center gap-3">
                      {file.isFolder ? (
                        <Folder className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      ) : (
                        <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{file.name}</p>
                        {file.modifiedTime && (
                          <p className="text-xs text-muted-foreground">
                            Modified {format(new Date(file.modifiedTime), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

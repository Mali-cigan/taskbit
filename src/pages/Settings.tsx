import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useTheme } from '@/components/ThemeProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Loader2, Moon, Sun, Monitor, Users, Crown, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GoogleIntegrationsPanel } from '@/components/integrations/GoogleIntegrationsPanel';

export default function Settings() {
  const { user, loading, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const { isPro, loading: isLoadingSubscription } = useSubscription();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (data) {
          setDisplayName(data.display_name || '');
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadProfile();
  }, [user]);

  // Show toast when Google is connected
  useEffect(() => {
    if (searchParams.get('google') === 'connected') {
      toast({
        title: "Google Connected",
        description: "Your Google account has been connected successfully.",
      });
    }
  }, [searchParams, toast]);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading || isLoadingProfile || isLoadingSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  const getInitials = () => {
    if (displayName) {
      return displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user.email?.slice(0, 2).toUpperCase() || 'U';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 px-6 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <span className="font-semibold text-foreground">Settings</span>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile</CardTitle>
            <CardDescription>Manage your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{user.email}</p>
                {isPro && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-accent">
                    <Crown className="w-3 h-3" />
                    <span>Pro Plan</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <Button onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Appearance Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Appearance</CardTitle>
            <CardDescription>Customize how Taskbit looks on your device</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-gentle ${
                  theme === 'light' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <Sun className="w-5 h-5" />
                <span className="text-sm font-medium">Light</span>
                {theme === 'light' && <Check className="w-4 h-4 text-primary" />}
              </button>

              <button
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-gentle ${
                  theme === 'dark' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <Moon className="w-5 h-5" />
                <span className="text-sm font-medium">Dark</span>
                {theme === 'dark' && <Check className="w-4 h-4 text-primary" />}
              </button>

              <button
                onClick={() => setTheme('system')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-gentle ${
                  theme === 'system' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <Monitor className="w-5 h-5" />
                <span className="text-sm font-medium">System</span>
                {theme === 'system' && <Check className="w-4 h-4 text-primary" />}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Google Integrations - Pro Feature */}
        {isPro ? (
          <GoogleIntegrationsPanel />
        ) : (
          <Card className="opacity-75">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google Integrations
                  </CardTitle>
                  <CardDescription>Connect Gmail, Calendar, and Drive</CardDescription>
                </div>
                <Link to="/pricing">
                  <Button variant="outline" size="sm" className="gap-1">
                    <Crown className="w-3 h-3" />
                    Upgrade to Pro
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <svg className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <p className="text-sm text-muted-foreground mb-3">
                  Gmail, Calendar, and Drive integrations are available on the Pro plan
                </p>
                <Link to="/pricing">
                  <Button variant="outline" size="sm">
                    Learn more
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Section - Pro Feature */}
        <Card className={!isPro ? 'opacity-75' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team
                </CardTitle>
                <CardDescription>Collaborate with your team members</CardDescription>
              </div>
              {!isPro && (
                <Link to="/pricing">
                  <Button variant="outline" size="sm" className="gap-1">
                    <Crown className="w-3 h-3" />
                    Upgrade to Pro
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isPro ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Invite team members to collaborate on your workspace.
                </p>
                <div className="flex gap-2">
                  <Input placeholder="colleague@example.com" className="flex-1" />
                  <Button>Invite</Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  No team members yet
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">
                  Team collaboration is available on the Pro plan
                </p>
                <Link to="/pricing">
                  <Button variant="outline" size="sm">
                    Learn more
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account</CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sign out</p>
                <p className="text-sm text-muted-foreground">Sign out of your account on this device</p>
              </div>
              <Button variant="outline" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

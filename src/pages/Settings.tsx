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
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Moon, Sun, Monitor, Users, Crown, Check, Shield, LayoutDashboard } from 'lucide-react';
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
  const { isPro, subscription, loading: isLoadingSubscription } = useSubscription();
  
  const [invitedMembers, setInvitedMembers] = useState<{email: string; status: string}[]>([]);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [hasTeamPlan, setHasTeamPlan] = useState(false);
  
  // Pro users can invite up to 2 people, Team users have their seat limit
  const PRO_INVITE_LIMIT = 2;

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
                  Team Collaboration
                </CardTitle>
                <CardDescription>
                  {isPro && !hasTeamPlan ? (
                    <>Invite up to {PRO_INVITE_LIMIT} people with Pro plan</>
                  ) : hasTeamPlan ? (
                    <>Manage your team workspace</>
                  ) : (
                    <>Collaborate with your team members</>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {hasTeamPlan && (
                  <Link to="/admin">
                    <Button variant="outline" size="sm" className="gap-1">
                      <LayoutDashboard className="w-3 h-3" />
                      Admin Dashboard
                    </Button>
                  </Link>
                )}
                {!isPro && (
                  <Link to="/pricing">
                    <Button variant="outline" size="sm" className="gap-1">
                      <Crown className="w-3 h-3" />
                      Upgrade to Pro
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isPro ? (
              <div className="space-y-4">
                {/* Invite limit indicator for Pro (non-team) */}
                {!hasTeamPlan && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        <Users className="w-3 h-3" />
                        {invitedMembers.length} / {PRO_INVITE_LIMIT} invites used
                      </Badge>
                    </div>
                    <Link to="/pricing">
                      <Button variant="ghost" size="sm" className="text-xs gap-1">
                        <Shield className="w-3 h-3" />
                        Upgrade to Team for unlimited
                      </Button>
                    </Link>
                  </div>
                )}

                {/* Invite form */}
                <div className="flex gap-2">
                  <Input 
                    placeholder="colleague@example.com" 
                    className="flex-1"
                    value={newInviteEmail}
                    onChange={(e) => setNewInviteEmail(e.target.value)}
                    type="email"
                    disabled={!hasTeamPlan && invitedMembers.length >= PRO_INVITE_LIMIT}
                  />
                  <Button 
                    onClick={async () => {
                      if (!newInviteEmail.trim() || !user) return;
                      if (!hasTeamPlan && invitedMembers.length >= PRO_INVITE_LIMIT) {
                        toast({
                          title: "Invite limit reached",
                          description: `Pro plan allows up to ${PRO_INVITE_LIMIT} invites. Upgrade to Team for unlimited.`,
                          variant: "destructive",
                        });
                        return;
                      }
                      setIsInviting(true);
                      // Simulated invite - in production this would create a workspace_member record
                      setInvitedMembers([...invitedMembers, { email: newInviteEmail, status: 'pending' }]);
                      setNewInviteEmail('');
                      setIsInviting(false);
                      toast({
                        title: "Invite sent",
                        description: `Invitation sent to ${newInviteEmail}`,
                      });
                    }}
                    disabled={isInviting || (!hasTeamPlan && invitedMembers.length >= PRO_INVITE_LIMIT)}
                  >
                    {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Invite'}
                  </Button>
                </div>

                {/* Invited members list */}
                {invitedMembers.length > 0 ? (
                  <div className="space-y-2">
                    {invitedMembers.map((member, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg border border-border">
                        <span className="text-sm">{member.email}</span>
                        <Badge variant="secondary" className="text-xs">
                          {member.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No team members invited yet
                  </div>
                )}

                {/* Team plan upsell for Pro users */}
                {!hasTeamPlan && (
                  <div className="mt-4 p-4 rounded-lg bg-accent/10 border border-accent/30">
                    <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                      <Crown className="w-4 h-4 text-accent" />
                      Need more team features?
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Upgrade to Team plan for unlimited members, SSO, admin dashboard, and API access.
                    </p>
                    <Link to="/pricing">
                      <Button size="sm" variant="outline">
                        View Team Plan
                      </Button>
                    </Link>
                  </div>
                )}
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

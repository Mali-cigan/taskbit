import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Loader2, Users, Plus, Trash2, Crown, Shield, Key, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TeamMember {
  email: string;
  role: 'admin' | 'member';
}

export default function TeamSetup() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [workspaceName, setWorkspaceName] = useState('');
  const [members, setMembers] = useState<TeamMember[]>([{ email: '', role: 'member' }]);
  const [enableSSO, setEnableSSO] = useState(false);
  const [ssoProvider, setSsoProvider] = useState<'saml' | 'oauth'>('saml');
  const [ssoDomain, setSsoDomain] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const seatCount = members.filter(m => m.email.trim()).length || 1;
  const pricePerSeat = 20;
  const totalPrice = seatCount * pricePerSeat;

  const addMember = () => {
    setMembers([...members, { email: '', role: 'member' }]);
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const updateMember = (index: number, updates: Partial<TeamMember>) => {
    setMembers(members.map((m, i) => i === index ? { ...m, ...updates } : m));
  };

  const handleCreateTeam = async () => {
    if (!user) return;

    const validMembers = members.filter(m => m.email.trim());
    if (!workspaceName.trim()) {
      toast({
        title: "Workspace name required",
        description: "Please enter a name for your team workspace.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      // Create checkout session for team subscription
      const { data, error } = await supabase.functions.invoke('create-team-checkout', {
        body: {
          seatCount: Math.max(validMembers.length, 1),
          workspaceName: workspaceName.trim(),
          members: validMembers,
          ssoEnabled: enableSSO,
          ssoProvider: enableSSO ? ssoProvider : null,
          ssoDomain: enableSSO ? ssoDomain : null,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating team:', error);
      toast({
        title: "Error",
        description: "Failed to create team. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 px-6 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <Link to="/pricing">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <span className="font-semibold text-foreground">Set Up Your Team</span>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Workspace Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="w-5 h-5" />
              Workspace Details
            </CardTitle>
            <CardDescription>Configure your team workspace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspaceName">Workspace Name</Label>
              <Input
                id="workspaceName"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Acme Inc."
              />
            </div>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Members
            </CardTitle>
            <CardDescription>
              Add team members to invite. You'll be the owner.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Owner (current user) */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex-1">
                <p className="font-medium text-sm">{user.email}</p>
                <p className="text-xs text-muted-foreground">Owner (you)</p>
              </div>
              <Crown className="w-4 h-4 text-accent" />
            </div>

            {/* Member inputs */}
            {members.map((member, index) => (
              <div key={index} className="flex items-center gap-3">
                <Input
                  value={member.email}
                  onChange={(e) => updateMember(index, { email: e.target.value })}
                  placeholder="colleague@example.com"
                  className="flex-1"
                  type="email"
                />
                <select
                  value={member.role}
                  onChange={(e) => updateMember(index, { role: e.target.value as 'admin' | 'member' })}
                  className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                {members.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMember(index)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}

            <Button variant="outline" onClick={addMember} className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Add Another Member
            </Button>
          </CardContent>
        </Card>

        {/* SSO Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Enterprise SSO
            </CardTitle>
            <CardDescription>
              Enable Single Sign-On for your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sso-toggle">Enable SSO Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Allow team members to sign in with your identity provider
                </p>
              </div>
              <Switch
                id="sso-toggle"
                checked={enableSSO}
                onCheckedChange={setEnableSSO}
              />
            </div>

            {enableSSO && (
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="space-y-2">
                  <Label>SSO Provider Type</Label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSsoProvider('saml')}
                      className={`flex-1 p-3 rounded-lg border text-center transition-gentle ${
                        ssoProvider === 'saml'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      <Key className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-sm font-medium">SAML 2.0</span>
                    </button>
                    <button
                      onClick={() => setSsoProvider('oauth')}
                      className={`flex-1 p-3 rounded-lg border text-center transition-gentle ${
                        ssoProvider === 'oauth'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      <Shield className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-sm font-medium">OAuth 2.0</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ssoDomain">Email Domain</Label>
                  <Input
                    id="ssoDomain"
                    value={ssoDomain}
                    onChange={(e) => setSsoDomain(e.target.value)}
                    placeholder="acme.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Users with @{ssoDomain || 'yourdomain.com'} emails will use SSO
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing Summary */}
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Team seats</span>
                <span>{seatCount} × ${pricePerSeat}/month</span>
              </div>
              {enableSSO && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">SSO Authentication</span>
                  <span className="text-accent">Included</span>
                </div>
              )}
              <div className="border-t border-border pt-3 flex justify-between font-semibold">
                <span>Total per month</span>
                <span>${totalPrice}/month</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Link to="/pricing" className="flex-1">
            <Button variant="outline" className="w-full">
              Cancel
            </Button>
          </Link>
          <Button
            onClick={handleCreateTeam}
            disabled={isCreating || !workspaceName.trim()}
            className="flex-1 gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Continue to Payment
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

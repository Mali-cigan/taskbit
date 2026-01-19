import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Loader2, Users, Crown, Shield, Settings, BarChart3, Plus, Trash2, Mail, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SSOConfigPanel } from '@/components/admin/SSOConfigPanel';

interface TeamMember {
  id: string;
  email: string;
  role: string;
  status: string;
  joined_at: string | null;
}

interface TeamSubscription {
  id: string;
  workspace_id: string;
  seat_count: number;
  plan: string;
  status: string;
  current_period_end: string | null;
}

interface Workspace {
  id: string;
  name: string;
  owner_id: string;
}

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [subscription, setSubscription] = useState<TeamSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const loadTeamData = async () => {
      if (!user) return;

      try {
        // Get workspace where user is owner
        const { data: workspaceData } = await supabase
          .from('workspaces')
          .select('*')
          .eq('owner_id', user.id)
          .maybeSingle();

        if (!workspaceData) {
          setIsLoading(false);
          return;
        }

        setWorkspace(workspaceData);

        // Get team members
        const { data: membersData } = await supabase
          .from('workspace_members')
          .select('*')
          .eq('workspace_id', workspaceData.id)
          .order('created_at', { ascending: true });

        setMembers(membersData || []);

        // Get subscription
        const { data: subData } = await supabase
          .from('team_subscriptions')
          .select('*')
          .eq('workspace_id', workspaceData.id)
          .maybeSingle();

        setSubscription(subData);
      } catch (error) {
        console.error('Error loading team data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTeamData();
  }, [user]);

  const handleInviteMember = async () => {
    if (!user || !workspace || !newMemberEmail.trim()) return;

    // Check seat limit
    const usedSeats = members.length;
    if (subscription && usedSeats >= subscription.seat_count) {
      toast({
        title: "Seat limit reached",
        description: `You've used all ${subscription.seat_count} seats. Upgrade to add more members.`,
        variant: "destructive",
      });
      return;
    }

    setIsInviting(true);
    try {
      const { error } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          email: newMemberEmail.trim(),
          user_id: user.id, // Placeholder, will be updated when user accepts
          role: 'member',
          status: 'pending',
        });

      if (error) throw error;

      toast({
        title: "Invitation sent",
        description: `Invitation sent to ${newMemberEmail}`,
      });

      setNewMemberEmail('');
      
      // Refresh members
      const { data } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: true });
      
      setMembers(data || []);
    } catch (error) {
      console.error('Error inviting member:', error);
      toast({
        title: "Error",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!workspace) return;

    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      setMembers(members.filter(m => m.id !== memberId));
      toast({
        title: "Member removed",
        description: "Team member has been removed.",
      });
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: "Error",
        description: "Failed to remove member.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('workspace_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m));
      toast({
        title: "Role updated",
        description: `Member role changed to ${newRole}.`,
      });
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  if (!workspace) {
    return (
      <div className="min-h-screen bg-background">
        <header className="h-14 px-6 flex items-center border-b border-border">
          <Link to="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <span className="ml-3 font-semibold">Admin Dashboard</span>
        </header>
        <div className="max-w-2xl mx-auto p-6 text-center">
          <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Team Workspace</h2>
          <p className="text-muted-foreground mb-4">
            You don't have a team workspace yet. Create one to access the admin dashboard.
          </p>
          <Link to="/pricing">
            <Button>Create Team Workspace</Button>
          </Link>
        </div>
      </div>
    );
  }

  const usedSeats = members.length;
  const totalSeats = subscription?.seat_count || 0;

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
          <span className="font-semibold">{workspace.name}</span>
          <Badge variant="outline" className="gap-1">
            <Crown className="w-3 h-3" />
            Team
          </Badge>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-5xl mx-auto p-6">
        <Tabs defaultValue="members" className="space-y-6">
          <TabsList>
            <TabsTrigger value="members" className="gap-2">
              <Users className="w-4 h-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="usage" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Usage
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="w-4 h-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>
                      {usedSeats} of {totalSeats} seats used
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-64"
                      type="email"
                    />
                    <Button
                      onClick={handleInviteMember}
                      disabled={isInviting || !newMemberEmail.trim() || usedSeats >= totalSeats}
                      className="gap-2"
                    >
                      {isInviting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      Invite
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Owner */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {user.email?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.email}</p>
                        <p className="text-sm text-muted-foreground">Owner</p>
                      </div>
                    </div>
                    <Badge className="bg-accent text-accent-foreground">
                      <Crown className="w-3 h-3 mr-1" />
                      Owner
                    </Badge>
                  </div>

                  {/* Members */}
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {member.email.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.email}</p>
                          <div className="flex items-center gap-2">
                            {member.status === 'pending' ? (
                              <Badge variant="secondary" className="text-xs">
                                <Mail className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                <Check className="w-3 h-3 mr-1" />
                                Active
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                          className="h-8 px-2 rounded-md border border-input bg-background text-sm"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {members.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No team members yet. Invite your first member above.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Active Users</CardDescription>
                  <CardTitle className="text-3xl">{usedSeats}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    of {totalSeats} seats
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Pages Created</CardDescription>
                  <CardTitle className="text-3xl">-</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    this month
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>API Calls</CardDescription>
                  <CardTitle className="text-3xl">-</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    this month
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <SSOConfigPanel workspaceId={workspace.id} />

            <Card>
              <CardHeader>
                <CardTitle>API Access</CardTitle>
                <CardDescription>
                  Manage API keys for programmatic access
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Generate API Key
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Workspace Settings</CardTitle>
                <CardDescription>
                  Manage your team workspace configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Workspace Name</label>
                  <Input defaultValue={workspace.name} />
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Subscription</CardTitle>
                <CardDescription>
                  Manage your team subscription and billing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Team Plan</p>
                      <p className="text-sm text-muted-foreground">
                        {totalSeats} seats × $20/month = ${totalSeats * 20}/month
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                      Active
                    </Badge>
                  </div>
                  {subscription?.current_period_end && (
                    <p className="text-sm text-muted-foreground">
                      Next billing date: {new Date(subscription.current_period_end).toLocaleDateString()}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline">Manage Subscription</Button>
                    <Button variant="outline">Add More Seats</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

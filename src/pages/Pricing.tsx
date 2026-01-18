import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2, Minus, Plus, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const PRO_PRICE_ID = 'price_1Sqvy9KefwlQqUtJgM5mDtOr';
const TEAM_PRICE_PER_SEAT = 20; // $20 per seat

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for personal use and getting started',
    features: [
      'Up to 5 pages',
      'Basic block types',
      'Personal workspace',
      'Mobile access',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$10',
    period: 'per month',
    description: 'For professionals who need more power',
    features: [
      'Unlimited pages',
      'All block types',
      'Advanced formatting',
      'Priority support',
      'Export to PDF',
      'Custom themes',
      'Google Gmail integration',
      'Google Calendar sync',
      'Google Drive integration',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Team',
    price: '$20',
    period: 'per user/month',
    description: 'For teams that collaborate together',
    features: [
      'Everything in Pro',
      'Shared workspaces',
      'Team permissions',
      'Admin dashboard',
      'API access',
      'SSO authentication',
    ],
    cta: 'Configure Team',
    popular: false,
  },
];

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const handledSuccessRef = useRef(false);

  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [showPromoInput, setShowPromoInput] = useState(false);
  
  // Team modal state
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [seatCount, setSeatCount] = useState(2);
  const [teamEmails, setTeamEmails] = useState<string[]>(['']);
  const [workspaceName, setWorkspaceName] = useState('');

  useEffect(() => {
    const success = searchParams.get('success') === 'true';
    if (!success || !user) return;
    if (handledSuccessRef.current) return;

    handledSuccessRef.current = true;
    const sessionId = searchParams.get('session_id') ?? undefined;
    const isTeam = searchParams.get('team') === 'true';

    (async () => {
      const { error } = await supabase.functions.invoke('sync-subscription', {
        body: { force: true, sessionId },
      });

      if (error) {
        console.error('Failed to sync subscription after checkout:', error);
        toast.error('Payment succeeded, but we could not activate yet. Please try again in a minute.');
        return;
      }

      toast.success(isTeam ? 'Team plan activated. Welcome!' : 'Pro activated. Welcome!');
      navigate('/settings', { replace: true });
    })();
  }, [navigate, searchParams, user]);

  const handleSubscribe = async (planName: string, withPromo = false) => {
    if (planName === 'Free') {
      window.location.href = '/auth';
      return;
    }

    if (planName === 'Team') {
      if (!user) {
        window.location.href = '/auth';
        return;
      }
      // Navigate to dedicated team setup page
      navigate('/team-setup');
      return;
    }

    if (!user) {
      window.location.href = '/auth';
      return;
    }

    setLoadingPlan(planName);

    try {
      const body: { priceId: string; promoCode?: string } = { priceId: PRO_PRICE_ID };
      
      if (withPromo && promoCode.trim()) {
        body.promoCode = promoCode.trim();
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body,
      });

      if (error) {
        console.error('Checkout error:', error);
        toast.error('Failed to create checkout session');
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Something went wrong');
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleTeamCheckout = async () => {
    if (!user) return;

    // Validate emails
    const validEmails = teamEmails.filter(email => email.trim().length > 0);
    if (validEmails.length !== seatCount - 1) {
      toast.error(`Please enter ${seatCount - 1} team member emails`);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of validEmails) {
      if (!emailRegex.test(email)) {
        toast.error(`Invalid email: ${email}`);
        return;
      }
    }

    setLoadingPlan('Team');

    try {
      const { data, error } = await supabase.functions.invoke('create-team-checkout', {
        body: {
          seatCount,
          teamEmails: validEmails,
          workspaceName: workspaceName.trim() || 'Team Workspace',
        },
      });

      if (error) {
        console.error('Team checkout error:', error);
        toast.error('Failed to create team checkout session');
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Something went wrong');
    } finally {
      setLoadingPlan(null);
    }
  };

  const updateSeatCount = (delta: number) => {
    const newCount = Math.max(2, Math.min(100, seatCount + delta));
    setSeatCount(newCount);
    
    // Adjust email inputs
    const newEmailsNeeded = newCount - 1;
    if (newEmailsNeeded > teamEmails.length) {
      setTeamEmails([...teamEmails, ...Array(newEmailsNeeded - teamEmails.length).fill('')]);
    } else if (newEmailsNeeded < teamEmails.length) {
      setTeamEmails(teamEmails.slice(0, newEmailsNeeded));
    }
  };

  const updateTeamEmail = (index: number, value: string) => {
    const newEmails = [...teamEmails];
    newEmails[index] = value;
    setTeamEmails(newEmails);
  };

  const totalTeamPrice = seatCount * TEAM_PRICE_PER_SEAT;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 px-6 flex items-center justify-between border-b border-border">
        <Link to="/pricing" className="font-semibold text-foreground text-lg">
          Taskbit
        </Link>
        {user ? (
          <Link to="/">
            <Button size="sm">Go to App</Button>
          </Link>
        ) : (
          <Link to="/auth">
            <Button size="sm">Sign In</Button>
          </Link>
        )}
      </header>

      {/* Hero */}
      <section className="py-20 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Choose the plan that works best for you. All plans include a 14-day free trial.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${
                plan.popular
                  ? 'border-accent shadow-lg scale-105'
                  : 'border-border'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-accent text-accent-foreground text-xs font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground ml-1">
                    /{plan.period}
                  </span>
                </div>
                <CardDescription className="mt-2">
                  {plan.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-accent flex-shrink-0" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                {plan.popular && showPromoInput && (
                  <div className="mb-4">
                    <Input
                      placeholder="Enter promo code"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="mb-2"
                    />
                    <Button
                      className="w-full"
                      onClick={() => handleSubscribe(plan.name, true)}
                      disabled={loadingPlan === plan.name || !promoCode.trim()}
                    >
                      {loadingPlan === plan.name ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Apply & Subscribe'
                      )}
                    </Button>
                  </div>
                )}
                
                <Button
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => handleSubscribe(plan.name)}
                  disabled={loadingPlan === plan.name}
                >
                  {loadingPlan === plan.name && !showPromoInput ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : plan.name === 'Team' ? (
                    <>
                      <Users className="w-4 h-4 mr-2" />
                      {plan.cta}
                    </>
                  ) : (
                    plan.cta
                  )}
                </Button>
                
                {plan.popular && (
                  <button
                    type="button"
                    onClick={() => setShowPromoInput(!showPromoInput)}
                    className="w-full mt-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    {showPromoInput ? 'Hide promo code' : 'Have a promo code?'}
                  </button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Team Modal */}
      <Dialog open={showTeamModal} onOpenChange={setShowTeamModal}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Team Plan</DialogTitle>
            <DialogDescription>
              Set up your team workspace with shared access for all members.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Workspace Name */}
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace Name</Label>
              <Input
                id="workspace-name"
                placeholder="e.g., Marketing Team"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
              />
            </div>

            {/* Seat Count */}
            <div className="space-y-2">
              <Label>Number of Seats</Label>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updateSeatCount(-1)}
                  disabled={seatCount <= 2}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-2xl font-bold w-12 text-center">{seatCount}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updateSeatCount(1)}
                  disabled={seatCount >= 100}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {seatCount} seats × ${TEAM_PRICE_PER_SEAT}/month = <strong>${totalTeamPrice}/month</strong>
              </p>
            </div>

            {/* Team Member Emails */}
            <div className="space-y-2">
              <Label>Team Member Emails</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Enter email addresses for your {seatCount - 1} team member{seatCount > 2 ? 's' : ''} (you'll be automatically included as the owner)
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {teamEmails.map((email, index) => (
                  <Input
                    key={index}
                    type="email"
                    placeholder={`team-member-${index + 1}@company.com`}
                    value={email}
                    onChange={(e) => updateTeamEmail(index, e.target.value)}
                  />
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium">Order Summary</h4>
              <div className="flex justify-between text-sm">
                <span>Team Plan ({seatCount} seats)</span>
                <span>${totalTeamPrice}/month</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total</span>
                <span>${totalTeamPrice}/month</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTeamModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleTeamCheckout} disabled={loadingPlan === 'Team'}>
              {loadingPlan === 'Team' ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Continue to Checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          © 2024 Taskbit. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

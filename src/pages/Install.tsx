import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Share, MoreVertical, Plus, Smartphone, Monitor, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-accent" />
            </div>
            <CardTitle className="text-2xl">Already Installed!</CardTitle>
            <CardDescription>
              Taskbit is installed on your device. Open it from your home screen for the best experience.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              Open Taskbit
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 gap-6">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 h-20 w-20 rounded-2xl bg-accent/10 flex items-center justify-center">
          <Download className="h-10 w-10 text-accent" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Install Taskbit</h1>
        <p className="text-muted-foreground">
          Add Taskbit to your home screen for instant access, offline support, and a native app experience.
        </p>
      </div>

      {/* Direct install button (Chrome/Edge on Android & desktop) */}
      {deferredPrompt && (
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <Button onClick={handleInstall} className="w-full gap-2" size="lg">
              <Download className="h-5 w-5" />
              Install Taskbit
            </Button>
          </CardContent>
        </Card>
      )}

      {/* iOS instructions */}
      {isIOS && (
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Install on iPhone / iPad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Step number={1} icon={<Share className="h-4 w-4" />}>
              Tap the <strong>Share</strong> button in Safari's toolbar
            </Step>
            <Step number={2} icon={<Plus className="h-4 w-4" />}>
              Scroll down and tap <strong>"Add to Home Screen"</strong>
            </Step>
            <Step number={3} icon={<CheckCircle2 className="h-4 w-4" />}>
              Tap <strong>"Add"</strong> to confirm
            </Step>
          </CardContent>
        </Card>
      )}

      {/* Android / Desktop fallback */}
      {!isIOS && !deferredPrompt && (
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Install from Browser
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Step number={1} icon={<MoreVertical className="h-4 w-4" />}>
              Open the browser menu (⋮ or ⋯)
            </Step>
            <Step number={2} icon={<Download className="h-4 w-4" />}>
              Tap <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong>
            </Step>
            <Step number={3} icon={<CheckCircle2 className="h-4 w-4" />}>
              Confirm the installation prompt
            </Step>
          </CardContent>
        </Card>
      )}

      <Button variant="ghost" onClick={() => navigate('/')} className="text-muted-foreground">
        Continue in browser instead
      </Button>
    </div>
  );
};

function Step({ number, icon, children }: { number: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-secondary-foreground">
        {number}
      </div>
      <div className="flex items-center gap-2 pt-1 text-sm text-foreground">
        {icon}
        <span>{children}</span>
      </div>
    </div>
  );
}

export default Install;

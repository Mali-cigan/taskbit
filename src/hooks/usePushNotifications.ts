import { useEffect, useCallback, useState } from 'react';

/**
 * Push notifications hook for Capacitor native apps.
 * On web/PWA this is a no-op — the Capacitor plugin is only
 * available inside a native shell.
 */
export function usePushNotifications() {
  const [token, setToken] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Dynamically import so it doesn't break web builds
        const { PushNotifications } = await import('@capacitor/push-notifications');
        if (cancelled) return;

        setSupported(true);

        // Request permission
        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive !== 'granted') return;

        // Register for push
        await PushNotifications.register();

        // Listen for registration token
        PushNotifications.addListener('registration', (t) => {
          if (!cancelled) setToken(t.value);
          console.log('[Push] Registration token:', t.value);
        });

        PushNotifications.addListener('registrationError', (err) => {
          console.error('[Push] Registration error:', err);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('[Push] Received:', notification);
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('[Push] Action:', action);
        });
      } catch {
        // Not running in Capacitor — expected on web
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  return { token, supported };
}

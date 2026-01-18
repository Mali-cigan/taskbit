import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";

export type UserSubscription = Tables<"user_subscriptions">;

type RefreshOptions = {
  force?: boolean;
  sessionId?: string;
};

export function useSubscription() {
  const { user } = useAuth();

  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const didAutoSyncRef = useRef(false);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return null;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      // If the row doesn't exist yet, we'll attempt a sync in refresh().
      console.error("Failed to load subscription:", error);
      setSubscription(null);
      setLoading(false);
      return null;
    }

    setSubscription(data);
    setLoading(false);
    return data;
  }, [user]);

  const refresh = useCallback(
    async (opts: RefreshOptions = {}) => {
      if (!user) return null;

      try {
        await supabase.functions.invoke("sync-subscription", {
          body: {
            force: opts.force ?? false,
            sessionId: opts.sessionId,
          },
        });
      } catch (e) {
        console.error("Failed to sync subscription:", e);
      }

      return fetchSubscription();
    },
    [fetchSubscription, user]
  );

  useEffect(() => {
    didAutoSyncRef.current = false;
    fetchSubscription();
  }, [fetchSubscription, user?.id]);

  // If we don't have a row yet, try a one-time background sync.
  useEffect(() => {
    if (!user) return;
    if (loading) return;
    if (subscription) return;
    if (didAutoSyncRef.current) return;

    didAutoSyncRef.current = true;
    refresh();
  }, [loading, refresh, subscription, user]);

  const isPro =
    subscription?.plan === "pro" &&
    (subscription.status === "active" || subscription.status === "trialing");

  return {
    subscription,
    isPro,
    loading,
    refresh,
  };
}

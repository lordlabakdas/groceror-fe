import { useQuery } from "@tanstack/react-query";
import type { SubscriptionStatus } from "@/types/models";

const POLL_INTERVAL = 60_000;

/**
 * Polls the store owner's subscription status (SPEC_SUBSCRIPTION.md §3.2).
 * Feeds both Layout's lock/grace banner and the Billing page. `enabled`
 * should be false for buyers — subscriptions are a store-owner concern only.
 */
export function useSubscriptionStatus(enabled: boolean) {
  return useQuery<SubscriptionStatus>({
    queryKey: ["/subscription/status"],
    enabled,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: true,
  });
}

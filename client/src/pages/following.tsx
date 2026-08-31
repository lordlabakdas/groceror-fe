import { useEffect, useMemo } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatDistanceToNow, isToday, isYesterday, format } from "date-fns";
import {
  Users,
  Store,
  UserMinus,
  Tag,
  Percent,
  Zap,
  Megaphone,
  Bookmark,
  BookmarkCheck,
  Rocket,
  Clock,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { MyDealsResponse } from "@/pages/my-deals";

// A deal can be saved to My Deals — announcements can't (nothing to bookmark).
const SAVEABLE_TYPES = new Set(["coupon", "promotion", "flash_sale"]);

const FEED_PAGE_SIZE = 20;

interface FollowedStore {
  store_id: string;
  store_name: string;
  is_active: boolean;
  follower_count: number;
  followed_at: string;
}

type UpdateType = "coupon" | "promotion" | "flash_sale" | "announcement" | "sponsored";

interface FeedItem {
  id: string;
  store_id: string;
  store_name: string;
  update_type: UpdateType;
  message: string;
  ref_id: string | null;
  created_at: string;
  discount_label: string | null;
  coupon_code: string | null;
  expires_at: string | null;
}

interface FeedResponse {
  items: FeedItem[];
  unread_count: number;
  has_more: boolean;
}

const UPDATE_STYLE: Record<
  UpdateType,
  { icon: typeof Tag; accentBorder: string; iconBg: string; iconColor: string; chip: string }
> = {
  coupon: {
    icon: Tag,
    accentBorder: "border-l-emerald-500",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    chip: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  },
  promotion: {
    icon: Percent,
    accentBorder: "border-l-blue-500",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    chip: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  },
  flash_sale: {
    icon: Zap,
    accentBorder: "border-l-rose-500",
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-500",
    chip: "bg-rose-500/15 text-rose-600 border-rose-500/30",
  },
  announcement: {
    icon: Megaphone,
    accentBorder: "border-l-border",
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
    chip: "",
  },
  sponsored: {
    icon: Rocket,
    accentBorder: "border-l-amber-500",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
    chip: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  },
};

function dayLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d");
}

// Items already arrive newest-first from the API, so a single pass grouping
// consecutive same-day items preserves order without needing to re-sort.
function groupByDay(items: FeedItem[]): { label: string; items: FeedItem[] }[] {
  const groups: { label: string; items: FeedItem[] }[] = [];
  for (const item of items) {
    const label = dayLabel(new Date(item.created_at));
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }
  return groups;
}

function ExpiryBadge({ expiresAt }: { expiresAt: string }) {
  const date = new Date(expiresAt);
  const ended = date.getTime() < Date.now();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full",
        ended ? "bg-muted text-muted-foreground" : "bg-rose-500/15 text-rose-600 animate-pulse"
      )}
    >
      <Clock className="h-2.5 w-2.5" />
      {ended ? "Ended" : `Ends ${formatDistanceToNow(date, { addSuffix: true })}`}
    </span>
  );
}

function FeedCard({
  item,
  isSaved,
  onSave,
  savePending,
}: {
  item: FeedItem;
  isSaved: boolean;
  onSave: () => void;
  savePending: boolean;
}) {
  const style = UPDATE_STYLE[item.update_type];
  const Icon = style.icon;
  const saveable = SAVEABLE_TYPES.has(item.update_type);
  const SaveIcon = isSaved ? BookmarkCheck : Bookmark;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl border border-l-4 bg-card",
        style.accentBorder,
        item.update_type === "sponsored" && "bg-amber-500/5"
      )}
    >
      <div className="relative flex-shrink-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
          style={{ background: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)" }}
        >
          {item.store_name.charAt(0).toUpperCase()}
        </div>
        <div
          className={cn(
            "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-card",
            style.iconBg,
            style.iconColor
          )}
        >
          <Icon className="h-2.5 w-2.5" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/stores/${item.store_id}`}>
            <a className="text-sm font-semibold hover:underline">{item.store_name}</a>
          </Link>
          {item.update_type === "sponsored" && (
            <Badge className="text-xs bg-amber-500/15 text-amber-500 border-amber-500/30">Sponsored</Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm mt-0.5">{item.message}</p>
        {(item.discount_label || (item.update_type === "flash_sale" && item.expires_at)) && (
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {item.discount_label && (
              <span
                className={cn(
                  "inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border",
                  style.chip
                )}
              >
                {item.coupon_code ? `${item.discount_label} · ${item.coupon_code}` : item.discount_label}
              </span>
            )}
            {item.update_type === "flash_sale" && item.expires_at && (
              <ExpiryBadge expiresAt={item.expires_at} />
            )}
          </div>
        )}
      </div>

      {saveable && (
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            "flex-shrink-0 h-8 w-8 transition-all duration-200 hover:scale-110 active:scale-90",
            isSaved ? "text-primary" : "text-muted-foreground"
          )}
          onClick={onSave}
          disabled={savePending}
          aria-label={isSaved ? "Remove from My Deals" : "Save to My Deals"}
        >
          <SaveIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export default function Following() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: stores = [], isLoading } = useQuery<FollowedStore[]>({
    queryKey: ["/stores/following"],
  });

  const {
    data: feedPages,
    isLoading: feedLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["/feed", "infinite"],
    queryFn: async ({ pageParam }) => {
      const res = await apiRequest("GET", `/feed?limit=${FEED_PAGE_SIZE}&offset=${pageParam}`);
      return (await res.json()) as FeedResponse;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.has_more) return undefined;
      return allPages.reduce((sum, p) => sum + p.items.length, 0);
    },
  });

  const feedItems = useMemo(() => feedPages?.pages.flatMap((p) => p.items) ?? [], [feedPages]);
  const feedGroups = useMemo(() => groupByDay(feedItems), [feedItems]);
  const unreadCount = feedPages?.pages[0]?.unread_count ?? 0;

  // Which feed posts are already saved to My Deals — one bulk fetch rather
  // than a per-item GET /feed/{id}/saved call for every deal in the feed.
  const { data: myDeals } = useQuery<MyDealsResponse>({
    queryKey: ["/my-deals"],
  });
  const savedFeedPostIds = new Set((myDeals?.items ?? []).map((d) => d.feed_post_id));

  const saveDealMutation = useMutation({
    mutationFn: async ({ feedPostId, isSaved }: { feedPostId: string; isSaved: boolean }) => {
      await apiRequest(isSaved ? "DELETE" : "POST", `/feed/${feedPostId}/save`);
    },
    onSuccess: (_data, { isSaved }) => {
      queryClient.invalidateQueries({ queryKey: ["/my-deals"] });
      toast({ description: isSaved ? "Removed from My Deals" : "Saved to My Deals" });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/feed/read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/feed", "infinite"] });
    },
  });

  // Mark the feed read once, the first time it's loaded with unread items —
  // opening the Following page is the "you've seen this" signal.
  useEffect(() => {
    if (unreadCount > 0 && !markReadMutation.isPending) {
      markReadMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadCount]);

  const unfollowMutation = useMutation({
    mutationFn: async (storeId: string) => {
      await apiRequest("DELETE", `/stores/${storeId}/follow`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/stores/following"] });
      toast({ description: "Unfollowed store" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse w-40" />
        {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Following</h1>
        {stores.length > 0 && (
          <span className="text-sm text-muted-foreground">({stores.length} store{stores.length !== 1 ? "s" : ""})</span>
        )}
      </div>

      <Tabs defaultValue="feed">
        <TabsList>
          <TabsTrigger value="feed">
            Feed
            {!!unreadCount && (
              <span className="ml-1.5 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0 font-medium">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="stores">Stores</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="pt-4">
          {feedLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : feedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <Megaphone className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">
                {stores.length === 0
                  ? "Follow a store to see their coupons, sales, and announcements here."
                  : "No activity yet from the stores you follow."}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {feedGroups.map((group) => (
                <div key={group.label} className="space-y-3">
                  <p className="sticky top-0 z-10 -mx-1 px-1 py-1 bg-background/95 backdrop-blur text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </p>
                  {group.items.map((item) => (
                    <FeedCard
                      key={item.id}
                      item={item}
                      isSaved={savedFeedPostIds.has(item.id)}
                      onSave={() =>
                        saveDealMutation.mutate({ feedPostId: item.id, isSaved: savedFeedPostIds.has(item.id) })
                      }
                      savePending={saveDealMutation.isPending}
                    />
                  ))}
                </div>
              ))}

              {hasNextPage && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="gap-2"
                  >
                    {isFetchingNextPage && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {isFetchingNextPage ? "Loading…" : "Load more"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stores" className="pt-4">
          {stores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <Store className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">You're not following any stores yet.</p>
              <Link href="/stores">
                <Button variant="outline">Browse stores</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {stores.map((store) => (
                <div key={store.store_id} className="flex items-center gap-4 p-4 rounded-xl border bg-card">
                  <div
                    className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold"
                    style={{ background: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)" }}
                  >
                    {store.store_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{store.store_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{store.follower_count} follower{store.follower_count !== 1 ? "s" : ""}</span>
                      {!store.is_active && <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Link href={`/stores/${store.store_id}`}>
                      <Button size="sm" variant="outline">Browse</Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground"
                      onClick={() => unfollowMutation.mutate(store.store_id)}
                      disabled={unfollowMutation.isPending}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

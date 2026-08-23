import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Bookmark, Tag, Percent, Zap, Copy, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/currency";

export interface SavedDeal {
  id: string;
  feed_post_id: string;
  update_type: "coupon" | "promotion" | "flash_sale";
  store_id: string;
  store_name: string;
  message: string;
  status: "upcoming" | "active" | "expired";
  expires_at: string | null;
  code: string | null;
  sale_price: number | null;
  saved_at: string;
}

export interface MyDealsResponse {
  items: SavedDeal[];
}

const UPDATE_ICONS = {
  coupon: Tag,
  promotion: Percent,
  flash_sale: Zap,
} as const;

const STATUS_STYLES: Record<SavedDeal["status"], string> = {
  active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  upcoming: "bg-sky-500/10 text-sky-500 border-sky-500/30",
  expired: "bg-muted text-muted-foreground border-transparent",
};

function expiryLabel(item: SavedDeal): string | null {
  if (!item.expires_at) return null;
  const date = new Date(item.expires_at);
  const distance = formatDistanceToNow(date, { addSuffix: true });
  if (item.status === "expired") return `Expired ${distance}`;
  if (item.status === "upcoming") return `Starts ${distance}`;
  return `Ends ${distance}`;
}

export default function MyDeals() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<MyDealsResponse>({
    queryKey: ["/my-deals"],
  });
  const items = data?.items ?? [];

  const unsaveMutation = useMutation({
    mutationFn: async (feedPostId: string) => {
      await apiRequest("DELETE", `/feed/${feedPostId}/save`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/my-deals"] });
      toast({ description: "Removed from My Deals" });
    },
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ description: `Copied "${code}"` });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse w-40" />
        {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <Bookmark className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">My Deals</h1>
        {items.length > 0 && (
          <span className="text-sm text-muted-foreground">({items.length} saved)</span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <Bookmark className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">
            No saved deals yet. Save a coupon, sale, or flash sale from your feed to find it here.
          </p>
          <Link href="/following">
            <Button variant="outline">Go to Feed</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const Icon = UPDATE_ICONS[item.update_type];
            const label = expiryLabel(item);
            return (
              <div key={item.id} className="flex items-start gap-3 p-4 rounded-xl border bg-card">
                <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/stores/${item.store_id}`}>
                      <a className="text-sm font-semibold hover:underline">{item.store_name}</a>
                    </Link>
                    <Badge variant="outline" className={`text-xs capitalize ${STATUS_STYLES[item.status]}`}>
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-sm mt-0.5">{item.message}</p>
                  {label && <p className="text-xs text-muted-foreground mt-1">{label}</p>}

                  <div className="flex items-center gap-2 mt-2">
                    {item.code && (
                      <Button size="sm" variant="outline" className="gap-1.5 font-mono" onClick={() => copyCode(item.code!)}>
                        {item.code}
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                    {item.sale_price != null && (
                      <span className="text-sm font-bold">{formatPrice(item.sale_price)}</span>
                    )}
                    {(item.update_type === "promotion" || item.update_type === "flash_sale") && (
                      <Link href={`/stores/${item.store_id}`}>
                        <a className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
                          Shop now <ArrowRight className="h-3 w-3" />
                        </a>
                      </Link>
                    )}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="flex-shrink-0 h-8 w-8 text-muted-foreground"
                  onClick={() => unsaveMutation.mutate(item.feed_post_id)}
                  disabled={unsaveMutation.isPending}
                  aria-label="Remove from My Deals"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

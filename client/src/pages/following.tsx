import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Users, Store, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FollowedStore {
  store_id: string;
  store_name: string;
  is_active: boolean;
  follower_count: number;
  followed_at: string;
}

export default function Following() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: stores = [], isLoading } = useQuery<FollowedStore[]>({
    queryKey: ["/stores/following"],
  });

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
    </div>
  );
}

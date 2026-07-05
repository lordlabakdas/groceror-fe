import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAddToCart } from "@/lib/cart";
import { getProductImage } from "@/lib/catalog";

interface WishlistItem {
  id: string;
  inventory_id: string;
  inventory_name: string;
  store_id: string;
  store_name: string;
  price: number;
  sale_price: number | null;
  stock: number;
  is_in_stock: boolean;
  added_at: string;
}

export default function Wishlist() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const addToCart = useAddToCart();

  const { data: items = [], isLoading } = useQuery<WishlistItem[]>({
    queryKey: ["/wishlist"],
  });

  const removeMutation = useMutation({
    mutationFn: async (inventoryId: string) => {
      await apiRequest("DELETE", `/wishlist/${inventoryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/wishlist"] });
      toast({ description: "Removed from wishlist" });
    },
  });

  const handleAddToCart = (item: WishlistItem) => {
    addToCart(
      {
        id: item.inventory_id,
        name: item.inventory_name,
        description: "",
        price: item.price.toFixed(2),
        category: "",
        imageUrl: getProductImage(item.inventory_name, ""),
        stock: item.stock,
        storeId: item.store_id,
        storeName: item.store_name,
        salePrice: item.sale_price,
      },
      1
    );
    toast({ description: `${item.inventory_name} added to cart` });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse w-40" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <Heart className="h-5 w-5 text-rose-400" />
        <h1 className="text-2xl font-bold">Wishlist</h1>
        {items.length > 0 && (
          <span className="text-sm text-muted-foreground">({items.length} item{items.length !== 1 ? "s" : ""})</span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <Heart className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Your wishlist is empty.</p>
          <Link href="/stores">
            <Button variant="outline">Browse stores</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-4 rounded-xl border bg-card"
            >
              <img
                src={getProductImage(item.inventory_name, "")}
                alt={item.inventory_name}
                className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{item.inventory_name}</p>
                <p className="text-xs text-muted-foreground">{item.store_name}</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  {item.sale_price != null ? (
                    <>
                      <span className="text-base font-bold text-rose-400">${item.sale_price.toFixed(2)}</span>
                      <span className="text-xs line-through text-muted-foreground">${item.price.toFixed(2)}</span>
                      <Badge className="text-xs bg-rose-500/10 text-rose-400 border-rose-500/30">On sale</Badge>
                    </>
                  ) : (
                    <span className="text-base font-bold">${item.price.toFixed(2)}</span>
                  )}
                </div>
                {!item.is_in_stock && (
                  <span className="text-xs text-muted-foreground">Out of stock</span>
                )}
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  disabled={!item.is_in_stock}
                  onClick={() => handleAddToCart(item)}
                >
                  <ShoppingBag className="h-3.5 w-3.5 mr-1" />
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => removeMutation.mutate(item.inventory_id)}
                  disabled={removeMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

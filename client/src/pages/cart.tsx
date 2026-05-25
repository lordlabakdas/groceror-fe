import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/lib/cart";
import { type Product, type GetStoreInventoryResponse } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Cart() {
  const { state, dispatch } = useCart();
  const { toast } = useToast();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Re-use the same query key as the products page so the result is cached.
  const { data } = useQuery<GetStoreInventoryResponse>({
    queryKey: ["/inventory/get-store-inventory"],
  });

  const products: Product[] = (data?.inventory ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    description: item.notes ?? "",
    price: item.price.toFixed(2),
    category: item.category,
    imageUrl: "",
    stock: item.quantity,
    storeId: item.store_id,
  }));

  const cartItems = state.items
    .map((item) => ({ ...item, product: products.find((p) => p.id === item.id) }))
    .filter((item): item is typeof item & { product: Product } => item.product !== undefined);

  const total = cartItems.reduce(
    (sum, { product, quantity }) => sum + parseFloat(product.price) * quantity,
    0,
  );

  function handleClearCart() {
    // Clear local state immediately.
    dispatch({ type: "CLEAR_CART" });

    // Best-effort server sync using the store_id from the first cart item.
    const storeId = cartItems[0]?.product?.storeId;
    if (storeId) {
      apiRequest("POST", `/cart/${storeId}/clear`).catch(() => {});
    }

    toast({ title: "Cart cleared", description: "All items have been removed from your cart" });
  }

  function handleUpdateQuantity(product: Product, quantity: number) {
    dispatch({ type: "UPDATE_QUANTITY", payload: { id: product.id, quantity } });
    apiRequest("PUT", `/cart/${product.storeId}/items/${product.id}`, { quantity }).catch(() => {});
  }

  function handleRemoveItem(product: Product) {
    dispatch({ type: "REMOVE_ITEM", payload: product.id });
    apiRequest("DELETE", `/cart/${product.storeId}/items/${product.id}`).catch(() => {});
  }

  async function handleCheckout() {
    setIsCheckingOut(true);
    try {
      // Repeat each item UUID by its quantity so the analytics pipeline counts correctly.
      const items = cartItems.flatMap(({ product, quantity }) =>
        Array(quantity).fill(product.id),
      );
      await apiRequest("POST", "/order/create-order", {
        items,
        total_price: total,
        status: "pending",
      });
      dispatch({ type: "CLEAR_CART" });
      toast({ title: "Order placed!", description: `$${total.toFixed(2)} order is confirmed.` });
    } catch (err: any) {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
    } finally {
      setIsCheckingOut(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Shopping Cart</h1>
        {cartItems.length > 0 && (
          <Button variant="destructive" size="sm" onClick={handleClearCart}>
            Clear Cart
          </Button>
        )}
      </div>

      {cartItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Your cart is empty</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cartItems.map(({ product, quantity }) => (
            <div key={product.id} className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="flex-1">
                <h3 className="font-medium">{product.name}</h3>
                <p className="text-sm text-muted-foreground">${product.price} each</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleUpdateQuantity(product, quantity - 1)}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>

                <span className="w-8 text-center">{quantity}</span>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleUpdateQuantity(product, quantity + 1)}
                  disabled={quantity >= product.stock}
                >
                  <Plus className="h-4 w-4" />
                </Button>

                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleRemoveItem(product)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <div className="pt-4 border-t">
            <div className="flex justify-between items-center mb-4">
              <span className="font-medium">Total</span>
              <span className="text-lg font-bold">${total.toFixed(2)}</span>
            </div>
            <Button className="w-full" onClick={handleCheckout} disabled={isCheckingOut}>
              {isCheckingOut ? "Placing order…" : "Proceed to Checkout"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

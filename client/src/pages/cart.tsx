import { useState } from "react";
import { Link } from "wouter";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getProductImage } from "@/lib/catalog";

export default function Cart() {
  const { state, dispatch } = useCart();
  const { toast } = useToast();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const items = state.items;
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  function handleUpdateQuantity(id: string, storeId: string, quantity: number) {
    dispatch({ type: "UPDATE_QUANTITY", payload: { id, quantity } });
    apiRequest("PUT", `/cart/${storeId}/items/${id}`, { quantity }).catch(() => {});
  }

  function handleRemoveItem(id: string, storeId: string) {
    dispatch({ type: "REMOVE_ITEM", payload: id });
    apiRequest("DELETE", `/cart/${storeId}/items/${id}`).catch(() => {});
  }

  function handleClearCart() {
    const storeId = items[0]?.storeId;
    dispatch({ type: "CLEAR_CART" });
    if (storeId) apiRequest("POST", `/cart/${storeId}/clear`).catch(() => {});
    toast({ title: "Cart cleared" });
  }

  async function handleCheckout() {
    setIsCheckingOut(true);
    try {
      const orderItems = items.flatMap(({ id, quantity }) => Array(quantity).fill(id));
      await apiRequest("POST", "/order/create-order", {
        items: orderItems,
        total_price: total,
        status: "pending",
      });
      dispatch({ type: "CLEAR_CART" });
      toast({ title: "Order placed!", description: `$${total.toFixed(2)} order confirmed.` });
    } catch (err: any) {
      toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
    } finally {
      setIsCheckingOut(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center py-24 gap-4">
        <ShoppingCart className="h-16 w-16 text-muted-foreground/30" />
        <p className="text-lg font-medium text-muted-foreground">Your cart is empty</p>
        <Link href="/stores">
          <a>
            <Button variant="outline">Browse stores</Button>
          </a>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shopping Cart</h1>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={handleClearCart}>
          Clear all
        </Button>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const img = item.imageUrl || getProductImage(item.name, "OTHER");
          const subtotal = (item.price * item.quantity).toFixed(2);
          return (
            <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl border bg-card">
              <img
                src={img}
                alt={item.name}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-muted"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-tight truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">${item.price.toFixed(2)} each</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleUpdateQuantity(item.id, item.storeId, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-6 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleUpdateQuantity(item.id, item.storeId, item.quantity + 1)}
                  disabled={item.quantity >= item.stock}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm font-semibold w-14 text-right tabular-nums">${subtotal}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemoveItem(item.id, item.storeId)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{items.reduce((n, i) => n + i.quantity, 0)} items</span>
          <span>Subtotal</span>
        </div>
        <div className="flex justify-between items-center text-lg font-bold border-t pt-4">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
        <Button className="w-full" size="lg" onClick={handleCheckout} disabled={isCheckingOut}>
          {isCheckingOut ? "Placing order…" : "Proceed to Checkout"}
        </Button>
      </div>
    </div>
  );
}

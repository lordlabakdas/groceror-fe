import { useQuery, useMutation } from "@tanstack/react-query";
import { useCart } from "@/lib/cart";
import { type Product } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function Cart() {
  const { state, dispatch } = useCart();
  const { toast } = useToast();

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/cart", {
        method: "DELETE",
        credentials: "include",
      });
    },
    onSuccess: () => {
      dispatch({ type: "CLEAR_CART" });
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "Cart cleared",
        description: "All items have been removed from your cart",
      });
    },
  });

  if (!products?.length) {
    return <div>Loading...</div>;
  }

  const cartItems = state.items.map(item => {
    const product = products.find(p => p.id === item.id);
    return { ...item, product };
  }).filter((item): item is typeof item & { product: Product } => item.product !== undefined);

  const total = cartItems.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Shopping Cart</h1>
        {cartItems.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => clearCartMutation.mutate()}
          >
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
            <div
              key={product.id}
              className="flex items-center gap-4 p-4 border rounded-lg"
            >
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-16 h-16 object-cover rounded"
              />

              <div className="flex-1">
                <h3 className="font-medium">{product.name}</h3>
                <p className="text-sm text-muted-foreground">
                  ${product.price} each
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    dispatch({
                      type: "UPDATE_QUANTITY",
                      payload: { id: product.id, quantity: quantity - 1 },
                    })
                  }
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>

                <span className="w-8 text-center">{quantity}</span>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    dispatch({
                      type: "UPDATE_QUANTITY",
                      payload: { id: product.id, quantity: quantity + 1 },
                    })
                  }
                  disabled={quantity >= product.stock}
                >
                  <Plus className="h-4 w-4" />
                </Button>

                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    dispatch({ type: "REMOVE_ITEM", payload: product.id })
                  }
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

            <Button className="w-full">
              Proceed to Checkout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
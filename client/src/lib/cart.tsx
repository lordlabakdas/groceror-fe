import { createContext, useContext, useReducer, useEffect, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type Product } from "@/types/models";

interface CartState {
  items: { id: string; quantity: number }[];
}

type CartAction =
  | { type: "ADD_ITEM"; payload: { id: string; quantity: number } }
  | { type: "REMOVE_ITEM"; payload: string }
  | { type: "UPDATE_QUANTITY"; payload: { id: string; quantity: number } }
  | { type: "CLEAR_CART" };

const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
} | null>(null);

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.items.find((i) => i.id === action.payload.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === action.payload.id
              ? { ...i, quantity: i.quantity + action.payload.quantity }
              : i,
          ),
        };
      }
      return { items: [...state.items, action.payload] };
    }
    case "REMOVE_ITEM":
      return { items: state.items.filter((i) => i.id !== action.payload) };
    case "UPDATE_QUANTITY":
      return {
        items: state.items.map((i) =>
          i.id === action.payload.id ? { ...i, quantity: action.payload.quantity } : i,
        ),
      };
    case "CLEAR_CART":
      return { items: [] };
    default:
      return state;
  }
}

const CART_KEY = "groceror_cart";

export function clearPersistedCart() {
  localStorage.removeItem(CART_KEY);
}

function loadCart(): CartState {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (raw) return JSON.parse(raw) as CartState;
  } catch {}
  return { items: [] };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, loadCart);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(state));
  }, [state]);

  return <CartContext.Provider value={{ state, dispatch }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}

export function useAddToCart() {
  const { dispatch } = useCart();
  const { toast } = useToast();

  return (product: Product, quantity: number = 1) => {
    // Update local state immediately for instant feedback.
    dispatch({ type: "ADD_ITEM", payload: { id: product.id, quantity } });
    toast({ title: "Added to cart", description: `${quantity} item(s) added to your cart` });

    // Sync to groceror in the background; failures are non-fatal.
    apiRequest("POST", `/cart/${product.storeId}/items`, {
      inventory_id: product.id,
      quantity,
      price: parseFloat(product.price),
    }).catch(() => {
      // Silently swallow — user may not be logged in or may not have a profile set yet.
    });
  };
}

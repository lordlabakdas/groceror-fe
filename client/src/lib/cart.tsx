import { createContext, useContext, useReducer, useState, useEffect, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type Product } from "@/types/models";

export interface CartItem {
  id: string;
  quantity: number;
  name: string;
  price: number;
  storeId: string;
  storeName: string;
  imageUrl: string;
  stock: number;
}

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: "ADD_ITEM"; payload: CartItem }
  | { type: "REMOVE_ITEM"; payload: string }
  | { type: "UPDATE_QUANTITY"; payload: { id: string; quantity: number } }
  | { type: "CLEAR_CART" };

const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
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
    if (raw) {
      const parsed = JSON.parse(raw) as CartState;
      // Drop items persisted before CartItem gained name/price/storeId fields.
      const valid = parsed.items.filter((i) => i.name && i.storeId);
      return { items: valid };
    }
  } catch {}
  return { items: [] };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, loadCart);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(state));
  }, [state]);

  return (
    <CartContext.Provider
      value={{
        state,
        dispatch,
        cartOpen,
        openCart: () => setCartOpen(true),
        closeCart: () => setCartOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}

export function useAddToCart() {
  const { state, dispatch } = useCart();
  const { toast } = useToast();

  return (product: Product, quantity: number = 1) => {
    const existingStoreId = state.items[0]?.storeId;
    if (existingStoreId && existingStoreId !== product.storeId) {
      const existingStoreName = state.items[0]?.storeName ?? "another store";
      toast({
        title: "Different store",
        description: `Your cart has items from ${existingStoreName}. Clear your cart before adding items from a new store.`,
        variant: "destructive",
      });
      return;
    }

    dispatch({
      type: "ADD_ITEM",
      payload: {
        id: product.id,
        quantity,
        name: product.name,
        price: parseFloat(product.price),
        storeId: product.storeId,
        storeName: product.storeName ?? "",
        imageUrl: product.imageUrl,
        stock: product.stock,
      },
    });
    toast({ title: "Added to cart", description: `${product.name} added to your cart` });

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

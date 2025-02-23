import { createContext, useContext, useReducer, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";

interface CartState {
  items: { id: number; quantity: number }[];
}

type CartAction =
  | { type: "ADD_ITEM"; payload: { id: number; quantity: number } }
  | { type: "REMOVE_ITEM"; payload: number }
  | { type: "UPDATE_QUANTITY"; payload: { id: number; quantity: number } }
  | { type: "CLEAR_CART" };

const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
} | null>(null);

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM":
      const existingItem = state.items.find(item => item.id === action.payload.id);
      if (existingItem) {
        return {
          items: state.items.map(item =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + action.payload.quantity }
              : item
          )
        };
      }
      return { items: [...state.items, action.payload] };
    
    case "REMOVE_ITEM":
      return {
        items: state.items.filter(item => item.id !== action.payload)
      };
    
    case "UPDATE_QUANTITY":
      return {
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        )
      };
    
    case "CLEAR_CART":
      return { items: [] };
    
    default:
      return state;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

export function useAddToCart() {
  const { dispatch } = useCart();
  const { toast } = useToast();

  return (id: number, quantity: number = 1) => {
    dispatch({ type: "ADD_ITEM", payload: { id, quantity } });
    toast({
      title: "Added to cart",
      description: `${quantity} item(s) added to your cart`,
    });
  };
}

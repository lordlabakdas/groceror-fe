// Shape returned by GET /inventory/get-store-inventory after the StoreInventory
// validator was updated to expose id, price, and store_id.
export interface GrocerorInventoryItem {
  id: string;          // UUID
  name: string;
  quantity: number;
  category: string;    // "GROCERY" | "PRODUCE" | "MEAT" | "DAIRY" | "BAKERY" | "OTHER"
  price: number;
  store_id: string;    // UUID — needed as the URL segment for cart operations
  notes: string | null;
  expiry_date?: string | null; // "YYYY-MM-DD" — earliest upcoming expiry, if set
}

export interface GetStoreInventoryResponse {
  inventory: GrocerorInventoryItem[];
}

// Normalised product shape used throughout the UI.
// id and storeId are UUID strings (groceror uses UUIDs, not integer PKs).
export interface Product {
  id: string;
  name: string;
  description: string;
  price: string;       // formatted as "X.XX"
  category: string;    // human-readable label, e.g. "Bakery"
  imageUrl: string;
  stock: number;
  storeId: string;     // groceror store UUID, required by cart endpoints
  storeName?: string;  // display name of the store, used for cross-store cart warning
}

export interface CartItem {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  addedAt: string;
}

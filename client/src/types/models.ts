export interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  category: string;
  imageUrl: string;
  stock: number;
}

export interface CartItem {
  id: number;
  userId: string;
  productId: number;
  quantity: number;
  addedAt: string;
}

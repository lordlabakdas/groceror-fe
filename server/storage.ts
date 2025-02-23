import { 
  type Product, 
  type InsertProduct, 
  type CartItem, 
  type InsertCartItem 
} from "@shared/schema";

export interface IStorage {
  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  
  // Cart
  getCartItems(userId: string): Promise<CartItem[]>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: number, quantity: number): Promise<CartItem>;
  removeFromCart(id: number): Promise<void>;
  clearCart(userId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private products: Map<number, Product>;
  private cartItems: Map<number, CartItem>;
  private currentProductId: number;
  private currentCartItemId: number;

  constructor() {
    this.products = new Map();
    this.cartItems = new Map();
    this.currentProductId = 1;
    this.currentCartItemId = 1;
    
    // Add some initial products
    const initialProducts: InsertProduct[] = [
      {
        name: "Fresh Bananas",
        description: "Bunch of fresh yellow bananas",
        price: "0.99",
        category: "Fruits",
        imageUrl: "https://images.unsplash.com/photo-1604742763104-86a0cf0aa1c2",
        stock: 50
      },
      {
        name: "Organic Apples",
        description: "Red delicious apples",
        price: "1.99",
        category: "Fruits",
        imageUrl: "https://images.unsplash.com/photo-1592502712628-c5219bf0bc12",
        stock: 40
      },
      {
        name: "Whole Bread",
        description: "Freshly baked whole wheat bread",
        price: "2.99",
        category: "Bakery",
        imageUrl: "https://images.unsplash.com/photo-1506976785307-8732e854ad03",
        stock: 20
      }
    ];

    initialProducts.forEach(product => this.createProduct(product));
  }

  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.currentProductId++;
    const newProduct = { ...product, id };
    this.products.set(id, newProduct);
    return newProduct;
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product> {
    const existing = this.products.get(id);
    if (!existing) throw new Error("Product not found");
    
    const updated = { ...existing, ...product };
    this.products.set(id, updated);
    return updated;
  }

  async deleteProduct(id: number): Promise<void> {
    this.products.delete(id);
  }

  async getCartItems(userId: string): Promise<CartItem[]> {
    return Array.from(this.cartItems.values())
      .filter(item => item.userId === userId);
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    const id = this.currentCartItemId++;
    const newItem = { 
      ...item, 
      id,
      addedAt: new Date()
    };
    this.cartItems.set(id, newItem);
    return newItem;
  }

  async updateCartItem(id: number, quantity: number): Promise<CartItem> {
    const existing = this.cartItems.get(id);
    if (!existing) throw new Error("Cart item not found");
    
    const updated = { ...existing, quantity };
    this.cartItems.set(id, updated);
    return updated;
  }

  async removeFromCart(id: number): Promise<void> {
    this.cartItems.delete(id);
  }

  async clearCart(userId: string): Promise<void> {
    const items = Array.from(this.cartItems.entries())
      .filter(([_, item]) => item.userId === userId);
    
    items.forEach(([id]) => this.cartItems.delete(id));
  }
}

export const storage = new MemStorage();

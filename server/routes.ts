import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertProductSchema, insertCartItemSchema } from "@shared/schema";

export async function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  // Products routes
  app.get("/api/products", async (_req, res) => {
    const products = await storage.getProducts();
    res.json(products);
  });

  app.get("/api/products/:id", async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  app.post("/api/products", async (req, res) => {
    const parsed = insertProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid product data" });
    }
    
    const product = await storage.createProduct(parsed.data);
    res.status(201).json(product);
  });

  app.patch("/api/products/:id", async (req, res) => {
    const parsed = insertProductSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid product data" });
    }

    try {
      const product = await storage.updateProduct(Number(req.params.id), parsed.data);
      res.json(product);
    } catch (error) {
      res.status(404).json({ message: "Product not found" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    await storage.deleteProduct(Number(req.params.id));
    res.status(204).end();
  });

  // Cart routes
  app.get("/api/cart", async (req, res) => {
    // For demo purposes using a fixed user ID
    const userId = "demo-user";
    const items = await storage.getCartItems(userId);
    res.json(items);
  });

  app.post("/api/cart", async (req, res) => {
    const parsed = insertCartItemSchema.safeParse({
      ...req.body,
      userId: "demo-user" // Fixed user ID for demo
    });
    
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid cart item data" });
    }

    const item = await storage.addToCart(parsed.data);
    res.status(201).json(item);
  });

  app.patch("/api/cart/:id", async (req, res) => {
    const quantity = Number(req.body.quantity);
    if (isNaN(quantity) || quantity < 0) {
      return res.status(400).json({ message: "Invalid quantity" });
    }

    try {
      const item = await storage.updateCartItem(Number(req.params.id), quantity);
      res.json(item);
    } catch (error) {
      res.status(404).json({ message: "Cart item not found" });
    }
  });

  app.delete("/api/cart/:id", async (req, res) => {
    await storage.removeFromCart(Number(req.params.id));
    res.status(204).end();
  });

  app.delete("/api/cart", async (req, res) => {
    await storage.clearCart("demo-user");
    res.status(204).end();
  });

  return httpServer;
}

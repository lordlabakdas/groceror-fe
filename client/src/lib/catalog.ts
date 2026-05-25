export interface CatalogItem {
  name: string;
  category: string;
  imageUrl: string;
  defaultPrice: number;
}

export const CATEGORY_ENUM: Record<string, string> = {
  Grocery: "GROCERY",
  Produce: "PRODUCE",
  Meat: "MEAT",
  Dairy: "DAIRY",
  Bakery: "BAKERY",
  Other: "OTHER",
};

export const CATEGORY_IMAGES: Record<string, string> = {
  GROCERY: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&fit=crop",
  PRODUCE: "https://images.unsplash.com/photo-1518843875459-f738682238a6?w=400&fit=crop",
  MEAT: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&fit=crop",
  DAIRY: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&fit=crop",
  BAKERY: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&fit=crop",
  OTHER: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&fit=crop",
};

export const CATALOG: CatalogItem[] = [
  { name: "Bananas", category: "Produce", imageUrl: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&fit=crop", defaultPrice: 1.29 },
  { name: "Carrots", category: "Produce", imageUrl: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&fit=crop", defaultPrice: 0.99 },
  { name: "Avocado", category: "Produce", imageUrl: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&fit=crop", defaultPrice: 1.49 },
  { name: "Tomatoes", category: "Produce", imageUrl: "https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=400&fit=crop", defaultPrice: 2.49 },
  { name: "Sourdough Bread", category: "Bakery", imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&fit=crop", defaultPrice: 4.99 },
  { name: "Croissants", category: "Bakery", imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&fit=crop", defaultPrice: 3.49 },
  { name: "Whole Milk", category: "Dairy", imageUrl: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&fit=crop", defaultPrice: 3.29 },
  { name: "Cheddar Cheese", category: "Dairy", imageUrl: "https://images.unsplash.com/photo-1618164435226-9e8e7ccfade7?w=400&fit=crop", defaultPrice: 5.49 },
  { name: "Greek Yogurt", category: "Dairy", imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&fit=crop", defaultPrice: 2.99 },
  { name: "Chicken Breast", category: "Meat", imageUrl: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&fit=crop", defaultPrice: 7.99 },
  { name: "Salmon Fillet", category: "Meat", imageUrl: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&fit=crop", defaultPrice: 12.99 },
  { name: "Penne Pasta", category: "Grocery", imageUrl: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&fit=crop", defaultPrice: 1.79 },
  { name: "Jasmine Rice", category: "Grocery", imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&fit=crop", defaultPrice: 3.49 },
  { name: "Olive Oil", category: "Grocery", imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&fit=crop", defaultPrice: 8.99 },
  { name: "Orange Juice", category: "Grocery", imageUrl: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&fit=crop", defaultPrice: 4.29 },
  { name: "Honey", category: "Other", imageUrl: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&fit=crop", defaultPrice: 6.99 },
  { name: "Dark Chocolate", category: "Other", imageUrl: "https://images.unsplash.com/photo-1548907040-4baa42d10919?w=400&fit=crop", defaultPrice: 3.99 },
];

const _nameToImage = new Map(CATALOG.map((c) => [c.name.toLowerCase(), c.imageUrl]));

export function getProductImage(name: string | undefined, categoryEnum: string): string {
  if (!name) return CATEGORY_IMAGES[categoryEnum] ?? CATEGORY_IMAGES.OTHER;
  return _nameToImage.get(name.toLowerCase()) ?? CATEGORY_IMAGES[categoryEnum] ?? CATEGORY_IMAGES.OTHER;
}

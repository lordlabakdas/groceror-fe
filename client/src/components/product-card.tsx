import { type Product } from "@/types/models";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAddToCart } from "@/lib/cart";

export function ProductCard({ product }: { product: Product }) {
  const addToCart = useAddToCart();

  return (
    <Card className="overflow-hidden">
      <div className="aspect-square relative">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="object-cover w-full h-full"
        />
      </div>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold truncate">{product.name}</h3>
          <span className="text-green-600 font-medium">${product.price}</span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button
          className="w-full"
          onClick={() => addToCart(product)}
          disabled={product.stock === 0}
        >
          {product.stock > 0 ? "Add to Cart" : "Out of Stock"}
        </Button>
      </CardFooter>
    </Card>
  );
}

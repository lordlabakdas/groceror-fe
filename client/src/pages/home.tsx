import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto">
      <div 
        className="rounded-lg overflow-hidden relative"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url(https://images.unsplash.com/photo-1472851294608-062f824d29cc)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="p-8 md:p-12 text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Fresh Groceries Delivered
          </h1>
          <p className="text-lg md:text-xl mb-6 max-w-2xl">
            Shop our wide selection of fresh produce, bakery items, and more. Get everything you need delivered right to your door.
          </p>
          <Link href="/products">
            <Button size="lg" className="gap-2">
              Shop Now
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mt-12">
        <div className="bg-accent rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Fresh Quality</h2>
          <p className="text-muted-foreground">
            We carefully select the freshest produce and highest quality products for our customers.
          </p>
        </div>
        <div className="bg-accent rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Wide Selection</h2>
          <p className="text-muted-foreground">
            Browse through our extensive catalog of groceries from various categories.
          </p>
        </div>
      </div>
    </div>
  );
}

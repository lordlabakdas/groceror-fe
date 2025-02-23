import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div 
      className="min-h-[calc(100vh-4rem)] w-full flex items-center justify-center"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.7)), url(https://images.unsplash.com/photo-1542838132-92c53300491e)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 text-white">
          Fresh Groceries Delivered
        </h1>
        <p className="text-xl md:text-2xl mb-8 text-gray-100 max-w-2xl mx-auto">
          Shop our wide selection of fresh produce, bakery items, and more. Get everything you need delivered right to your door.
        </p>
        <Link href="/products">
          <Button size="lg" className="gap-2 text-lg">
            Shop Now
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
import { Link } from "wouter";
import { ShoppingCart, Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { useState } from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { state } = useCart();
  const [open, setOpen] = useState(false);

  const totalItems = state.items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <nav className="flex flex-col gap-4 mt-8">
                  <Link href="/">
                    <a onClick={() => setOpen(false)} className="text-lg font-medium">
                      Home
                    </a>
                  </Link>
                  <Link href="/products">
                    <a onClick={() => setOpen(false)} className="text-lg font-medium">
                      Products
                    </a>
                  </Link>
                  <Link href="/inventory">
                    <a onClick={() => setOpen(false)} className="text-lg font-medium">
                      Inventory
                    </a>
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
            
            <Link href="/">
              <a className="text-xl font-bold">GroceryApp</a>
            </Link>
            
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/products">
                <a className="text-sm font-medium">Products</a>
              </Link>
              <Link href="/inventory">
                <a className="text-sm font-medium">Inventory</a>
              </Link>
            </nav>
          </div>

          <Link href="/cart">
            <a className="relative">
              <Button variant="outline" size="icon">
                <ShoppingCart className="h-5 w-5" />
              </Button>
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </a>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}

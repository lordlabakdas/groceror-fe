import { useState } from "react";
import { Link } from "wouter";
import { ShoppingCart, Menu, LogOut, User } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth-context";

export function Layout({ children }: { children: React.ReactNode }) {
  const { state } = useCart();
  const { user, logout, openLogin } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const totalItems = state.items.reduce((acc, item) => acc + item.quantity, 0);
  const roleLabel = user?.entityType === "store" ? "Store Owner" : "Buyer";
  // Show last 4 digits as the avatar label so it fits the circle
  const avatarLabel = user ? user.phone.slice(-4) : "";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">

          {/* ---- left: hamburger + logo + nav ---- */}
          <div className="flex items-center gap-4">
            {/* mobile hamburger */}
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <nav className="flex flex-col gap-1 mt-8">
                  <Link href="/products">
                    <a
                      onClick={() => setDrawerOpen(false)}
                      className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent"
                    >
                      Products
                    </a>
                  </Link>
                  <Link href="/inventory">
                    <a
                      onClick={() => setDrawerOpen(false)}
                      className="block px-3 py-2 rounded-md text-base font-medium hover:bg-accent"
                    >
                      Myventory
                    </a>
                  </Link>
                </nav>

                <div className="absolute bottom-8 left-4 right-4">
                  {user ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground px-3">{user.phone}</p>
                      <Badge variant="secondary" className="ml-3">{roleLabel}</Badge>
                      <Button
                        variant="outline"
                        className="w-full mt-2 gap-2"
                        onClick={() => { setDrawerOpen(false); logout(); }}
                      >
                        <LogOut className="h-4 w-4" />
                        Log out
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => { setDrawerOpen(false); openLogin("login"); }}
                    >
                      Login
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {/* logo */}
            <Link href="/">
              <a className="text-xl font-bold tracking-tight">groceror</a>
            </Link>

            {/* desktop nav links */}
            <nav className="hidden md:flex items-center gap-1 ml-2">
              <Link href="/products">
                <a className="px-3 py-1.5 rounded-md text-sm font-medium hover:bg-accent transition-colors">
                  Products
                </a>
              </Link>
              <Link href="/inventory">
                <a className="px-3 py-1.5 rounded-md text-sm font-medium hover:bg-accent transition-colors">
                  Myventory
                </a>
              </Link>
            </nav>
          </div>

          {/* ---- right: auth + cart ---- */}
          <div className="flex items-center gap-2">
            {user ? (
              /* logged-in: avatar chip + dropdown */
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 h-9 px-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {avatarLabel}
                    </span>
                    <span className="hidden sm:inline text-sm max-w-[120px] truncate">
                      {user.phone}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium truncate">{user.phone}</span>
                      <Badge variant="secondary" className="w-fit text-xs">{roleLabel}</Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                    onClick={logout}
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              /* logged-out: login button */
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => openLogin("login")}
              >
                <User className="h-4 w-4" />
                Login
              </Button>
            )}

            {/* cart */}
            <Link href="/cart">
              <a className="relative">
                <Button variant="outline" size="icon">
                  <ShoppingCart className="h-5 w-5" />
                </Button>
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center font-medium">
                    {totalItems}
                  </span>
                )}
              </a>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingCart, Menu, User } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth-context";
import { ProfileSheet } from "@/components/profile-sheet";

function navCls(href: string, current: string, mobile = false) {
  const active = current === href || current.startsWith(href + "/");
  const base = mobile
    ? "block px-3 py-2 rounded-md text-base font-medium transition-colors"
    : "px-3 py-1.5 rounded-md text-sm font-medium transition-colors";
  return active
    ? `${base} bg-emerald-50 text-emerald-800 font-semibold dark:bg-emerald-950/40 dark:text-emerald-300`
    : `${base} text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30`;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { state } = useCart();
  const { user, openLogin, profileOpen, setProfileOpen } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [location] = useLocation();

  const totalItems = state.items.reduce((acc, item) => acc + item.quantity, 0);

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
                {user?.entityType === "store" && (
                  <nav className="flex flex-col gap-1 mt-8">
                    <Link href="/products">
                      <a onClick={() => setDrawerOpen(false)} className={navCls("/products", location, true)}>
                        Products
                      </a>
                    </Link>
                    <Link href="/inventory">
                      <a onClick={() => setDrawerOpen(false)} className={navCls("/inventory", location, true)}>
                        Myventory
                      </a>
                    </Link>
                    <Link href="/store-orders">
                      <a onClick={() => setDrawerOpen(false)} className={navCls("/store-orders", location, true)}>
                        Orders
                      </a>
                    </Link>
                  </nav>
                )}
                {user?.entityType === "user" && (
                  <nav className="flex flex-col gap-1 mt-8">
                    <Link href="/stores">
                      <a onClick={() => setDrawerOpen(false)} className={navCls("/stores", location, true)}>
                        Browse
                      </a>
                    </Link>
                    <Link href="/search">
                      <a onClick={() => setDrawerOpen(false)} className={navCls("/search", location, true)}>
                        Search
                      </a>
                    </Link>
                    <Link href="/orders">
                      <a onClick={() => setDrawerOpen(false)} className={navCls("/orders", location, true)}>
                        Orders
                      </a>
                    </Link>
                    <Link href="/cart">
                      <a onClick={() => setDrawerOpen(false)} className={navCls("/cart", location, true)}>
                        Cart
                      </a>
                    </Link>
                  </nav>
                )}

                <div className="absolute bottom-8 left-4 right-4">
                  {user ? (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => { setDrawerOpen(false); setProfileOpen(true); }}
                    >
                      <User className="h-4 w-4" />
                      My Profile
                    </Button>
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
              <a href={user ? (user.entityType === "store" ? "/products" : "/stores") : "/"} className="text-xl font-bold tracking-tight">groceror</a>
            </Link>

            {/* desktop nav links — role-based */}
            {user?.entityType === "store" && (
              <nav className="hidden md:flex items-center gap-1 ml-2">
                <Link href="/products">
                  <a className={navCls("/products", location)}>Products</a>
                </Link>
                <Link href="/inventory">
                  <a className={navCls("/inventory", location)}>Myventory</a>
                </Link>
                <Link href="/store-orders">
                  <a className={navCls("/store-orders", location)}>Orders</a>
                </Link>
              </nav>
            )}
            {user?.entityType === "user" && (
              <nav className="hidden md:flex items-center gap-1 ml-2">
                <Link href="/stores">
                  <a className={navCls("/stores", location)}>Browse</a>
                </Link>
                <Link href="/search">
                  <a className={navCls("/search", location)}>Search</a>
                </Link>
                <Link href="/orders">
                  <a className={navCls("/orders", location)}>Orders</a>
                </Link>
              </nav>
            )}
          </div>

          {/* ---- right: auth + cart ---- */}
          <div className="flex items-center gap-2">
            {user ? (
              /* logged-in: 3-bar profile button */
              <Button
                variant="outline"
                size="icon"
                onClick={() => setProfileOpen(true)}
                aria-label="Open profile"
              >
                <Menu className="h-5 w-5" />
              </Button>
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

            {/* cart — buyers only */}
            {user?.entityType === "user" && (
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
            )}
          </div>
        </div>
      </header>

      <main className={location === "/" ? "" : "container mx-auto px-4 py-8"}>
        {children}
      </main>

      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}

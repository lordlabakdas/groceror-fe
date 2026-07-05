import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingCart, Menu, User, Star, Bell, AlertTriangle } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth-context";
import { ProfileSheet } from "@/components/profile-sheet";
import { CartDrawer } from "@/components/cart-drawer";
import { useOrderAlerts } from "@/hooks/use-order-alerts";
import { CommandPalette } from "@/components/command-palette";
import { useQuery } from "@tanstack/react-query";

function navCls(href: string, current: string, mobile = false) {
  const active = current === href || current.startsWith(href + "/");
  const base = mobile
    ? "block px-3 py-2 rounded-md text-base transition-colors"
    : "px-3 py-1.5 rounded-md text-sm transition-colors";
  return active
    ? `${base} bg-accent text-accent-foreground font-semibold`
    : `${base} text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground font-medium`;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { state, cartOpen, openCart, closeCart } = useCart();
  const { user, openLogin, profileOpen, setProfileOpen } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [location] = useLocation();

  const totalItems = state.items.reduce((acc, item) => acc + item.quantity, 0);

  // Loyalty balance — only fetched for shoppers
  const { data: loyaltyBalance } = useQuery<{ points_balance: number }>({
    queryKey: ["/loyalty/balance"],
    enabled: user?.entityType === "user",
  });

  // Chime + toast + browser notification when a new order lands.
  useOrderAlerts(user?.entityType === "store");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background border-b border-border">
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
                    <Link href="/dashboard">
                      <a onClick={() => setDrawerOpen(false)} className={navCls("/dashboard", location, true)}>Dashboard</a>
                    </Link>
                    <Link href="/products">
                      <a onClick={() => setDrawerOpen(false)} className={navCls("/products", location, true)}>Products</a>
                    </Link>
                    <Link href="/inventory">
                      <a onClick={() => setDrawerOpen(false)} className={navCls("/inventory", location, true)}>Myventory</a>
                    </Link>
                    <Link href="/store-orders">
                      <a onClick={() => setDrawerOpen(false)} className={navCls("/store-orders", location, true)}>Orders</a>
                    </Link>
                    <Link href="/coupons">
                      <a onClick={() => setDrawerOpen(false)} className={navCls("/coupons", location, true)}>Coupons</a>
                    </Link>
                    <Link href="/delivery-zone">
                      <a onClick={() => setDrawerOpen(false)} className={navCls("/delivery-zone", location, true)}>Delivery Zone</a>
                    </Link>
                    <Link href="/disputes">
                      <a onClick={() => setDrawerOpen(false)} className={navCls("/disputes", location, true)}>Disputes</a>
                    </Link>
                  </nav>
                )}
                {user?.entityType === "user" && (
                  <nav className="flex flex-col gap-1 mt-8">
                    <Link href="/stores">
                      <a onClick={() => setDrawerOpen(false)} className={navCls("/stores", location, true)}>Browse</a>
                    </Link>
                    <Link href="/search">
                      <a onClick={() => setDrawerOpen(false)} className={navCls("/search", location, true)}>Search</a>
                    </Link>
                    <Link href="/orders">
                      <a onClick={() => setDrawerOpen(false)} className={navCls("/orders", location, true)}>Orders</a>
                    </Link>
                    <Link href="/loyalty">
                      <a onClick={() => setDrawerOpen(false)} className={navCls("/loyalty", location, true)}>
                        Loyalty {loyaltyBalance && loyaltyBalance.points_balance > 0 && `(${loyaltyBalance.points_balance} pts)`}
                      </a>
                    </Link>
                    <Link href="/alerts">
                      <a onClick={() => setDrawerOpen(false)} className={navCls("/alerts", location, true)}>Price Alerts</a>
                    </Link>
                    <Link href="/disputes">
                      <a onClick={() => setDrawerOpen(false)} className={navCls("/disputes", location, true)}>Disputes</a>
                    </Link>
                    <button onClick={() => { setDrawerOpen(false); openCart(); }} className={navCls("/cart", location, true)}>
                      Cart {totalItems > 0 && `(${totalItems})`}
                    </button>
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
              <a href={user ? (user.entityType === "store" ? "/products" : "/stores") : "/"} className="text-xl font-bold tracking-tight text-primary">groceror</a>
            </Link>

            {/* desktop nav links — role-based */}
            {user?.entityType === "store" && (
              <nav className="hidden md:flex items-center gap-1 ml-2">
                <Link href="/dashboard"><a className={navCls("/dashboard", location)}>Dashboard</a></Link>
                <Link href="/products"><a className={navCls("/products", location)}>Products</a></Link>
                <Link href="/inventory"><a className={navCls("/inventory", location)}>Myventory</a></Link>
                <Link href="/store-orders"><a className={navCls("/store-orders", location)}>Orders</a></Link>
                <Link href="/coupons"><a className={navCls("/coupons", location)}>Coupons</a></Link>
                <Link href="/delivery-zone"><a className={navCls("/delivery-zone", location)}>Zone</a></Link>
                <Link href="/disputes"><a className={navCls("/disputes", location)}>Disputes</a></Link>
              </nav>
            )}
            {user?.entityType === "user" && (
              <nav className="hidden md:flex items-center gap-1 ml-2">
                <Link href="/stores"><a className={navCls("/stores", location)}>Browse</a></Link>
                <Link href="/search"><a className={navCls("/search", location)}>Search</a></Link>
                <Link href="/orders"><a className={navCls("/orders", location)}>Orders</a></Link>
                <Link href="/loyalty">
                  <a className={`${navCls("/loyalty", location)} flex items-center gap-1`}>
                    <Star className="h-3 w-3" />
                    Loyalty
                    {loyaltyBalance && loyaltyBalance.points_balance > 0 && (
                      <span className="ml-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full px-1.5 py-0 font-medium">
                        {loyaltyBalance.points_balance}
                      </span>
                    )}
                  </a>
                </Link>
                <Link href="/alerts"><a className={`${navCls("/alerts", location)} flex items-center gap-1`}><Bell className="h-3 w-3" />Alerts</a></Link>
                <Link href="/disputes"><a className={`${navCls("/disputes", location)} flex items-center gap-1`}><AlertTriangle className="h-3 w-3" />Disputes</a></Link>
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
              <button className="relative" onClick={openCart} aria-label="Open cart">
                <Button variant="outline" size="icon" asChild>
                  <span>
                    <ShoppingCart className="h-5 w-5" />
                  </span>
                </Button>
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center font-medium">
                    {totalItems}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className={location === "/" ? "" : "container mx-auto px-4 py-8"}>
        {children}
      </main>

      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
      <CartDrawer open={cartOpen} onClose={closeCart} />
      <CommandPalette />
    </div>
  );
}

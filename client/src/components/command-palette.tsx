import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  BarChart3,
  LayoutDashboard,
  LogIn,
  LogOut,
  Package,
  Search,
  ShoppingBag,
  ShoppingCart,
  Store,
  User,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { user, logout, openLogin, setProfileOpen } = useAuth();
  const { openCart } = useCart();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {user?.entityType === "store" && (
          <CommandGroup heading="Navigate">
            <CommandItem onSelect={() => run(() => setLocation("/dashboard"))}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </CommandItem>
            <CommandItem onSelect={() => run(() => setLocation("/products"))}>
              <Package className="mr-2 h-4 w-4" />
              Products
            </CommandItem>
            <CommandItem onSelect={() => run(() => setLocation("/inventory"))}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Myventory
            </CommandItem>
            <CommandItem onSelect={() => run(() => setLocation("/store-orders"))}>
              <ShoppingBag className="mr-2 h-4 w-4" />
              Orders
            </CommandItem>
          </CommandGroup>
        )}

        {user?.entityType === "user" && (
          <CommandGroup heading="Navigate">
            <CommandItem onSelect={() => run(() => setLocation("/stores"))}>
              <Store className="mr-2 h-4 w-4" />
              Browse Stores
            </CommandItem>
            <CommandItem onSelect={() => run(() => setLocation("/search"))}>
              <Search className="mr-2 h-4 w-4" />
              Search Products
            </CommandItem>
            <CommandItem onSelect={() => run(() => setLocation("/orders"))}>
              <ShoppingBag className="mr-2 h-4 w-4" />
              Order History
            </CommandItem>
            <CommandItem onSelect={() => run(openCart)}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Open Cart
            </CommandItem>
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading="Account">
          {user ? (
            <>
              <CommandItem onSelect={() => run(() => setProfileOpen(true))}>
                <User className="mr-2 h-4 w-4" />
                My Profile
              </CommandItem>
              <CommandItem onSelect={() => run(logout)}>
                <LogOut className="mr-2 h-4 w-4" />
                Log Out
              </CommandItem>
            </>
          ) : (
            <CommandItem onSelect={() => run(() => openLogin("login"))}>
              <LogIn className="mr-2 h-4 w-4" />
              Log In
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

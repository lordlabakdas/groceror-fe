import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { CartProvider } from "./lib/cart";
import { AuthProvider, useAuth } from "./lib/auth-context";
import { AuthDialog } from "./components/auth-dialog";
import { Layout } from "./components/layout";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Products from "@/pages/products";
import Cart from "@/pages/cart";
import Inventory from "@/pages/inventory";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/products" component={Products} />
      <Route path="/cart" component={Cart} />
      <Route path="/inventory" component={Inventory} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Reads dialog state from AuthContext and renders the single shared AuthDialog.
function AuthDialogBridge() {
  const { dialogOpen, dialogTab, setDialogOpen } = useAuth();
  return (
    <AuthDialog
      key={dialogTab}
      isOpen={dialogOpen}
      onOpenChange={setDialogOpen}
      defaultTab={dialogTab}
    />
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <Layout>
            <Router />
          </Layout>
          <Toaster />
          <AuthDialogBridge />
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
import { Switch, Route, Redirect } from "wouter";
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
import Inventory from "@/pages/inventory";
import Dashboard from "@/pages/dashboard";
import Stores from "@/pages/stores";
import StoreBrowse from "@/pages/store-browse";
import Orders from "@/pages/orders";
import StoreOrders from "@/pages/store-orders";
import SearchPage from "@/pages/search";
import CouponsPage from "@/pages/coupons";
import DeliveryZonePage from "@/pages/delivery-zone";
import LoyaltyPage from "@/pages/loyalty";
import AlertsPage from "@/pages/alerts";
import BulkRulesPage from "@/pages/bulk-rules";
import DisputesPage from "@/pages/disputes";
import WishlistPage from "@/pages/wishlist";
import ScheduledOrdersPage from "@/pages/scheduled-orders";
import FollowingPage from "@/pages/following";
import StockAlertsPage from "@/pages/stock-alerts";

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { user } = useAuth();
  return user ? <Component /> : <Redirect to="/" />;
}

function StoreOwnerRoute({ component: Component }: { component: () => JSX.Element }) {
  const { user } = useAuth();
  if (!user) return <Redirect to="/" />;
  if (user.entityType !== "store") return <Redirect to="/stores" />;
  return <Component />;
}

function BuyerRoute({ component: Component }: { component: () => JSX.Element }) {
  const { user } = useAuth();
  if (!user) return <Redirect to="/" />;
  if (user.entityType !== "user") return <Redirect to="/products" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/products">{() => <StoreOwnerRoute component={Products} />}</Route>
      <Route path="/inventory">{() => <StoreOwnerRoute component={Inventory} />}</Route>
      <Route path="/dashboard">{() => <StoreOwnerRoute component={Dashboard} />}</Route>
      <Route path="/store-orders">{() => <StoreOwnerRoute component={StoreOrders} />}</Route>
      <Route path="/stores">{() => <BuyerRoute component={Stores} />}</Route>
      <Route path="/stores/:id">{() => <BuyerRoute component={StoreBrowse} />}</Route>
      <Route path="/search">{() => <BuyerRoute component={SearchPage} />}</Route>
      <Route path="/orders">{() => <BuyerRoute component={Orders} />}</Route>
      <Route path="/loyalty">{() => <BuyerRoute component={LoyaltyPage} />}</Route>
      <Route path="/alerts">{() => <BuyerRoute component={AlertsPage} />}</Route>
      <Route path="/disputes">{() => <ProtectedRoute component={DisputesPage} />}</Route>
      <Route path="/wishlist">{() => <BuyerRoute component={WishlistPage} />}</Route>
      <Route path="/scheduled-orders">{() => <BuyerRoute component={ScheduledOrdersPage} />}</Route>
      <Route path="/following">{() => <BuyerRoute component={FollowingPage} />}</Route>
      <Route path="/stock-alerts">{() => <StoreOwnerRoute component={StockAlertsPage} />}</Route>
      <Route path="/bulk-rules">{() => <StoreOwnerRoute component={BulkRulesPage} />}</Route>
      <Route path="/coupons">{() => <StoreOwnerRoute component={CouponsPage} />}</Route>
      <Route path="/delivery-zone">{() => <StoreOwnerRoute component={DeliveryZonePage} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

// Reads dialog state from AuthContext and renders the single shared AuthDialog.
function AuthDialogBridge() {
  const { dialogOpen, dialogTab, dialogEntityType, setDialogOpen } = useAuth();
  return (
    <AuthDialog
      key={`${dialogTab}-${dialogEntityType}`}
      isOpen={dialogOpen}
      onOpenChange={setDialogOpen}
      defaultTab={dialogTab}
      defaultEntityType={dialogEntityType}
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
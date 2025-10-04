import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import GRN from "@/pages/grn";
import SalesOrders from "@/pages/sales-orders";
import PurchaseOrders from "@/pages/purchase-orders";
import JobOrders from "@/pages/job-orders";
import SalesChallans from "@/pages/sales-challans";
import StockLevels from "@/pages/stock-levels";
import MasterData from "@/pages/master-data";
import Categories from "@/pages/categories";

import Products from "@/pages/products";
import Warehouses from "@/pages/warehouses";
import Customers from "@/pages/customers";
import Suppliers from "@/pages/suppliers";
import Processors from "@/pages/processors";
import Settings from "@/pages/settings";
import UserManagement from "@/pages/user-management-fixed";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import NotFound from "@/pages/not-found";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <div className="flex h-screen" style={{ backgroundColor: "hsl(var(--surface))" }}>
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ backgroundColor: "hsl(var(--surface))" }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Login} />
          <Route path="/login" component={Login} />
        </>
      ) : (
        <AuthenticatedLayout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/grn" component={GRN} />
            <Route path="/sales-orders" component={SalesOrders} />
            <Route path="/purchase-orders" component={PurchaseOrders} />
            <Route path="/job-orders" component={JobOrders} />
            <Route path="/sales-challans" component={SalesChallans} />
            <Route path="/stock-levels" component={StockLevels} />
            <Route path="/master-data" component={MasterData} />
            <Route path="/categories" component={Categories} />

            <Route path="/products" component={Products} />
            <Route path="/warehouses" component={Warehouses} />
            <Route path="/customers" component={Customers} />
            <Route path="/suppliers" component={Suppliers} />
            <Route path="/processors" component={Processors} />
            <Route path="/user-management" component={UserManagement} />
            <Route path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </AuthenticatedLayout>
      )}
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

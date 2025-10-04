import { useQuery } from "@tanstack/react-query";
// Note: Dashboard now uses direct query keys instead of reportsApi
import StatsCard from "@/components/stats-card";
import { Package, TrendingUp, AlertTriangle, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { useRetryableQuery } from "@/hooks/useRetryableQuery";
import { LoadingSpinner, RetryableError, DashboardCardSkeleton } from "@/components/LoadingStates";

export default function Dashboard() {
  const statsQuery = useRetryableQuery({
    queryKey: ["/api/dashboard/stats"],
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const transactionsQuery = useRetryableQuery({
    queryKey: ["/api/dashboard/recent-transactions"],
    staleTime: 30 * 1000, // 30 seconds
  });

  const alertsQuery = useRetryableQuery({
    queryKey: ["/api/dashboard/stock-alerts"],
    staleTime: 60 * 1000, // 1 minute
  });

  const ordersQuery = useRetryableQuery({
    queryKey: ["/api/dashboard/pending-orders"],
    staleTime: 60 * 1000, // 1 minute
  });

  // Extract data and loading states
  const stats = statsQuery.data || {};
  const recentTransactions = transactionsQuery.data?.transactions || [];
  const stockAlerts = alertsQuery.data?.alerts || [];
  const pendingOrders = ordersQuery.data?.orders || [];
  
  const transactionsLoading = transactionsQuery.isLoading;
  const alertsLoading = alertsQuery.isLoading;
  const ordersLoading = ordersQuery.isLoading;

  const formatTransactionType = (type: string) => {
    switch (type) {
      case "GRN_IN":
        return { label: "GRN", class: "transaction-badge-grn", icon: "↓" };
      case "SALES_OUT":
        return { label: "SALE", class: "transaction-badge-sale", icon: "↑" };
      case "WIP_SENT":
      case "WIP_RECEIVED":
        return { label: "WIP", class: "transaction-badge-wip", icon: "⚙" };
      default:
        return { label: type, class: "transaction-badge-grn", icon: "" };
    }
  };

  const formatQuantity = (quantity: string, type: string) => {
    const qty = parseFloat(quantity);
    const sign = type === "SALES_OUT" ? "-" : "+";
    return `${sign}${qty.toLocaleString()} KG`;
  };

  // Enhanced error handling for stats
  if (statsQuery.error && !statsQuery.isFetching) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <RetryableError
          error={statsQuery.error}
          onRetry={statsQuery.manualRetry}
          isRetrying={statsQuery.isRetrying}
          currentAttempt={statsQuery.retryAttempt}
        />
      </div>
    );
  }

  if (statsQuery.isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <DashboardCardSkeleton key={i} />
          ))}
        </div>
        <LoadingSpinner size="lg" text="Loading dashboard data..." />
      </div>
    );
  }



  return (
    <div className="p-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Stock"
          value={`${stats?.totalStock || "0"} KG`}
          icon={Package}
          iconColor="text-primary"
          iconBgColor="bg-primary/10"
        />
        <StatsCard
          title="Monthly Inflow"
          value={`${stats?.monthlyInflow || "0"} KG`}
          icon={TrendingUp}
          iconColor="text-success"
          iconBgColor="bg-success/10"
        />
        <StatsCard
          title="Low Stock Items"
          value={stats?.lowStockItems?.toString() || "0"}
          icon={AlertTriangle}
          iconColor="text-warning"
          iconBgColor="bg-warning/10"
        />
        <StatsCard
          title="WIP Items"
          value={`${stats?.wipItems || "0"} KG`}
          icon={Settings}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-50"
        />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2">
          <Card className="bg-white material-shadow">
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
                <Button variant="link" className="text-primary hover:text-primary/80 p-0">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {transactionsLoading ? (
                <div className="p-6">
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4 animate-pulse">
                        <div className="w-16 h-6 bg-gray-200 rounded"></div>
                        <div className="flex-1 h-4 bg-gray-200 rounded"></div>
                        <div className="w-20 h-4 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions?.length > 0 ? (
                      recentTransactions.map((transaction: any) => {
                        const typeInfo = formatTransactionType(transaction.transactionType);
                        return (
                          <TableRow key={transaction.id} className="hover:bg-muted/50">
                            <TableCell>
                              <Badge className={`transaction-badge ${typeInfo.class}`}>
                                <span className="mr-1">{typeInfo.icon}</span>
                                {typeInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-medium">{transaction.skuName}</div>
                              <div className="text-sm text-muted-foreground font-mono">
                                {transaction.skuCode}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono">
                              {formatQuantity(transaction.quantityChange, transaction.transactionType)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {transaction.locationName}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {transaction.transactionDate 
                                ? format(new Date(transaction.transactionDate), "MMM dd, HH:mm")
                                : "N/A"
                              }
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No recent transactions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Alerts */}
        <div className="space-y-6">
          {/* Stock Alerts */}
          <Card className="bg-white material-shadow">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-lg font-semibold">Stock Alerts</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {alertsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="alert-card-warning animate-pulse">
                      <div className="w-4 h-4 bg-gray-200 rounded"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : stockAlerts?.length > 0 ? (
                <div className="space-y-4">
                  {stockAlerts.map((alert: any, index: number) => (
                    <div key={index} className="alert-card alert-card-warning">
                      <AlertTriangle className="text-warning mt-1 w-4 h-4" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{alert.skuName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{alert.skuCode}</p>
                        <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No stock alerts at this time</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Orders */}
          <Card className="bg-white material-shadow">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-lg font-semibold">Pending Orders</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {ordersLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg animate-pulse">
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                      <div className="w-16 h-6 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : pendingOrders?.length > 0 ? (
                <div className="space-y-4">
                  {pendingOrders.map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{order.customerName}</p>
                        <p className="text-xs text-muted-foreground">
                          Expected: {order.expectedDeliveryDate 
                            ? format(new Date(order.expectedDeliveryDate), "MMM dd, yyyy")
                            : "N/A"
                          }
                        </p>
                      </div>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        {order.status || "Pending"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No pending orders</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>


      </div>
    </div>
  );
}

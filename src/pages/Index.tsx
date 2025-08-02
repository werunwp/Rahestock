import { useState, memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Package, Users, DollarSign, AlertTriangle, Clock } from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";
import { SimpleDateRangeFilter } from "@/components/SimpleDateRangeFilter";
import { useProfile } from "@/hooks/useProfile";
import { formatDistanceToNow } from "date-fns";
import { getTimeBasedGreeting } from "@/lib/time";
import { useCurrency } from "@/hooks/useCurrency";

const Index = () => {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  
  const { dashboardStats, isLoading } = useDashboard(startDate, endDate);
  const { profile } = useProfile();
  const { formatAmount } = useCurrency();

  const handleDateRangeChange = (start?: Date, end?: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  // Show skeleton for main stats only
  const StatCard = memo(({ title, value, subtitle, icon: Icon, isLoading }: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: any;
    isLoading: boolean;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  ));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            {getTimeBasedGreeting()}, {profile?.full_name || "User"}
          </p>
        </div>
        <div className="w-full md:w-auto">
          <SimpleDateRangeFilter onDateRangeChange={handleDateRangeChange} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={formatAmount(dashboardStats?.totalRevenue || 0)}
          subtitle={startDate && endDate ? "For selected period" : "All time"}
          icon={DollarSign}
          isLoading={isLoading}
        />
        <StatCard
          title="Units Sold"
          value={dashboardStats?.unitsSold.toLocaleString() || 0}
          subtitle={startDate && endDate ? "For selected period" : "All time"}
          icon={TrendingUp}
          isLoading={isLoading}
        />
        <StatCard
          title="Total Products"
          value={dashboardStats?.totalProducts || 0}
          subtitle="In inventory"
          icon={Package}
          isLoading={isLoading}
        />
        <StatCard
          title="Total Customers"
          value={dashboardStats?.activeCustomers || 0}
          subtitle={startDate && endDate ? "For selected period" : "Total customers"}
          icon={Users}
          isLoading={isLoading}
        />
      </div>

      {/* Alerts and Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Low Stock Alerts
            </CardTitle>
            <CardDescription>
              Products running low on inventory
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboardStats?.lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No low stock alerts</p>
            ) : (
              dashboardStats?.lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {product.sku ? `SKU: ${product.sku}` : "No SKU"}
                    </p>
                  </div>
                  <Badge variant={product.stock_quantity <= 5 ? "destructive" : "secondary"}>
                    {product.stock_quantity} left
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              Pending Payments
            </CardTitle>
            <CardDescription>
              Invoices with outstanding dues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboardStats?.pendingPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending payments</p>
            ) : (
              dashboardStats?.pendingPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{payment.customer_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.invoice_number} - {formatDistanceToNow(new Date(payment.created_at))} ago
                    </p>
                  </div>
                  <Badge variant="destructive">{formatAmount(payment.amount_due)}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Get started with common tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Use the sidebar to navigate to different sections of your inventory system.
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-sm">
              <Badge variant="outline">Add Products</Badge>
              <Badge variant="outline">Record Sale</Badge>
              <Badge variant="outline">Update Inventory</Badge>
              <Badge variant="outline">View Reports</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;

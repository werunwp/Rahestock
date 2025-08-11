import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Package, Users, ShoppingCart, AlertTriangle, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

interface BusinessStats {
  totalRevenue: number;
  revenueGrowth: number;
  totalOrders: number;
  ordersGrowth: number;
  totalCustomers: number;
  customersGrowth: number;
  lowStockProducts: number;
  recentActivity: Array<{
    id: string;
    type: 'sale' | 'product' | 'customer';
    description: string;
    timestamp: string;
    amount?: number;
  }>;
}

export function BusinessAnalytics() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["business-analytics"],
    queryFn: async (): Promise<BusinessStats> => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Current period (last 30 days)
      const { data: currentSales } = await supabase
        .from("sales")
        .select("grand_total, created_at")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .lte("created_at", now.toISOString());

      // Previous period (30-60 days ago)
      const { data: previousSales } = await supabase
        .from("sales")
        .select("grand_total")
        .gte("created_at", sixtyDaysAgo.toISOString())
        .lt("created_at", thirtyDaysAgo.toISOString());

      // Customer stats
      const { data: currentCustomers } = await supabase
        .from("customers")
        .select("id")
        .gte("created_at", thirtyDaysAgo.toISOString());

      const { data: previousCustomers } = await supabase
        .from("customers")
        .select("id")
        .gte("created_at", sixtyDaysAgo.toISOString())
        .lt("created_at", thirtyDaysAgo.toISOString());

      // Low stock products
      const { data: lowStockProducts } = await supabase
        .from("products")
        .select("id")
        .lt("quantity", 10);

      // Recent activity
      const { data: recentSales } = await supabase
        .from("sales")
        .select("id, grand_total, created_at, customers(name)")
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: recentProducts } = await supabase
        .from("products")
        .select("id, name, created_at")
        .order("created_at", { ascending: false })
        .limit(3);

      const { data: recentCustomers } = await supabase
        .from("customers")
        .select("id, name, created_at")
        .order("created_at", { ascending: false })
        .limit(3);

      // Calculate stats
      const totalRevenue = currentSales?.reduce((sum, sale) => sum + (sale.grand_total || 0), 0) || 0;
      const previousRevenue = previousSales?.reduce((sum, sale) => sum + (sale.grand_total || 0), 0) || 0;
      const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      const totalOrders = currentSales?.length || 0;
      const previousOrders = previousSales?.length || 0;
      const ordersGrowth = previousOrders > 0 ? ((totalOrders - previousOrders) / previousOrders) * 100 : 0;

      const totalCustomers = currentCustomers?.length || 0;
      const previousCustomersCount = previousCustomers?.length || 0;
      const customersGrowth = previousCustomersCount > 0 ? ((totalCustomers - previousCustomersCount) / previousCustomersCount) * 100 : 0;

      // Combine recent activity
      const recentActivity = [
        ...(recentSales?.map(sale => ({
          id: sale.id,
          type: 'sale' as const,
          description: `Sale to ${(sale.customers as any)?.name || 'Customer'}`,
          timestamp: sale.created_at,
          amount: sale.grand_total
        })) || []),
        ...(recentProducts?.map(product => ({
          id: product.id,
          type: 'product' as const,
          description: `New product: ${product.name}`,
          timestamp: product.created_at
        })) || []),
        ...(recentCustomers?.map(customer => ({
          id: customer.id,
          type: 'customer' as const,
          description: `New customer: ${customer.name}`,
          timestamp: customer.created_at
        })) || [])
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

      return {
        totalRevenue,
        revenueGrowth,
        totalOrders,
        ordersGrowth,
        totalCustomers,
        customersGrowth,
        lowStockProducts: lowStockProducts?.length || 0,
        recentActivity
      };
    }
  });

  const StatCard = ({ 
    title, 
    value, 
    growth, 
    icon: Icon, 
    prefix = "" 
  }: { 
    title: string; 
    value: number; 
    growth: number; 
    icon: any; 
    prefix?: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{prefix}{value.toLocaleString()}</div>
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          {growth >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
          <span className={growth >= 0 ? "text-green-500" : "text-red-500"}>
            {Math.abs(growth).toFixed(1)}%
          </span>
          <span>from last period</span>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Revenue (30d)"
          value={stats?.totalRevenue || 0}
          growth={stats?.revenueGrowth || 0}
          icon={DollarSign}
          prefix="$"
        />
        <StatCard
          title="Orders (30d)"
          value={stats?.totalOrders || 0}
          growth={stats?.ordersGrowth || 0}
          icon={ShoppingCart}
        />
        <StatCard
          title="New Customers (30d)"
          value={stats?.totalCustomers || 0}
          growth={stats?.customersGrowth || 0}
          icon={Users}
        />
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alert</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.lowStockProducts || 0}</div>
            <p className="text-xs text-muted-foreground">
              Products below 10 units
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest business activities across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats?.recentActivity.map((activity) => (
              <div key={`${activity.type}-${activity.id}`} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  {activity.type === 'sale' && <ShoppingCart className="h-4 w-4 text-green-500" />}
                  {activity.type === 'product' && <Package className="h-4 w-4 text-blue-500" />}
                  {activity.type === 'customer' && <Users className="h-4 w-4 text-purple-500" />}
                  <div>
                    <p className="text-sm font-medium">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleDateString()} at{" "}
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activity.amount && (
                    <Badge variant="outline">{formatCurrency(activity.amount)}</Badge>
                  )}
                  <Badge 
                    variant={
                      activity.type === 'sale' ? 'default' : 
                      activity.type === 'product' ? 'secondary' : 'outline'
                    }
                  >
                    {activity.type}
                  </Badge>
                </div>
              </div>
            ))}
            {!stats?.recentActivity.length && (
              <p className="text-center text-muted-foreground py-4">No recent activity</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
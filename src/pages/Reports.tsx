import { useState, useMemo } from "react";
import { BarChart3, TrendingUp, Download, Calendar, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useDashboard } from "@/hooks/useDashboard";
import { useProducts } from "@/hooks/useProducts";
import { useCustomers } from "@/hooks/useCustomers";
import { useSales } from "@/hooks/useSales";
import { SimpleDateRangeFilter } from "@/components/SimpleDateRangeFilter";
import { SalesTrendFilter, SalesTrendPeriod, SalesTrendRange } from "@/components/SalesTrendFilter";
import { formatCurrency } from "@/lib/currency";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, eachYearOfInterval, startOfYear, endOfYear, subDays, subMonths, subYears } from "date-fns";

const Reports = () => {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [salesTrendPeriod, setSalesTrendPeriod] = useState<SalesTrendPeriod>("daily");
  const [salesTrendRange, setSalesTrendRange] = useState<SalesTrendRange>("last30days");
  const [salesCustomStart, setSalesCustomStart] = useState<Date>();
  const [salesCustomEnd, setSalesCustomEnd] = useState<Date>();
  
  const { dashboardStats } = useDashboard(dateRange.from, dateRange.to);
  const { products } = useProducts();
  const { customers } = useCustomers();
  const { sales } = useSales();

  // Calculate sales analytics with separate trend filtering
  const salesAnalytics = useMemo(() => {
    if (!sales?.length) return { topProducts: [], salesTrend: [], totalSalesItems: 0 };

    // Calculate product sales from sales data
    const productSalesMap = new Map();
    let totalSalesItems = 0;

    sales.forEach(sale => {
      totalSalesItems += sale.grand_total || 0;
    });

    // Calculate top products based on remaining stock and sales value
    const topProducts = products
      .map(product => {
        const estimatedSold = Math.max(0, 100 - product.stock_quantity);
        const salesValue = estimatedSold * product.rate;
        return { 
          ...product, 
          salesAmount: salesValue,
          unitsSold: estimatedSold 
        };
      })
      .sort((a, b) => b.salesAmount - a.salesAmount)
      .slice(0, 5);

    // Generate sales trend data based on selected period and range
    const getSalesTrendData = () => {
      const now = new Date();
      let startDate: Date;
      let endDate: Date = now;
      let intervals: Date[] = [];

      // Determine date range
      if (salesTrendRange === "custom" && salesCustomStart && salesCustomEnd) {
        startDate = salesCustomStart;
        endDate = salesCustomEnd;
      } else {
        switch (salesTrendRange) {
          case "last30days":
            startDate = subDays(now, 30);
            break;
          case "last6months":
            startDate = subMonths(now, 6);
            break;
          case "last12months":
            startDate = subMonths(now, 12);
            break;
          case "currentYear":
            startDate = startOfYear(now);
            endDate = endOfYear(now);
            break;
          case "lastYear":
            startDate = startOfYear(subYears(now, 1));
            endDate = endOfYear(subYears(now, 1));
            break;
          default:
            startDate = subDays(now, 30);
        }
      }

      // Generate intervals based on period
      switch (salesTrendPeriod) {
        case "daily":
          intervals = eachDayOfInterval({ start: startDate, end: endDate });
          break;
        case "monthly":
          intervals = eachMonthOfInterval({ start: startDate, end: endDate });
          break;
        case "yearly":
          intervals = eachYearOfInterval({ start: startDate, end: endDate });
          break;
      }

      return intervals.map(date => {
        let dateStr: string;
        let matchingFilter: (saleDate: Date) => boolean;

        switch (salesTrendPeriod) {
          case "daily":
            dateStr = format(date, 'MMM dd');
            matchingFilter = (saleDate) => saleDate.toDateString() === date.toDateString();
            break;
          case "monthly":
            dateStr = format(date, 'MMM yyyy');
            matchingFilter = (saleDate) => 
              saleDate.getFullYear() === date.getFullYear() && 
              saleDate.getMonth() === date.getMonth();
            break;
          case "yearly":
            dateStr = format(date, 'yyyy');
            matchingFilter = (saleDate) => saleDate.getFullYear() === date.getFullYear();
            break;
          default:
            dateStr = format(date, 'MMM dd');
            matchingFilter = (saleDate) => saleDate.toDateString() === date.toDateString();
        }

        const periodSales = sales.filter(sale => {
          const saleDate = new Date(sale.created_at);
          return matchingFilter(saleDate);
        });

        const revenue = periodSales.reduce((sum, sale) => sum + (sale.grand_total || 0), 0);
        return { date: dateStr, revenue, orders: periodSales.length };
      });
    };

    const salesTrend = getSalesTrendData();

    return { topProducts, salesTrend, totalSalesItems };
  }, [sales, products, salesTrendPeriod, salesTrendRange, salesCustomStart, salesCustomEnd]);

  const handleSalesTrendFilterChange = (
    period: SalesTrendPeriod, 
    range: SalesTrendRange, 
    customStart?: Date, 
    customEnd?: Date
  ) => {
    setSalesTrendPeriod(period);
    setSalesTrendRange(range);
    setSalesCustomStart(customStart);
    setSalesCustomEnd(customEnd);
  };

  // Calculate top customers
  const topCustomers = customers
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, 5);

  // Calculate customer growth
  const customerGrowth = useMemo(() => {
    const last6Months = eachMonthOfInterval({
      start: startOfMonth(new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1)),
      end: endOfMonth(new Date())
    });

    return last6Months.map(month => {
      const monthStr = format(month, 'MMM yyyy');
      const monthCustomers = customers.filter(customer => {
        const customerDate = new Date(customer.created_at);
        return customerDate.getFullYear() === month.getFullYear() && 
               customerDate.getMonth() === month.getMonth();
      });
      return { month: monthStr, customers: monthCustomers.length };
    });
  }, [customers]);

  // Calculate stock levels for chart
  const stockLevels = useMemo(() => {
    return products
      .slice(0, 10)
      .map(product => ({
        name: product.name.length > 10 ? product.name.substring(0, 10) + '...' : product.name,
        stock: product.stock_quantity,
        threshold: product.low_stock_threshold,
        status: product.stock_quantity <= product.low_stock_threshold ? 'Low' : 'Normal'
      }));
  }, [products]);

  // Calculate financial data
  const financialData = useMemo(() => {
    const revenue = dashboardStats?.totalRevenue || 0;
    const costOfGoods = revenue * 0.6; // Estimate 60% cost
    const operatingExpenses = revenue * 0.2; // Estimate 20% expenses
    const profit = revenue - costOfGoods - operatingExpenses;

    return [
      { name: 'Revenue', value: revenue, color: 'hsl(var(--primary))' },
      { name: 'Cost of Goods', value: costOfGoods, color: 'hsl(var(--destructive))' },
      { name: 'Operating Expenses', value: operatingExpenses, color: 'hsl(var(--muted))' },
      { name: 'Net Profit', value: profit, color: 'hsl(var(--success))' }
    ];
  }, [dashboardStats]);

  const avgOrderValue = dashboardStats?.totalRevenue && sales.length > 0 
    ? dashboardStats.totalRevenue / sales.length 
    : 0;

  const profitMargin = dashboardStats?.totalRevenue 
    ? ((dashboardStats.totalRevenue * 0.2) / dashboardStats.totalRevenue) * 100 
    : 0;
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive business insights and performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          <SimpleDateRangeFilter onDateRangeChange={(from, to) => setDateRange({ from, to })} />
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboardStats?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Selected period revenue
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sales.length}</div>
            <p className="text-xs text-muted-foreground">
              Total sales orders
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgOrderValue)}</div>
            <p className="text-xs text-muted-foreground">
              Average per order
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profitMargin.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Estimated margin
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Sales Report</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Report</TabsTrigger>
          <TabsTrigger value="customers">Customer Report</TabsTrigger>
          <TabsTrigger value="financial">Financial Report</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <SalesTrendFilter onFilterChange={handleSalesTrendFilterChange} />
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Sales Trend - {salesTrendPeriod.charAt(0).toUpperCase() + salesTrendPeriod.slice(1)} View</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ChartContainer
                  config={{
                    revenue: { label: "Revenue", color: "hsl(var(--primary))" },
                    orders: { label: "Orders", color: "hsl(var(--secondary))" }
                  }}
                  className="h-[350px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesAnalytics.salesTrend} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
                      <Line type="monotone" dataKey="orders" stroke="hsl(var(--secondary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {salesAnalytics.topProducts.length > 0 ? salesAnalytics.topProducts.map((product, index) => (
                    <div key={product.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.unitsSold} units sold</p>
                      </div>
                      <p className="font-bold text-right ml-2">{formatCurrency(product.salesAmount)}</p>
                    </div>
                  )) : (
                    <p className="text-muted-foreground text-center py-8">No sales data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Stock Levels</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ChartContainer
                  config={{
                    stock: { label: "Current Stock", color: "hsl(var(--primary))" },
                    threshold: { label: "Low Stock Threshold", color: "hsl(var(--destructive))" }
                  }}
                  className="h-[350px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stockLevels} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="stock" fill="hsl(var(--primary))" />
                      <Bar dataKey="threshold" fill="hsl(var(--destructive))" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Low Stock Alert</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardStats?.lowStockProducts?.length > 0 ? 
                    dashboardStats.lowStockProducts.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                        </div>
                        <p className="font-bold text-destructive text-right ml-2">{item.stock_quantity} left</p>
                      </div>
                    )) : (
                      <p className="text-muted-foreground text-center py-8">No low stock items</p>
                    )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Customer Growth</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ChartContainer
                  config={{
                    customers: { label: "New Customers", color: "hsl(var(--primary))" }
                  }}
                  className="h-[350px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={customerGrowth} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="customers" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topCustomers.length > 0 ? topCustomers.map((customer, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">{customer.order_count} orders</p>
                      </div>
                      <p className="font-bold text-right ml-2">{formatCurrency(customer.total_spent)}</p>
                    </div>
                  )) : (
                    <p className="text-muted-foreground text-center py-8">No customer data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Revenue vs Expenses</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ChartContainer
                  config={{
                    value: { label: "Amount", color: "hsl(var(--primary))" }
                  }}
                  className="h-[350px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={financialData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {financialData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Profit Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between p-2 rounded-lg hover:bg-muted/50">
                    <span>Gross Revenue</span>
                    <span className="font-bold">{formatCurrency(dashboardStats?.totalRevenue || 0)}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg hover:bg-muted/50">
                    <span>Cost of Goods</span>
                    <span className="font-bold text-destructive">{formatCurrency((dashboardStats?.totalRevenue || 0) * 0.6)}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg hover:bg-muted/50">
                    <span>Operating Expenses</span>
                    <span className="font-bold text-destructive">{formatCurrency((dashboardStats?.totalRevenue || 0) * 0.2)}</span>
                  </div>
                  <div className="border-t pt-4 flex justify-between p-2 rounded-lg bg-muted/30">
                    <span className="font-bold">Net Profit</span>
                    <span className="font-bold text-green-600">{formatCurrency((dashboardStats?.totalRevenue || 0) * 0.2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
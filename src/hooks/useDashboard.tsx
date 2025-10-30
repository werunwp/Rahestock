import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { startOfDay, endOfDay } from "date-fns";

export interface DashboardStats {
  totalRevenue: number;
  unitsSold: number;
  totalProducts: number;
  activeCustomers: number;
  lowStockProducts: Array<{
    id: string;
    name: string;
    sku: string;
    stock_quantity: number;
  }>;
  pendingPayments: Array<{
    id: string;
    customer_name: string;
    invoice_number: string;
    amount_due: number;
    created_at: string;
  }>;
}

export const useDashboard = (startDate?: Date, endDate?: Date) => {
  const { user } = useAuth();

  const dateFilter = startDate && endDate ? {
    start: startOfDay(startDate).toISOString(),
    end: endOfDay(endDate).toISOString()
  } : null;

  const {
    data: dashboardStats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["dashboard", dateFilter],
    queryFn: async () => {
      const stats: DashboardStats = {
        totalRevenue: 0,
        unitsSold: 0,
        totalProducts: 0,
        activeCustomers: 0,
        lowStockProducts: [],
        pendingPayments: [],
      };

      // Build date filter for sales queries (exclude cancelled sales)
      let salesQuery = supabase
        .from("sales")
        .select("*")
        .neq("payment_status", "cancelled");
      
      if (dateFilter) {
        salesQuery = salesQuery
          .gte("created_at", dateFilter.start)
          .lte("created_at", dateFilter.end);
      }

      // Get sales data for revenue and customers
      const { data: sales } = await salesQuery;
      if (sales) {
        stats.totalRevenue = sales.reduce((sum, sale) => sum + (sale.grand_total || 0), 0);
        stats.activeCustomers = new Set(sales.map(sale => sale.customer_id).filter(Boolean)).size;
        
        // Calculate paid amount based on payment status OR delivered courier status
        stats.totalPaid = sales.reduce((sum, sale) => {
          const isPaid = sale.payment_status === 'paid' || sale.courier_status === 'delivered';
          return isPaid ? sum + (sale.grand_total || 0) : sum + (sale.amount_paid || 0);
        }, 0);
        
        // Calculate due amount (total revenue - paid amount)
        stats.totalDue = stats.totalRevenue - stats.totalPaid;
      }

      // Get units sold (exclude cancelled sales)
      let unitsQuery = supabase
        .from("sales_items")
        .select("quantity, sales!inner(created_at, payment_status)")
        .neq("sales.payment_status", "cancelled");
      
      if (dateFilter) {
        unitsQuery = unitsQuery
          .gte("sales.created_at", dateFilter.start)
          .lte("sales.created_at", dateFilter.end);
      }

      const { data: salesItems } = await unitsQuery;
      if (salesItems) {
        stats.unitsSold = salesItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
      }

      // Get business settings for low stock threshold
      const { data: businessSettings } = await supabase
        .from("business_settings")
        .select("low_stock_alert_quantity")
        .single();
      
      const globalLowStockThreshold = businessSettings?.low_stock_alert_quantity || 10;

      // Get total products
      const { data: products } = await supabase
        .from("products")
        .select("*");
      
      if (products) {
        stats.totalProducts = products.length;
        
        // Get low stock products
        // Use product's individual threshold if set, otherwise use global threshold
        // Only show products with stock > 0 and <= threshold
        stats.lowStockProducts = products
          .filter(product => {
            const stockQty = product.stock_quantity || 0;
            const threshold = product.low_stock_threshold ?? globalLowStockThreshold;
            return stockQty > 0 && stockQty <= threshold;
          })
          .slice(0, 5)
          .map(product => ({
            id: product.id,
            name: product.name,
            sku: product.sku || '',
            stock_quantity: product.stock_quantity,
          }));
      }

      // Get pending payments (exclude cancelled sales)
      const { data: pendingSales } = await supabase
        .from("sales")
        .select("*")
        .in("payment_status", ["pending", "partial"])
        .gt("amount_due", 0)
        .order("created_at", { ascending: false })
        .limit(5);

      if (pendingSales) {
        stats.pendingPayments = pendingSales.map(sale => ({
          id: sale.id,
          customer_name: sale.customer_name,
          invoice_number: sale.invoice_number,
          amount_due: sale.amount_due || 0,
          created_at: sale.created_at,
        }));
      }

      return stats;
    },
    enabled: !!user,
  });

  return {
    dashboardStats,
    isLoading,
    error,
  };
};
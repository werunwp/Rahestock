import { useState, useMemo } from "react";
import { Plus, Archive, TrendingUp, TrendingDown, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useProducts } from "@/hooks/useProducts";
import { useCurrency } from "@/hooks/useCurrency";
import { StockAdjustmentDialog } from "@/components/StockAdjustmentDialog";
import { SimpleDateRangeFilter } from "@/components/SimpleDateRangeFilter";
import { format, isAfter, isBefore, isEqual } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const Inventory = () => {
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [stockFilter, setStockFilter] = useState<"all" | "in_stock" | "out_of_stock">("all");
  
  const { products, isLoading } = useProducts();
  const { formatAmount } = useCurrency();
  const { user } = useAuth();

  // Fetch all product variants for inventory display
  const { data: allVariants = [], isLoading: variantsLoading } = useQuery({
    queryKey: ["all_product_variants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variants")
        .select(`
          *,
          products!inner(name, sku)
        `)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Create combined inventory items (products + variants)
  const inventoryItems = useMemo(() => {
    const items: any[] = [];
    
    // Add products
    products.forEach(product => {
      if (!product.has_variants) {
        items.push({
          id: product.id,
          type: 'product',
          name: product.name,
          sku: product.sku,
          stock_quantity: product.stock_quantity,
          low_stock_threshold: product.low_stock_threshold,
          updated_at: product.updated_at,
          variant_info: null
        });
      }
    });
    
    // Add variants
    allVariants.forEach(variant => {
      const variantDisplay = Object.entries(variant.attributes)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      
      items.push({
        id: variant.id,
        type: 'variant',
        name: variant.products.name,
        sku: variant.sku || variant.products.sku,
        stock_quantity: variant.stock_quantity,
        low_stock_threshold: variant.low_stock_threshold,
        updated_at: variant.updated_at,
        variant_info: variantDisplay
      });
    });
    
    return items;
  }, [products, allVariants]);

  const filteredItems = inventoryItems.filter(item => {
    // Text search filter
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.variant_info && item.variant_info.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Stock filter
    const matchesStock = stockFilter === "all" || 
      (stockFilter === "in_stock" && item.stock_quantity > 0) ||
      (stockFilter === "out_of_stock" && item.stock_quantity === 0);
    
    // Date range filter
    const itemDate = new Date(item.updated_at);
    let matchesDate = true;
    
    if (dateRange.from && dateRange.to) {
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999);
      
      matchesDate = (isAfter(itemDate, fromDate) || isEqual(itemDate, fromDate)) &&
                    (isBefore(itemDate, toDate) || isEqual(itemDate, toDate));
    } else if (dateRange.from) {
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      matchesDate = isAfter(itemDate, fromDate) || isEqual(itemDate, fromDate);
    } else if (dateRange.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      matchesDate = isBefore(itemDate, toDate) || isEqual(itemDate, toDate);
    }
    
    return matchesSearch && matchesStock && matchesDate;
  });

  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.stock_quantity <= p.low_stock_threshold);
  const outOfStockProducts = products.filter(p => p.stock_quantity === 0);
  const totalValue = products.reduce((sum, p) => sum + (p.stock_quantity * (p.cost || p.rate)), 0);
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-muted-foreground">
            Track stock movements and manage inventory levels
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SimpleDateRangeFilter onDateRangeChange={(from, to) => setDateRange({ from, to })} />
          <Button onClick={() => setShowAdjustmentDialog(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Adjust Stock
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Archive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalProducts}</div>
                <p className="text-xs text-muted-foreground">
                  Products in inventory
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{lowStockProducts.length}</div>
                <p className="text-xs text-muted-foreground">
                  Needs restocking
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{outOfStockProducts.length}</div>
                <p className="text-xs text-muted-foreground">
                  Urgent restocking
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatAmount(totalValue)}</div>
                <p className="text-xs text-muted-foreground">
                  Current inventory value
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search inventory..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <ToggleGroup
          type="single"
          value={stockFilter}
          onValueChange={(value) => setStockFilter(value as typeof stockFilter || "all")}
          className="flex gap-1"
        >
          <ToggleGroupItem value="all" variant="outline" size="sm">
            All
          </ToggleGroupItem>
          <ToggleGroupItem value="in_stock" variant="outline" size="sm">
            In Stock
          </ToggleGroupItem>
          <ToggleGroupItem value="out_of_stock" variant="outline" size="sm">
            Out of Stock
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Levels</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading || variantsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Min. Threshold</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No inventory items found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => {
                    const status = item.stock_quantity === 0 
                      ? "Out of Stock" 
                      : item.stock_quantity <= (item.low_stock_threshold || 0)
                        ? "Low Stock" 
                        : "In Stock";
                    
                    return (
                      <TableRow key={`${item.type}-${item.id}`}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          {item.variant_info ? (
                            <Badge variant="outline" className="text-xs">
                              {item.variant_info}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{item.sku || "-"}</TableCell>
                        <TableCell>{item.stock_quantity}</TableCell>
                        <TableCell>{item.low_stock_threshold || "-"}</TableCell>
                        <TableCell>{format(new Date(item.updated_at), "MMM dd, yyyy")}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              status === "In Stock" ? "default" : 
                              status === "Low Stock" ? "secondary" : 
                              "destructive"
                            }
                          >
                            {status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <StockAdjustmentDialog open={showAdjustmentDialog} onOpenChange={setShowAdjustmentDialog} />
    </div>
  );
};

export default Inventory;
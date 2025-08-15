import { useState, useMemo } from "react";
import { Plus, Archive, TrendingUp, TrendingDown, Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useProducts } from "@/hooks/useProducts";
import { useCurrency } from "@/hooks/useCurrency";
import { StockAdjustmentDialog } from "@/components/StockAdjustmentDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const Inventory = () => {
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "in_stock" | "out_of_stock">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
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
          products!inner(name, sku, image_url)
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
          variant_info: null,
          image_url: product.image_url
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
        variant_info: variantDisplay,
        image_url: variant.image_url || variant.products.image_url
      });
    });
    
    return items;
  }, [products, allVariants]);

  const filteredItems = inventoryItems.filter(item => {
    // Enhanced text search filter - search by name, stock quantity, or SKU
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.variant_info && item.variant_info.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.stock_quantity.toString().includes(searchTerm);
    
    // Stock filter
    const matchesStock = stockFilter === "all" || 
      (stockFilter === "in_stock" && item.stock_quantity > 0) ||
      (stockFilter === "out_of_stock" && item.stock_quantity === 0);
    
    return matchesSearch && matchesStock;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  // Check if there are any low stock items
  const hasLowStockItems = inventoryItems.some(item => 
    item.stock_quantity <= (item.low_stock_threshold || 0) && item.stock_quantity > 0
  );

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
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search by name, SKU, or stock quantity..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4">
          {hasLowStockItems && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Low Stock Alert
            </Badge>
          )}
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
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No inventory items found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedItems.map((item) => {
                      const status = item.stock_quantity === 0 
                        ? "Out of Stock" 
                        : item.stock_quantity <= (item.low_stock_threshold || 0)
                          ? "Low Stock" 
                          : "In Stock";
                      
                      return (
                        <TableRow key={`${item.type}-${item.id}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              {item.image_url ? (
                                <img 
                                  src={item.image_url} 
                                  alt={item.name}
                                  className="h-10 w-10 rounded-md object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                                  <Archive className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <span>{item.name}</span>
                            </div>
                          </TableCell>
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
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredItems.length)} of {filteredItems.length} items
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <StockAdjustmentDialog open={showAdjustmentDialog} onOpenChange={setShowAdjustmentDialog} />
    </div>
  );
};

export default Inventory;
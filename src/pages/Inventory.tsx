import { useState, useMemo, useEffect } from "react";
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
  const [imagePreview, setImagePreview] = useState<{ url: string; alt: string } | null>(null);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const itemsPerPage = 20;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
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

  // Create flattened inventory items with proper grouping
  const inventoryItems = useMemo(() => {
    const flattenedItems: any[] = [];
    
    // Add products without variants
    products.forEach(product => {
      if (!product.has_variants) {
        flattenedItems.push({
          id: product.id,
          type: 'product',
          name: product.name,
          sku: product.sku,
          stock_quantity: product.stock_quantity,
          low_stock_threshold: product.low_stock_threshold,
          image_url: product.image_url,
          isParent: true,
          parentId: null
        });
      }
    });
    
    // Group variants by product and add parent + children
    const variantsByProduct = new Map();
    allVariants.forEach(variant => {
      const productId = variant.product_id;
      if (!variantsByProduct.has(productId)) {
        variantsByProduct.set(productId, []);
      }
      variantsByProduct.get(productId).push(variant);
    });
    
    // Add products with variants (parent + variation rows)
    products.forEach(product => {
      if (product.has_variants) {
        const productVariants = variantsByProduct.get(product.id) || [];
        
        // Add parent product row
        flattenedItems.push({
          id: product.id,
          type: 'parent_product',
          name: product.name,
          sku: product.sku,
          stock_quantity: null, // Parent doesn't have stock
          low_stock_threshold: null,
          image_url: product.image_url,
          isParent: true,
          parentId: null
        });
        
        // Add variation rows
        productVariants.forEach(variant => {
          const variantDisplay = Object.entries(variant.attributes)
            .map(([key, value]) => value) // Remove key prefix, just show values
            .join(', ');
          
          flattenedItems.push({
            id: variant.id,
            type: 'variant',
            name: variantDisplay,
            sku: variant.sku || product.sku,
            stock_quantity: variant.stock_quantity,
            low_stock_threshold: variant.low_stock_threshold,
            image_url: null, // Variants don't show images
            isParent: false,
            parentId: product.id
          });
        });
      }
    });
    
    return flattenedItems;
  }, [products, allVariants]);

  // Filter to get only parent products for pagination counting
  const parentProducts = inventoryItems.filter(item => 
    item.type === "parent_product" || item.type === "product"
  );
  
  const filteredParentProducts = parentProducts.filter(item => {
    // Enhanced text search filter - search by name, SKU, or stock quantity
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = item.name?.toLowerCase().includes(searchLower) || false;
    const skuMatch = item.sku?.toLowerCase().includes(searchLower) || false;
    
    const matchesSearch = nameMatch || skuMatch;
    
    // Stock filter - for parent products, check if any child variants match the filter
    let matchesStock = false;
    if (stockFilter === "all") {
      matchesStock = true;
    } else if (item.type === "product") {
      // Single product without variants
      const stockQty = item.stock_quantity || 0;
      matchesStock = stockFilter === "in_stock" ? stockQty > 0 : stockQty === 0;
    } else {
      // Parent product - check if any variants match the stock filter
      const variants = inventoryItems.filter(variant => 
        variant.type === "variant" && variant.parentId === item.id
      );
      if (variants.length === 0) {
        matchesStock = true; // No variants, show parent
      } else {
        matchesStock = variants.some(variant => {
          const stockQty = variant.stock_quantity || 0;
          return stockFilter === "in_stock" ? stockQty > 0 : stockQty === 0;
        });
      }
    }
    
    return matchesSearch && matchesStock;
  });

  // Get all items (parents + their variants) for the current page of parent products
  const totalParentPages = Math.ceil(filteredParentProducts.length / itemsPerPage);
  const startParentIndex = (currentPage - 1) * itemsPerPage;
  const paginatedParentProducts = filteredParentProducts.slice(startParentIndex, startParentIndex + itemsPerPage);
  
  // Get all items to display (parents + their matching variants)
  const paginatedItems = [];
  paginatedParentProducts.forEach(parent => {
    paginatedItems.push(parent);
    if (parent.type === "parent_product") {
      // Add matching variants for this parent
      const variants = inventoryItems.filter(item => 
        item.type === "variant" && item.parentId === parent.id
      ).filter(variant => {
        // Apply search filter to variants
        const searchLower = searchTerm.toLowerCase();
        const nameMatch = variant.name?.toLowerCase().includes(searchLower) || false;
        const skuMatch = variant.sku?.toLowerCase().includes(searchLower) || false;
        const stockMatch = variant.stock_quantity?.toString().includes(searchTerm) || false;
        
        const matchesSearch = !searchTerm || nameMatch || skuMatch || stockMatch;
        
        // Apply stock filter to variants
        let matchesStock = false;
        if (stockFilter === "all") {
          matchesStock = true;
        } else {
          const stockQty = variant.stock_quantity || 0;
          matchesStock = stockFilter === "in_stock" ? stockQty > 0 : stockQty === 0;
        }
        
        return matchesSearch && matchesStock;
      });
      paginatedItems.push(...variants);
    }
  });

  // Check if there are any low stock items
  const hasLowStockItems = inventoryItems.some(item => {
    if (item.type === "variant" || item.type === "product") {
      return item.stock_quantity && item.stock_quantity <= (item.low_stock_threshold || 0) && item.stock_quantity > 0;
    }
    return false;
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

      <div className="flex items-center gap-4">
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
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Inventory Levels</CardTitle>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search by name, SKU, or stock quantity..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
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
                    <TableHead>Image</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Stock Status</TableHead>
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
                      if (item.type === "parent_product") {
                        // Parent product row (shows larger image and product name, empty other cells)
                        return (
                          <TableRow key={`parent-${item.id}`} className="border-b-2">
                            <TableCell className="py-4">
                              {item.image_url ? (
                                <div 
                                  className="relative cursor-pointer"
                                  onMouseEnter={(e) => {
                                    if (hoverTimeout) clearTimeout(hoverTimeout);
                                    const timeout = setTimeout(() => {
                                      setImagePreview({ url: item.image_url, alt: item.name });
                                    }, 200);
                                    setHoverTimeout(timeout);
                                  }}
                                  onMouseLeave={() => {
                                    if (hoverTimeout) clearTimeout(hoverTimeout);
                                    setImagePreview(null);
                                  }}
                                  onClick={() => setImagePreview({ url: item.image_url, alt: item.name })}
                                >
                                  <img 
                                    src={item.image_url} 
                                    alt={item.name}
                                    className="h-14 w-14 rounded-lg object-cover shadow-sm hover:shadow-md transition-shadow"
                                    loading="lazy"
                                  />
                                </div>
                              ) : (
                                <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center">
                                  <Archive className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold text-base py-4">{item.name}</TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        );
                      } else if (item.type === "variant") {
                        // Variant row (empty image cell, variant name, SKU, stock, status)
                        const status = item.stock_quantity === 0 
                          ? "Out of Stock" 
                          : item.stock_quantity <= (item.low_stock_threshold || 0)
                            ? "Low Stock" 
                            : "In Stock";
                        
                        return (
                          <TableRow key={`variant-${item.id}`} className="bg-muted/20">
                            <TableCell className="py-2">
                              <div className="h-14 w-14 flex items-center justify-center">
                                <div className="h-2 w-2 rounded-full bg-muted-foreground/30"></div>
                              </div>
                            </TableCell>
                            <TableCell className="pl-8 text-muted-foreground py-2 font-medium">{item.name}</TableCell>
                            <TableCell className="py-2 font-mono text-sm">{item.sku || "-"}</TableCell>
                            <TableCell className="py-2 font-semibold">{item.stock_quantity}</TableCell>
                            <TableCell className="py-2">
                              <Badge 
                                variant={
                                  status === "In Stock" ? "default" : 
                                  status === "Low Stock" ? "secondary" : 
                                  "destructive"
                                }
                                className="text-xs"
                              >
                                {status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      } else {
                        // Single product without variants
                        const status = item.stock_quantity === 0 
                          ? "Out of Stock" 
                          : item.stock_quantity <= (item.low_stock_threshold || 0)
                            ? "Low Stock" 
                            : "In Stock";
                        
                        return (
                          <TableRow key={`product-${item.id}`}>
                            <TableCell className="py-4">
                              {item.image_url ? (
                                <div 
                                  className="relative cursor-pointer"
                                  onMouseEnter={(e) => {
                                    if (hoverTimeout) clearTimeout(hoverTimeout);
                                    const timeout = setTimeout(() => {
                                      setImagePreview({ url: item.image_url, alt: item.name });
                                    }, 200);
                                    setHoverTimeout(timeout);
                                  }}
                                  onMouseLeave={() => {
                                    if (hoverTimeout) clearTimeout(hoverTimeout);
                                    setImagePreview(null);
                                  }}
                                  onClick={() => setImagePreview({ url: item.image_url, alt: item.name })}
                                >
                                  <img 
                                    src={item.image_url} 
                                    alt={item.name}
                                    className="h-14 w-14 rounded-lg object-cover shadow-sm hover:shadow-md transition-shadow"
                                    loading="lazy"
                                  />
                                </div>
                              ) : (
                                <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center">
                                  <Archive className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium text-base py-4">{item.name}</TableCell>
                            <TableCell className="py-4 font-mono text-sm">{item.sku || "-"}</TableCell>
                            <TableCell className="py-4 font-semibold">{item.stock_quantity}</TableCell>
                            <TableCell className="py-4">
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
                      }
                    })
                  )}
                </TableBody>
              </Table>
              {totalParentPages > 1 && (
                <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {startParentIndex + 1} to {Math.min(startParentIndex + itemsPerPage, filteredParentProducts.length)} of {filteredParentProducts.length} products
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-1 sm:justify-end">
                    <Pagination>
                      <PaginationContent className="flex-wrap gap-1">
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            className={`${currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} text-xs sm:text-sm`}
                            aria-label="Go to previous page"
                          />
                        </PaginationItem>
                        
                        {/* Dynamic page numbers for responsive design */}
                        {(() => {
                          const maxVisiblePages = isMobile ? 3 : 5;
                          let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                          let endPage = Math.min(totalParentPages, startPage + maxVisiblePages - 1);
                          
                          // Adjust start page if we're near the end
                          if (endPage - startPage + 1 < maxVisiblePages) {
                            startPage = Math.max(1, endPage - maxVisiblePages + 1);
                          }
                          
                          const pages = [];
                          
                          // Show first page if not in range (desktop only)
                          if (startPage > 1 && !isMobile) {
                            pages.push(
                              <PaginationItem key={1}>
                                <PaginationLink
                                  onClick={() => setCurrentPage(1)}
                                  className="cursor-pointer text-xs sm:text-sm"
                                  aria-label="Go to page 1"
                                >
                                  1
                                </PaginationLink>
                              </PaginationItem>
                            );
                            if (startPage > 2) {
                              pages.push(
                                <PaginationItem key="start-ellipsis">
                                  <span className="px-2 py-1 text-xs sm:px-3 sm:py-2 sm:text-sm">...</span>
                                </PaginationItem>
                              );
                            }
                          }
                          
                          // Show visible page range
                          for (let page = startPage; page <= endPage; page++) {
                            pages.push(
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => setCurrentPage(page)}
                                  isActive={currentPage === page}
                                  className="cursor-pointer text-xs sm:text-sm"
                                  aria-label={`Go to page ${page}`}
                                  aria-current={currentPage === page ? "page" : undefined}
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          }
                          
                          // Show last page if not in range (desktop only)
                          if (endPage < totalParentPages && !isMobile) {
                            if (endPage < totalParentPages - 1) {
                              pages.push(
                                <PaginationItem key="end-ellipsis">
                                  <span className="px-2 py-1 text-xs sm:px-3 sm:py-2 sm:text-sm">...</span>
                                </PaginationItem>
                              );
                            }
                            pages.push(
                              <PaginationItem key={totalParentPages}>
                                <PaginationLink
                                  onClick={() => setCurrentPage(totalParentPages)}
                                  className="cursor-pointer text-xs sm:text-sm"
                                  aria-label={`Go to page ${totalParentPages}`}
                                >
                                  {totalParentPages}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          }
                          
                          return pages;
                        })()}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalParentPages))}
                            className={`${currentPage === totalParentPages ? "pointer-events-none opacity-50" : "cursor-pointer"} text-xs sm:text-sm`}
                            aria-label="Go to next page"
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                  
                  {/* Mobile page indicator */}
                  <div className="sm:hidden text-center text-xs text-muted-foreground">
                    Page {currentPage} of {totalParentPages}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <StockAdjustmentDialog open={showAdjustmentDialog} onOpenChange={setShowAdjustmentDialog} />
      
      {/* Image Preview Modal */}
      {imagePreview && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setImagePreview(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <div 
            className="relative max-w-2xl max-h-[90vh] bg-background rounded-lg overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setImagePreview(null)}
              className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background text-foreground rounded-full p-2 transition-colors"
              aria-label="Close preview"
            >
              ×
            </button>
            <img 
              src={imagePreview.url} 
              alt={imagePreview.alt}
              className="w-full h-full object-contain"
              style={{ aspectRatio: 'auto' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
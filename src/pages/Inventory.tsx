import { useState, useMemo, useCallback, useEffect } from "react";
import { Plus, Archive, TrendingUp, TrendingDown, Search, AlertTriangle, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProducts } from "@/hooks/useProducts";
import { useCurrency } from "@/hooks/useCurrency";
import { StockAdjustmentDialog } from "@/components/StockAdjustmentDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Fuse from "fuse.js";

interface Product {
  id: string;
  name: string;
  sku: string;
  rate: number;
  cost: number;
  stock_quantity: number;
  low_stock_threshold: number;
  image_url: string;
  has_variants: boolean;
  woocommerce_id?: number;
  woocommerce_connection_id?: string;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  rate: number;
  cost: number;
  stock_quantity: number;
  low_stock_threshold: number;
  image_url: string;
  attributes: any; // Use 'any' to handle JSON type from Supabase
  woocommerce_id?: number;
  woocommerce_connection_id?: string;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

interface InventoryItem {
  id: string;
  type: 'product' | 'variant';
  productId?: string;
  productName: string;
  variantName?: string;
  sku: string;
  rate: number;
  cost: number;
  stock_quantity: number;
  low_stock_threshold: number;
  image_url: string;
  attributes?: Record<string, any>;
  has_variants?: boolean;
  woocommerce_id?: number;
}

const Inventory = () => {
  console.log("Inventory component loaded successfully - cache refreshed");
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "in_stock" | "out_of_stock">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const itemsPerPage = 25;
  
  const { products, isLoading: productsLoading } = useProducts();
  const { formatAmount } = useCurrency();
  const { user } = useAuth();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch all product variants with comprehensive data
  const { data: allVariants = [], isLoading: variantsLoading } = useQuery({
    queryKey: ["inventory_variants", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .order("created_at", { ascending: true });
      
      if (error) {
        console.error("Error fetching variants:", error);
        throw error;
      }
      
      console.log(`Fetched ${data?.length || 0} variants`);
      return data || [];
    },
    enabled: !!user,
    staleTime: 0,
    gcTime: 0,
  });

  // Create comprehensive inventory items list
  const inventoryItems = useMemo(() => {
    const items: InventoryItem[] = [];
    
    console.log(`Processing ${products.length} products and ${allVariants.length} variants`);

    // Group variants by product for easier processing
    const variantsByProduct = new Map<string, ProductVariant[]>();
    allVariants.forEach(variant => {
      const productId = variant.product_id;
      if (!variantsByProduct.has(productId)) {
        variantsByProduct.set(productId, []);
      }
      variantsByProduct.get(productId)!.push(variant);
    });

    products.forEach(product => {
      if (product.has_variants) {
        // For products with variants, show each variant as a separate row
        const productVariants = variantsByProduct.get(product.id) || [];
        
        if (productVariants.length > 0) {
          productVariants.forEach(variant => {
            // Create variant display name from attributes
            let variantName = 'Variant';
            
            if (variant.attributes && typeof variant.attributes === 'object' && Object.keys(variant.attributes).length > 0) {
              // Show only attribute values, cleanly formatted
              const attributeValues = Object.values(variant.attributes)
                .filter(value => value && value !== '' && value !== null && value !== undefined)
                .map(value => String(value).trim())
                .filter(value => value.length > 0);
              
              if (attributeValues.length > 0) {
                variantName = attributeValues.join(', ');
              } else {
                variantName = variant.sku ? `SKU: ${variant.sku}` : `Variant #${variant.id.slice(-8)}`;
              }
            } else {
              variantName = variant.sku ? `SKU: ${variant.sku}` : `Variant #${variant.id.slice(-8)}`;
            }

            items.push({
              id: variant.id,
              type: 'variant',
              productId: product.id,
              productName: product.name,
              variantName,
              sku: variant.sku || product.sku,
              rate: variant.rate || 0,
              cost: variant.cost || 0,
              stock_quantity: variant.stock_quantity,
              low_stock_threshold: variant.low_stock_threshold || product.low_stock_threshold,
              image_url: variant.image_url || product.image_url,
              attributes: variant.attributes,
              woocommerce_id: variant.woocommerce_id
            });
          });
        } else {
          // Product marked as having variants but no variants found - treat as regular product
          console.log(`Product "${product.name}" has has_variants=true but no variants found`);
          items.push({
            id: product.id,
            type: 'product',
            productName: product.name,
            sku: product.sku,
            rate: product.rate,
            cost: product.cost || 0,
            stock_quantity: product.stock_quantity,
            low_stock_threshold: product.low_stock_threshold,
            image_url: product.image_url,
            has_variants: false, // Don't show "Has Variants" badge for products without actual variants
            woocommerce_id: (product as any).woocommerce_id
          });
        }
      } else {
        // Regular product without variants
        items.push({
          id: product.id,
          type: 'product',
          productName: product.name,
          sku: product.sku,
          rate: product.rate,
          cost: product.cost || 0,
          stock_quantity: product.stock_quantity,
          low_stock_threshold: product.low_stock_threshold,
          image_url: product.image_url,
          has_variants: false,
          woocommerce_id: (product as any).woocommerce_id
        });
      }
    });

    console.log(`Created ${items.length} inventory items`);
    return items;
  }, [products, allVariants]);

  // Fuzzy search using Fuse.js
  const fuse = useMemo(() => {
    const searchData = inventoryItems.map(item => ({
      ...item,
      searchText: `${item.productName} ${item.variantName || ''} ${item.sku || ''} ${item.woocommerce_id || ''}`.toLowerCase()
    }));

    return new Fuse(searchData, {
      keys: ['searchText', 'productName', 'variantName', 'sku'],
      threshold: 0.4,
      includeScore: true,
      minMatchCharLength: 1
    });
  }, [inventoryItems]);

  // Filter and search logic
  const filteredItems = useMemo(() => {
    let filtered = inventoryItems;
    
    // Apply search logic
    if (debouncedSearchTerm.trim()) {
      const searchResults = fuse.search(debouncedSearchTerm.trim());
      const matchedIds = new Set(searchResults.map(result => result.item.id));
      filtered = inventoryItems.filter(item => matchedIds.has(item.id));
    }
    
    // Apply stock filter
    if (stockFilter !== "all") {
      filtered = filtered.filter(item => {
        const stockQty = item.stock_quantity || 0;
        return stockFilter === "in_stock" ? stockQty > 0 : stockQty === 0;
      });
    }
    
    return filtered;
  }, [inventoryItems, debouncedSearchTerm, stockFilter, fuse]);

  // Pagination calculations
  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  // Handle image hover with delay
  const handleImageHover = useCallback((imageUrl: string) => {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
    }
    
    const timer = setTimeout(() => {
      setPreviewImage(imageUrl);
    }, 200);
    
    setHoverTimer(timer);
    setHoveredImage(imageUrl);
  }, [hoverTimer]);

  const handleImageLeave = useCallback(() => {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      setHoverTimer(null);
    }
    setHoveredImage(null);
    setPreviewImage(null);
  }, [hoverTimer]);

  const handleImageClick = useCallback((imageUrl: string) => {
    setSelectedImage(imageUrl);
  }, []);

  // Handle escape key for modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedImage(null);
      }
    };

    if (selectedImage) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [selectedImage]);

  // Calculate summary statistics
  const totalProducts = products.length;
  const lowStockItems = inventoryItems.filter(item => 
    item.stock_quantity <= item.low_stock_threshold
  );
  const outOfStockItems = inventoryItems.filter(item => 
    item.stock_quantity === 0
  );
  const totalValue = inventoryItems.reduce((sum, item) => 
    sum + (item.stock_quantity * (item.cost || item.rate)), 0
  );

  const getStockStatus = (item: InventoryItem) => {
    if (item.stock_quantity === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (item.stock_quantity <= item.low_stock_threshold) {
      return <Badge variant="secondary">Low Stock</Badge>;
    } else {
      return <Badge variant="default">In Stock</Badge>;
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-muted-foreground">
            Complete inventory tracking with products and variants
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
        {productsLoading || variantsLoading ? (
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
                  {inventoryItems.length} inventory items
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{lowStockItems.length}</div>
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
                <div className="text-2xl font-bold text-destructive">{outOfStockItems.length}</div>
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
            All ({inventoryItems.length})
          </ToggleGroupItem>
          <ToggleGroupItem value="in_stock" variant="outline" size="sm">
            In Stock ({inventoryItems.length - outOfStockItems.length})
          </ToggleGroupItem>
          <ToggleGroupItem value="out_of_stock" variant="outline" size="sm">
            Out of Stock ({outOfStockItems.length})
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Inventory Levels</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {filteredItems.length} items
              </Badge>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search products, variants, SKU..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {productsLoading || variantsLoading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Image</TableHead>
                    <TableHead>Product / Variant</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No inventory items found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedItems.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/50">
                        <TableCell>
                          {item.image_url ? (
                            <div className="relative">
                              <img 
                                src={item.image_url} 
                                alt={item.productName}
                                className="h-16 w-16 rounded-md object-cover cursor-pointer hover:shadow-lg transition-shadow"
                                onMouseEnter={() => handleImageHover(item.image_url)}
                                onMouseLeave={handleImageLeave}
                                onClick={() => handleImageClick(item.image_url)}
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center">
                              <Archive className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{item.productName}</div>
                            {item.type === 'variant' && item.variantName && (
                              <div className="text-sm text-muted-foreground">
                                {item.variantName}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatAmount(item.rate)}
                        </TableCell>
                        <TableCell>
                          {getStockStatus(item)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                        if (pageNum > totalPages) return null;
                        
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => setCurrentPage(pageNum)}
                              isActive={currentPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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

      {/* Image Preview Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Product Image</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="flex justify-center">
              <img 
                src={selectedImage} 
                alt="Product" 
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hover Preview */}
      {previewImage && hoveredImage && (
        <div 
          className="fixed z-50 pointer-events-none border border-border bg-background p-2 rounded-lg shadow-lg"
          style={{
            left: '50%',
            top: '20%',
            transform: 'translateX(-50%)',
          }}
        >
          <img 
            src={previewImage} 
            alt="Preview" 
            className="w-48 h-48 object-cover rounded"
          />
        </div>
      )}

      <StockAdjustmentDialog 
        open={showAdjustmentDialog} 
        onOpenChange={setShowAdjustmentDialog} 
      />
    </div>
  );
};

export default Inventory;
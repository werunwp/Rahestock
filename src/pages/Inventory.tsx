import { useState, useMemo, useCallback, useEffect } from "react";
import { Plus, Archive, TrendingUp, TrendingDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProducts } from "@/hooks/useProducts";
import { useCurrency } from "@/hooks/useCurrency";
import { StockAdjustmentDialog } from "@/components/StockAdjustmentDialog";
import { InventoryProductCard } from "@/components/inventory/InventoryProductCard";
import { InventoryFilters } from "@/components/inventory/InventoryFilters";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Fuse from "fuse.js";

const Inventory = () => {
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "in_stock" | "out_of_stock">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const itemsPerPage = 12;
  
  const { products, isLoading } = useProducts();
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

  // Fetch all product variants with better error handling and debugging
  const { data: allVariants = [], isLoading: variantsLoading } = useQuery({
    queryKey: ["all_product_variants"],
    queryFn: async () => {
      console.log("Fetching product variants...");
      const { data, error } = await supabase
        .from("product_variants")
        .select(`
          *,
          products (
            id,
            name,
            sku,
            image_url
          )
        `)
        .order("created_at", { ascending: true });
      
      if (error) {
        console.error("Error fetching variants:", error);
        throw error;
      }
      
      console.log("Fetched variants:", data);
      return data || [];
    },
    enabled: !!user,
  });

  // Create parent products list with better debugging
  const parentProducts = useMemo(() => {
    console.log("Creating parent products list...");
    console.log("Products:", products);
    console.log("All variants:", allVariants);
    
    const parents: any[] = [];
    
    if (!products || !Array.isArray(products)) {
      console.log("No products or products is not an array");
      return [];
    }
    
    // Add products without variants
    const productsWithoutVariants = products.filter(product => !product.has_variants);
    console.log("Products without variants:", productsWithoutVariants);
    
    productsWithoutVariants.forEach(product => {
      parents.push({
        id: product.id,
        type: 'product',
        name: product.name,
        sku: product.sku,
        stock_quantity: product.stock_quantity,
        low_stock_threshold: product.low_stock_threshold,
        image_url: product.image_url,
        variants: []
      });
    });
    
    // Group variants by product and add products with variants
    const productsWithVariants = products.filter(product => product.has_variants);
    console.log("Products with variants:", productsWithVariants);
    
    const variantsByProduct = new Map();
    console.log("AllVariants received:", allVariants);
    console.log("AllVariants length:", allVariants?.length || 0);
    
    if (allVariants && Array.isArray(allVariants)) {
      allVariants.forEach(variant => {
        const productId = variant.product_id;
        if (!variantsByProduct.has(productId)) {
          variantsByProduct.set(productId, []);
        }
        variantsByProduct.get(productId).push(variant);
      });
    }
    
    console.log("Variants grouped by product:", variantsByProduct);
    console.log("Number of products with variants:", variantsByProduct.size);
    
    productsWithVariants.forEach(product => {
      const productVariants = variantsByProduct.get(product.id) || [];
      console.log(`Product ${product.name} (${product.id}) has ${productVariants.length} variants in Map`);
      console.log(`Product variants for ${product.name}:`, productVariants);
      
      // Process variants to show all attributes dynamically
      const processedVariants = productVariants.map(variant => {
        // Create display name from all attributes
        const attributeEntries = Object.entries(variant.attributes || {});
        const displayName = attributeEntries.length > 0 
          ? attributeEntries.map(([key, value]) => {
              // Clean up the key by removing "Select " prefix and ":" suffix
              const cleanKey = key.replace(/^Select\s+/, '').replace(/:$/, '');
              return `${cleanKey}: ${value}`;
            }).join(', ')
          : 'Default Variant';
        
        return {
          id: variant.id,
          name: displayName,
          sku: variant.sku || product.sku,
          stock_quantity: variant.stock_quantity,
          low_stock_threshold: variant.low_stock_threshold,
          attributes: variant.attributes || {}
        };
      });
      
      console.log(`Processed variants for ${product.name}:`, processedVariants);
      
      parents.push({
        id: product.id,
        type: processedVariants.length > 0 ? 'parent' : 'product',
        name: product.name,
        sku: product.sku,
        stock_quantity: processedVariants.length > 0 ? null : product.stock_quantity,
        low_stock_threshold: processedVariants.length > 0 ? null : product.low_stock_threshold,
        image_url: product.image_url,
        variants: processedVariants
      });
    });
    
    console.log("Final parent products:", parents);
    return parents;
  }, [products, allVariants]);

  // Normalize text for exact matching
  const normalizeText = useCallback((text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[\/,\-\(\)\.]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  // Fuzzy search using Fuse.js
  const fuse = useMemo(() => {
    const searchData: any[] = [];
    
    parentProducts.forEach(parent => {
      // Add the main product to search data
      searchData.push({
        ...parent,
        parentId: parent.id,
        parentName: parent.name,
        parentImageUrl: parent.image_url,
        searchType: 'parent',
        searchText: `${parent.name} ${parent.sku || ''}`.toLowerCase()
      });

      // Add each variant to search data if the product has variants
      if (parent.type === 'parent' && parent.variants && parent.variants.length > 0) {
        parent.variants.forEach((variant: any) => {
          const variantName = Object.entries(variant.attributes || {})
            .map(([key, value]) => `${key}: ${value}`)
            .join(' ');
          
          searchData.push({
            ...variant,
            parentId: parent.id,
            parentName: parent.name,
            parentImageUrl: parent.image_url,
            searchType: 'variant',
            searchText: `${parent.name} ${variantName} ${variant.sku || ''}`.toLowerCase()
          });
        });
      }
    });

    return new Fuse(searchData, {
      keys: ['searchText', 'name', 'sku'],
      threshold: 0.4,
      includeScore: true,
      minMatchCharLength: 1
    });
  }, [parentProducts, normalizeText]);

  // Filter and search logic
  const { filteredParentProducts, hasExactMatch } = useMemo(() => {
    let filtered = parentProducts;
    let isExactMatch = false;
    
    // Apply search logic
    if (debouncedSearchTerm.trim()) {
      const normalizedQuery = normalizeText(debouncedSearchTerm.trim());
      
      // First, check for exact title matches
      const exactMatches = parentProducts.filter(parent => {
        const normalizedTitle = normalizeText(parent.name);
        return normalizedTitle === normalizedQuery;
      });
      
      if (exactMatches.length > 0) {
        filtered = exactMatches;
        isExactMatch = true;
      } else {
        // No exact match - fall back to fuzzy search
        const searchResults = fuse.search(debouncedSearchTerm.trim());
        const matchedParentIds = new Set();
        
        searchResults.forEach(result => {
          if (result.item.searchType === 'parent') {
            matchedParentIds.add(result.item.id);
          } else if (result.item.searchType === 'variant') {
            matchedParentIds.add(result.item.parentId);
          }
        });
        
        filtered = parentProducts.filter(parent => matchedParentIds.has(parent.id));
      }
    }
    
    // Apply stock filter
    if (stockFilter !== "all") {
      filtered = filtered.filter(parent => {
        if (parent.type === 'product') {
          const stockQty = parent.stock_quantity || 0;
          return stockFilter === "in_stock" ? stockQty > 0 : stockQty === 0;
        } else if (parent.type === 'parent') {
          return parent.variants.some((variant: any) => {
            const stockQty = variant.stock_quantity || 0;
            return stockFilter === "in_stock" ? stockQty > 0 : stockQty === 0;
          });
        }
        return false;
      });
    }
    
    return { filteredParentProducts: filtered, hasExactMatch: isExactMatch };
  }, [parentProducts, debouncedSearchTerm, stockFilter, fuse, normalizeText]);

  // Pagination calculations
  const totalParentProducts = filteredParentProducts.length;
  const totalPages = Math.ceil(totalParentProducts / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedParentProducts = filteredParentProducts.slice(startIndex, startIndex + itemsPerPage);

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

  // Calculate stats
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

      {/* Stats Cards */}
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
                <p className="text-xs text-muted-foreground">Products in inventory</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{lowStockProducts.length}</div>
                <p className="text-xs text-muted-foreground">Needs restocking</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{outOfStockProducts.length}</div>
                <p className="text-xs text-muted-foreground">Urgent restocking</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatAmount(totalValue)}</div>
                <p className="text-xs text-muted-foreground">Current inventory value</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filters */}
      <InventoryFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        stockFilter={stockFilter}
        onStockFilterChange={setStockFilter}
        hasExactMatch={hasExactMatch}
        debouncedSearchTerm={debouncedSearchTerm}
      />

      {/* Product Cards */}
      <div className="space-y-6">
        {isLoading || variantsLoading ? (
          <div className="grid gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Skeleton className="w-16 h-16 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : paginatedParentProducts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">No inventory items found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {paginatedParentProducts.map((product) => (
              <InventoryProductCard
                key={product.id}
                product={product}
                onImageClick={handleImageClick}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalParentProducts)} of {totalParentProducts} items
              </p>
            </div>
            <div className="flex-1 flex justify-center sm:justify-end">
              <Pagination className="mx-0">
                <PaginationContent className="flex-wrap gap-1">
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className={`${currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} hidden sm:flex`}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="sm:hidden"
                    >
                      Prev
                    </Button>
                  </PaginationItem>
                  
                  <div className="sm:hidden flex items-center px-3 py-2 text-sm">
                    Page {currentPage} of {totalPages}
                  </div>
                  
                  <div className="hidden sm:flex items-center gap-1">
                    {(() => {
                      const maxVisiblePages = 5;
                      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                      
                      if (endPage - startPage + 1 < maxVisiblePages) {
                        startPage = Math.max(1, endPage - maxVisiblePages + 1);
                      }
                      
                      const pages = [];
                      
                      if (startPage > 1) {
                        pages.push(
                          <PaginationItem key={1}>
                            <PaginationLink
                              onClick={() => setCurrentPage(1)}
                              className="cursor-pointer"
                            >
                              1
                            </PaginationLink>
                          </PaginationItem>
                        );
                        if (startPage > 2) {
                          pages.push(
                            <PaginationItem key="start-ellipsis">
                              <span className="px-3 py-2 text-muted-foreground">...</span>
                            </PaginationItem>
                          );
                        }
                      }
                      
                      for (let page = startPage; page <= endPage; page++) {
                        pages.push(
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }
                      
                      if (endPage < totalPages) {
                        if (endPage < totalPages - 1) {
                          pages.push(
                            <PaginationItem key="end-ellipsis">
                              <span className="px-3 py-2 text-muted-foreground">...</span>
                            </PaginationItem>
                          );
                        }
                        pages.push(
                          <PaginationItem key={totalPages}>
                            <PaginationLink
                              onClick={() => setCurrentPage(totalPages)}
                              className="cursor-pointer"
                            >
                              {totalPages}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }
                      
                      return pages;
                    })()}
                  </div>
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className={`${currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} hidden sm:flex`}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="sm:hidden"
                    >
                      Next
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}
      </div>

      {/* Debug Information - Remove this after fixing */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-sm text-yellow-800">Debug Info</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-yellow-700">
            <p>Total products: {products?.length || 0}</p>
            <p>Products with variants: {products?.filter(p => p.has_variants).length || 0}</p>
            <p>Total variants: {allVariants?.length || 0}</p>
            <p>Parent products created: {parentProducts?.length || 0}</p>
          </CardContent>
        </Card>
      )}

      <StockAdjustmentDialog open={showAdjustmentDialog} onOpenChange={setShowAdjustmentDialog} />
      
      {/* Image Preview Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center justify-between">
              Product Image Preview
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedImage(null)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-6 pt-0">
            {selectedImage && (
              <img 
                src={selectedImage}
                alt="Product preview"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;

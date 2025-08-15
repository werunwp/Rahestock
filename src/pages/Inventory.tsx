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
  const itemsPerPage = 20;
  
  const { products, isLoading } = useProducts();
  const { formatAmount } = useCurrency();
  const { user } = useAuth();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page on search
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch all product variants for inventory display
  const { data: allVariants = [], isLoading: variantsLoading } = useQuery({
    queryKey: ["inventory_product_variants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Create parent products list for search and pagination
  const parentProducts = useMemo(() => {
    const parents: any[] = [];
    
    // Add products without variants
    products.forEach(product => {
      if (!product.has_variants) {
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
      }
    });
    
    // Group variants by product and add products with variants
    const variantsByProduct = new Map();
    allVariants.forEach(variant => {
      const productId = variant.product_id;
      if (!variantsByProduct.has(productId)) {
        variantsByProduct.set(productId, []);
      }
      variantsByProduct.get(productId).push(variant);
    });
    
    products.forEach(product => {
      if (product.has_variants) {
        const productVariants = variantsByProduct.get(product.id) || [];
        
        parents.push({
          id: product.id,
          type: 'parent_product',
          name: product.name,
          sku: product.sku,
          stock_quantity: null,
          low_stock_threshold: null,
          image_url: product.image_url,
          variants: productVariants.map(variant => {
            // Create a meaningful variant name from attributes or fall back to SKU/ID
            let variantName = 'Variant';
            
            if (variant.attributes && typeof variant.attributes === 'object' && Object.keys(variant.attributes).length > 0) {
              // Show attribute name: value pairs for better readability
              variantName = Object.entries(variant.attributes)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
            } else if (variant.sku) {
              variantName = `SKU: ${variant.sku}`;
            } else {
              variantName = `Variant #${variant.id.slice(-8)}`;
            }
            
            return {
              id: variant.id,
              name: variantName,
              sku: variant.sku || product.sku,
              stock_quantity: variant.stock_quantity,
              low_stock_threshold: variant.low_stock_threshold,
              attributes: variant.attributes,
              image_url: variant.image_url
            };
          })
        });
      }
    });
    
    return parents;
  }, [products, allVariants]);

  // Normalize text for exact matching
  const normalizeText = useCallback((text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Collapse multiple spaces to one
      .replace(/[\/,\-\(\)\.]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Clean up spaces again after punctuation removal
      .trim();
  }, []);

  // Fuzzy search using Fuse.js
  const fuse = useMemo(() => {
    const searchData: any[] = [];
    
    parentProducts.forEach(parent => {
      // Add parent product for search
      searchData.push({
        ...parent,
        searchType: 'parent',
        normalizedTitle: normalizeText(parent.name),
        searchText: `${parent.name} ${parent.sku || ''}`.toLowerCase()
      });
      
      // Add variants for search
      parent.variants.forEach((variant: any) => {
        searchData.push({
          ...variant,
          parentId: parent.id,
          parentName: parent.name,
          parentImageUrl: parent.image_url,
          searchType: 'variant',
          searchText: `${parent.name} ${variant.name} ${variant.sku || ''}`.toLowerCase()
        });
      });
    });

    return new Fuse(searchData, {
      keys: ['searchText', 'name', 'sku'],
      threshold: 0.4, // More tolerant for typos
      includeScore: true,
      minMatchCharLength: 1
    });
  }, [parentProducts, normalizeText]);

  // Filter and search logic with exact matching priority
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
        // Exact match found - return only exact matches
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
        } else {
          // For parent products with variants, check if any variant matches the filter
          return parent.variants.some((variant: any) => {
            const stockQty = variant.stock_quantity || 0;
            return stockFilter === "in_stock" ? stockQty > 0 : stockQty === 0;
          });
        }
      });
    }
    
    return { filteredParentProducts: filtered, hasExactMatch: isExactMatch };
  }, [parentProducts, debouncedSearchTerm, stockFilter, fuse, normalizeText]);

  // Pagination calculations (based on parent products only)
  const totalParentProducts = filteredParentProducts.length;
  const totalPages = Math.ceil(totalParentProducts / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedParentProducts = filteredParentProducts.slice(startIndex, startIndex + itemsPerPage);

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
            <div className="flex items-center gap-2">
              <CardTitle>Inventory Levels</CardTitle>
              {hasExactMatch && debouncedSearchTerm.trim() && (
                <Badge variant="secondary" className="text-xs">
                  Exact match
                </Badge>
              )}
            </div>
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
                  {paginatedParentProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No inventory items found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedParentProducts.map((parent) => [
                      // Parent product row
                      <TableRow key={`parent-${parent.id}`} className="bg-background">
                        <TableCell>
                          {parent.image_url ? (
                            <div className="relative">
                              <img 
                                src={parent.image_url} 
                                alt={parent.name}
                                className="h-14 w-14 rounded-md object-cover cursor-pointer hover:shadow-lg transition-shadow"
                                onMouseEnter={() => handleImageHover(parent.image_url)}
                                onMouseLeave={handleImageLeave}
                                onClick={() => handleImageClick(parent.image_url)}
                                loading="lazy"
                              />
                              {/* Hover preview */}
                              {previewImage === parent.image_url && (
                                <div className="fixed z-50 pointer-events-none">
                                  <div 
                                    className="absolute bg-background border rounded-lg shadow-xl p-2"
                                    style={{
                                      left: '50%',
                                      top: '50%',
                                      transform: 'translate(-50%, -50%)',
                                      maxWidth: '300px',
                                      maxHeight: '300px'
                                    }}
                                  >
                                    <img 
                                      src={parent.image_url}
                                      alt={parent.name}
                                      className="max-w-full max-h-full object-contain rounded"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="h-14 w-14 rounded-md bg-muted flex items-center justify-center">
                              <Archive className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">{parent.name}</TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                      </TableRow>,
                      // Variant rows for this parent
                      ...parent.variants.map((variant: any) => {
                        const status = variant.stock_quantity <= 0 
                          ? "Stock Out" 
                          : variant.stock_quantity <= (variant.low_stock_threshold || 0)
                            ? "Low Stock" 
                            : "In Stock";
                        
                        return (
                           <TableRow key={`variant-${variant.id}`} className="bg-muted/20 border-l-4 border-l-muted">
                             <TableCell>
                               {variant.image_url ? (
                                 <div className="relative">
                                   <img 
                                     src={variant.image_url} 
                                     alt={variant.name}
                                     className="h-12 w-12 rounded-md object-cover cursor-pointer hover:shadow-lg transition-shadow"
                                     onMouseEnter={() => handleImageHover(variant.image_url)}
                                     onMouseLeave={handleImageLeave}
                                     onClick={() => handleImageClick(variant.image_url)}
                                     loading="lazy"
                                   />
                                   {/* Hover preview for variant images */}
                                   {previewImage === variant.image_url && (
                                     <div className="fixed z-50 pointer-events-none">
                                       <div 
                                         className="absolute bg-background border rounded-lg shadow-xl p-2"
                                         style={{
                                           left: '50%',
                                           top: '50%',
                                           transform: 'translate(-50%, -50%)',
                                           maxWidth: '300px',
                                           maxHeight: '300px'
                                         }}
                                       >
                                         <img 
                                           src={variant.image_url}
                                           alt={variant.name}
                                           className="max-w-full max-h-full object-contain rounded"
                                         />
                                       </div>
                                     </div>
                                   )}
                                 </div>
                               ) : (
                                 <div className="h-12 w-12 flex items-center justify-center">
                                   <div className="w-2 h-2 rounded-full bg-muted-foreground/30"></div>
                                 </div>
                               )}
                             </TableCell>
                            <TableCell className="pl-6 text-gray-800 dark:text-gray-200 font-medium">
                              {variant.name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{variant.sku || "-"}</TableCell>
                            <TableCell className="text-foreground font-medium">{variant.stock_quantity}</TableCell>
                            <TableCell>
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
                      }),
                      // Single product without variants (show stock data in parent row)
                      ...(parent.type === 'product' ? [
                        <TableRow key={`product-stock-${parent.id}`} className="bg-muted/10 border-l-4 border-l-muted">
                          <TableCell>
                            <div className="h-14 w-14 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-muted-foreground/30"></div>
                            </div>
                          </TableCell>
                          <TableCell className="pl-6 text-gray-800 dark:text-gray-200 font-medium">
                            Stock Details
                          </TableCell>
                          <TableCell className="text-muted-foreground">{parent.sku || "-"}</TableCell>
                          <TableCell className="text-foreground font-medium">{parent.stock_quantity}</TableCell>
                          <TableCell>
                            <Badge 
                               variant={
                                parent.stock_quantity <= 0 ? "destructive" :
                                parent.stock_quantity <= (parent.low_stock_threshold || 0) ? "secondary" :
                                "default"
                              }
                              className="text-xs"
                            >
                              {parent.stock_quantity <= 0 ? "Stock Out" :
                               parent.stock_quantity <= (parent.low_stock_threshold || 0) ? "Low Stock" :
                               "In Stock"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ] : [])
                    ]).flat()
                  )}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4">
                  <div className="flex items-center" role="status" aria-live="polite">
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
                            aria-label="Go to previous page"
                          />
                          {/* Mobile previous */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="sm:hidden"
                            aria-label="Previous page"
                          >
                            Prev
                          </Button>
                        </PaginationItem>
                        
                        {/* Mobile page indicator */}
                        <div className="sm:hidden flex items-center px-3 py-2 text-sm">
                          Page {currentPage} of {totalPages}
                        </div>
                        
                        {/* Desktop page numbers */}
                        <div className="hidden sm:flex items-center gap-1">
                          {(() => {
                            const maxVisiblePages = 5;
                            let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                            
                            // Adjust start page if we're near the end
                            if (endPage - startPage + 1 < maxVisiblePages) {
                              startPage = Math.max(1, endPage - maxVisiblePages + 1);
                            }
                            
                            const pages = [];
                            
                            // Show first page if not in range
                            if (startPage > 1) {
                              pages.push(
                                <PaginationItem key={1}>
                                  <PaginationLink
                                    onClick={() => setCurrentPage(1)}
                                    className="cursor-pointer"
                                    aria-label="Go to page 1"
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
                            
                            // Show visible page range
                            for (let page = startPage; page <= endPage; page++) {
                              pages.push(
                                <PaginationItem key={page}>
                                  <PaginationLink
                                    onClick={() => setCurrentPage(page)}
                                    isActive={currentPage === page}
                                    className="cursor-pointer"
                                    aria-label={`Go to page ${page}`}
                                    aria-current={currentPage === page ? "page" : undefined}
                                  >
                                    {page}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            }
                            
                            // Show last page if not in range
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
                                    aria-label={`Go to page ${totalPages}`}
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
                            aria-label="Go to next page"
                          />
                          {/* Mobile next */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="sm:hidden"
                            aria-label="Next page"
                          >
                            Next
                          </Button>
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <StockAdjustmentDialog open={showAdjustmentDialog} onOpenChange={setShowAdjustmentDialog} />
      
      {/* Image Preview Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0" aria-modal="true">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center justify-between">
              Product Image Preview
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedImage(null)}
                className="h-6 w-6 p-0"
                aria-label="Close preview"
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
                style={{ aspectRatio: 'auto' }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
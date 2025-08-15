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

  // Create parent products list for search and pagination
  const parentProducts = useMemo(() => {
    const parents: any[] = [];
    
    console.log("=== INVENTORY DEBUG ===");
    console.log("Raw products from hook:", products?.length || 0);
    console.log("All variants from query:", allVariants?.length || 0);
    
    if (!products || !Array.isArray(products)) {
      console.log("No products available");
      return [];
    }
    
    // Add products without variants
    const productsWithoutVariants = products.filter(product => !product.has_variants);
    console.log("Products without variants:", productsWithoutVariants.length);
    
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
    console.log("Products with variants:", productsWithVariants.length);
    
    const variantsByProduct = new Map();
    if (allVariants && Array.isArray(allVariants)) {
      allVariants.forEach(variant => {
        const productId = variant.product_id;
        if (!variantsByProduct.has(productId)) {
          variantsByProduct.set(productId, []);
        }
        variantsByProduct.get(productId).push(variant);
      });
    }
    
    console.log("Variants grouped by product:", variantsByProduct.size);
    
    productsWithVariants.forEach(product => {
      const productVariants = variantsByProduct.get(product.id) || [];
      console.log(`Product "${product.name}" has ${productVariants.length} variants`);
      
      parents.push({
        id: product.id,
        type: 'parent',
        name: product.name,
        sku: product.sku,
        stock_quantity: null,
        low_stock_threshold: null,
        image_url: product.image_url,
        variants: productVariants.map(variant => ({
          id: variant.id,
          name: Object.entries(variant.attributes || {})
            .map(([key, value]) => `${key}: ${value}`)
            .join(', '),
          sku: variant.sku || product.sku,
          stock_quantity: variant.stock_quantity,
          low_stock_threshold: variant.low_stock_threshold,
          attributes: variant.attributes
        }))
      });
    });
    
    console.log("Total parent products created:", parents.length);
    console.log("First few parent products:", parents.slice(0, 3));
    console.log("=== END INVENTORY DEBUG ===");
    
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
      threshold: 0.4, // More tolerant for typos
      includeScore: true,
      minMatchCharLength: 1
    });
  }, [parentProducts, normalizeText]);

  // Filter and search logic with exact matching priority
  const { filteredParentProducts, hasExactMatch } = useMemo(() => {
    console.log("=== SEARCH DEBUG ===");
    console.log("Search term:", debouncedSearchTerm);
    console.log("Parent products available:", parentProducts.length);
    
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
        console.log("Exact matches found:", exactMatches.length);
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
        console.log("Fuzzy search results:", searchResults.length);
        console.log("Matched parent IDs:", Array.from(matchedParentIds));
        console.log("Filtered products:", filtered.length);
      }
    }
    
    // Apply stock filter
    if (stockFilter !== "all") {
      filtered = filtered.filter(parent => {
        if (parent.type === 'product') {
          const stockQty = parent.stock_quantity || 0;
          return stockFilter === "in_stock" ? stockQty > 0 : stockQty === 0;
        } else if (parent.type === 'parent') {
          // For parent products with variants, check if any variant matches the filter
          return parent.variants.some((variant: any) => {
            const stockQty = variant.stock_quantity || 0;
            return stockFilter === "in_stock" ? stockQty > 0 : stockQty === 0;
          });
        }
        return false;
      });
    }
    
    console.log("Final filtered products:", filtered.length);
    console.log("=== END SEARCH DEBUG ===");
    
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
                    <TableHead>Attributes</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedParentProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground text-lg">No inventory items found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedParentProducts.map((parent) => {
                      // For products without variants
                      if (parent.type === 'product') {
                        const status = parent.stock_quantity <= 0 
                          ? "Out of Stock" 
                          : parent.stock_quantity <= (parent.low_stock_threshold || 0)
                            ? "Low Stock" 
                            : "In Stock";

                        return (
                          <TableRow key={`product-${parent.id}`}>
                            <TableCell>
                              {parent.image_url ? (
                                <img 
                                  src={parent.image_url} 
                                  alt={parent.name}
                                  className="w-12 h-12 object-cover rounded cursor-pointer hover:scale-105 transition-transform duration-200"
                                  onClick={() => handleImageClick(parent.image_url)}
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-muted flex items-center justify-center rounded">
                                  <Archive className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{parent.name}</div>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-sm">{parent.sku || '-'}</span>
                            </TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>
                              <span className="font-medium">{parent.stock_quantity}</span>
                            </TableCell>
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
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // Add adjustment action here if needed
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      }

                      // For products with variants - show each variant as a separate row
                      return parent.variants.map((variant: any) => {
                        const status = variant.stock_quantity <= 0 
                          ? "Out of Stock" 
                          : variant.stock_quantity <= (variant.low_stock_threshold || 0)
                            ? "Low Stock" 
                            : "In Stock";

                        return (
                          <TableRow key={`variant-${variant.id}`}>
                            <TableCell>
                              {parent.image_url ? (
                                <img 
                                  src={parent.image_url} 
                                  alt={parent.name}
                                  className="w-12 h-12 object-cover rounded cursor-pointer hover:scale-105 transition-transform duration-200"
                                  onClick={() => handleImageClick(parent.image_url)}
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-muted flex items-center justify-center rounded">
                                  <Archive className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{parent.name}</div>
                              <div className="text-sm text-muted-foreground">
                                <Badge variant="outline" className="text-xs">Variant</Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-sm">{variant.sku || '-'}</span>
                            </TableCell>
                            <TableCell>
                              {variant.attributes && Object.keys(variant.attributes).length > 0 ? (
                                <div className="space-y-1">
                                  {Object.entries(variant.attributes).map(([key, value]) => (
                                    <div key={key} className="text-sm">
                                      <span className="font-medium capitalize">{key}:</span> {String(value)}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{variant.stock_quantity}</span>
                            </TableCell>
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
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // Add adjustment action here if needed
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      });
                    }).flat()
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